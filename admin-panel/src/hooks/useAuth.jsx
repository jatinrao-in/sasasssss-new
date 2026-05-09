import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';
import { resolveUserPermissions } from '../lib/accessControl';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
  // Prevent multiple simultaneous Firestore fetches
  const fetchingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        // Prevent duplicate fetches
        if (fetchingRef.current) return;
        
        if (!firebaseUser) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        fetchingRef.current = true;
        
        try {
          // Get App Settings for mainAdminUid to resolve permissions correctly
          const appDoc = await getDoc(doc(db, COLLECTIONS.settings, 'app'));
          const mainAdminUid = appDoc.data()?.mainAdminUid || null;

          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
          
          let userData;
          if (!userDoc.exists()) {
            console.log('Creating missing user profile...');
            userData = {
              name: firebaseUser.displayName || 'Admin',
              email: firebaseUser.email,
              role: 'admin',
              phone: '',
              whatsapp: '',
              designation: 'Administrator',
              status: 'active',
              permissions: [
                'dashboard', 'projects', 'enquiry', 'followups',
                'payments', 'outgoing_payments', 'rgp', 'salary',
                'tools', 'team', 'settings', 'whatsapp'
              ],
              fcmToken: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            await setDoc(doc(db, COLLECTIONS.users, firebaseUser.uid), userData);
          } else {
            userData = userDoc.data();
          }
            
          // Resolve permissions
          const { isMainAdmin, permissions, role, status } = resolveUserPermissions(userData, mainAdminUid);

          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            ...userData,
            role,
            status,
            permissions,
            isMainAdmin
          });
        } catch (error) {
          console.error('Auth error:', error);
          // Don't sign out on error, set basic fallback user data
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'admin',
            name: 'Admin',
            permissions: [
              'dashboard', 'projects', 'enquiry', 'followups',
              'payments', 'outgoing_payments', 'rgp', 'salary',
              'tools', 'team', 'settings', 'whatsapp'
            ]
          });
        } finally {
          fetchingRef.current = false;
          setLoading(false);
        }
      },
      (error) => {
        console.error('Auth state error:', error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []); // Empty deps — run once only

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      authError,
      login,
      logout,
      isAdmin: currentUser?.role === 'admin',
      isMember: currentUser?.role === 'member',
      isGhostAdmin: currentUser?.isGhost === true
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

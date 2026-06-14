import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';
import { resolveUserPermissions } from '../lib/accessControl';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [mainAdminUid, setMainAdminUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // 1. Reactively listen to settings/app for mainAdminUid
  useEffect(() => {
    if (!user) {
      setMainAdminUid(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.settings, 'app'),
      (snapshot) => {
        setMainAdminUid(snapshot.data()?.mainAdminUid || null);
      },
      (error) => {
        console.error('useAuth: Settings subscription failed:', error);
        setMainAdminUid(null);
      }
    );

    return unsubscribe;
  }, [user]);

  // 2. Listen to Auth state change and user profile
  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        unsubscribeProfile();

        if (!firebaseUser) {
          setUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        setLoading(true);

        // Fetch / Create profile if missing, then listen
        try {
          const userRef = doc(db, COLLECTIONS.users, firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            console.log('Creating missing user profile for admin/owner...');
            const newProfile = {
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
            await setDoc(userRef, newProfile);
          }
        } catch (error) {
          console.error('Error verifying/creating user profile:', error);
        }

        // Now setup onSnapshot listener to reactively update permissions, status, role
        unsubscribeProfile = onSnapshot(
          doc(db, COLLECTIONS.users, firebaseUser.uid),
          (snapshot) => {
            if (snapshot.exists()) {
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...snapshot.data()
              });
            } else {
              // Fallback if deleted or not resolved
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: 'member',
                name: firebaseUser.displayName || firebaseUser.email || 'Unknown User',
                permissions: []
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error('useAuth: User profile subscription failed:', error);
            setAuthError(error.message);
            setLoading(false);
          }
        );
      },
      (error) => {
        console.error('useAuth: Auth state changed error:', error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  // 3. Resolve permissions on the fly using useMemo
  const currentUser = useMemo(() => {
    if (!user) return null;

    const profile = { ...(userData || {}), mainAdminUid };
    const { isMainAdmin, permissions, role, status } = resolveUserPermissions(profile, mainAdminUid);

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      ...profile,
      role,
      status,
      permissions,
      isMainAdmin
    };
  }, [user, userData, mainAdminUid]);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, COLLECTIONS.users, credential.user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return {
        uid: credential.user.uid,
        email: credential.user.email,
        ...userSnap.data()
      };
    }
    return {
      uid: credential.user.uid,
      email: credential.user.email,
      role: 'member'
    };
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const changePassword = async (newPassword) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      currentUser,
      loading,
      authError,
      login,
      logout,
      changePassword,
      mainAdminUid,
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

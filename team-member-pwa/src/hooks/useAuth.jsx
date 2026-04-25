import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { redirectToAdminPanel } from '../lib/adminPanel';
import { COLLECTIONS } from '../lib/firestore-helpers';

const AuthContext = createContext(null);

async function fetchUserProfile(uid, email) {
  const userDoc = await getDoc(doc(db, COLLECTIONS.users, uid));

  if (!userDoc.exists()) {
    return {
      uid,
      email,
      role: 'member',
      name: email || 'Unknown user',
      permissions: [],
    };
  }

  return { uid, email, ...userDoc.data() };
}

const buildCurrentUser = (firebaseUser, profile) => {
  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    ...profile,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribeProfile();

      if (!firebaseUser) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setLoading(true);

      unsubscribeProfile = onSnapshot(
        doc(db, COLLECTIONS.users, firebaseUser.uid),
        (snapshot) => {
          const profile = snapshot.exists()
            ? { uid: firebaseUser.uid, email: firebaseUser.email, ...snapshot.data() }
            : {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'member',
              name: firebaseUser.email || 'Unknown user',
              permissions: [],
            };

          if (profile.role === 'admin') {
            setUserData(profile);
            setLoading(false);
            redirectToAdminPanel();
            return;
          }

          setUserData(profile);
          setLoading(false);
        },
        async (error) => {
          console.error('Error listening to user profile:', error);

          try {
            const fallbackProfile = await fetchUserProfile(firebaseUser.uid, firebaseUser.email);
            setUserData(fallbackProfile);
          } catch (fallbackError) {
            console.error('Error fetching fallback user data:', fallbackError);
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'member',
              name: firebaseUser.email || 'Unknown user',
              permissions: [],
            });
          } finally {
            setLoading(false);
          }
        },
      );
    });

    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(credential.user.uid, credential.user.email);
    setUserData(profile);
    return profile;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  };

  const changePassword = async (newPassword) => {
    if (user) {
      await updatePassword(user, newPassword);
    }
  };

  const currentUser = useMemo(
    () => buildCurrentUser(user, userData),
    [user, userData],
  );

  const value = {
    user,
    userData,
    currentUser,
    loading,
    login,
    logout,
    changePassword,
    isAdmin: currentUser?.role === 'admin',
    isMember: currentUser?.role === 'member',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

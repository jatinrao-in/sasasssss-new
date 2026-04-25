import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';
import {
  getAllPageKeys,
  normalizeRole,
  resolveUserPermissions,
} from '../lib/accessControl';

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

  const {
    isMainAdmin,
    permissions,
    role,
    status,
  } = resolveUserPermissions(profile, profile?.mainAdminUid);

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    ...profile,
    role,
    status,
    permissions,
    isMainAdmin,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [mainAdminUid, setMainAdminUid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onSnapshot(
    doc(db, COLLECTIONS.settings, 'app'),
    (snapshot) => {
      setMainAdminUid(snapshot.data()?.mainAdminUid || null);
    },
    (error) => {
      console.error('Error listening to app settings:', error);
      setMainAdminUid(null);
    },
  ), []);

  useEffect(() => {
    if (mainAdminUid || !userData?.uid || normalizeRole(userData.role) !== 'admin') {
      return;
    }

    let cancelled = false;

    const resolveFallbackMainAdmin = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, COLLECTIONS.users));
        const admins = usersSnapshot.docs
          .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
          .filter((profile) => normalizeRole(profile.role) === 'admin')
          .sort((firstAdmin, secondAdmin) => {
            const firstCreatedAt = firstAdmin.createdAt?.toDate?.()?.getTime?.() ?? 0;
            const secondCreatedAt = secondAdmin.createdAt?.toDate?.()?.getTime?.() ?? 0;
            return firstCreatedAt - secondCreatedAt;
          });

        const fallbackAdmin = admins[0]?.id || null;

        if (!fallbackAdmin || cancelled) {
          return;
        }

        setMainAdminUid(fallbackAdmin);

        if (fallbackAdmin === userData.uid) {
          await setDoc(
            doc(db, COLLECTIONS.settings, 'app'),
            { mainAdminUid: fallbackAdmin },
            { merge: true },
          );
        }
      } catch (error) {
        console.error('Error resolving fallback main admin:', error);
      }
    };

    resolveFallbackMainAdmin();

    return () => {
      cancelled = true;
    };
  }, [mainAdminUid, userData?.role, userData?.uid]);

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
            ? {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              mainAdminUid,
              ...snapshot.data(),
            }
            : {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              mainAdminUid,
              role: 'member',
              name: firebaseUser.email || 'Unknown user',
              permissions: getAllPageKeys('member'),
            };

          setUserData(profile);
          setLoading(false);
        },
        async (error) => {
          console.error('Error listening to user profile:', error);

          try {
            const fallbackProfile = await fetchUserProfile(firebaseUser.uid, firebaseUser.email);
            setUserData({ ...fallbackProfile, mainAdminUid });
          } catch (fallbackError) {
            console.error('Error fetching fallback user data:', fallbackError);
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              mainAdminUid,
              role: 'member',
              name: firebaseUser.email || 'Unknown user',
              permissions: getAllPageKeys('member'),
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
  }, [mainAdminUid]);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = {
      ...(await fetchUserProfile(credential.user.uid, credential.user.email)),
      mainAdminUid,
    };

    setUserData(profile);
    return buildCurrentUser(credential.user, profile);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  };

  const currentUser = useMemo(
    () => buildCurrentUser(user, { ...(userData || {}), mainAdminUid }),
    [mainAdminUid, user, userData],
  );

  const value = {
    user,
    userData,
    currentUser,
    loading,
    login,
    logout,
    mainAdminUid,
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

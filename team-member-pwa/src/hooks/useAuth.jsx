import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { redirectToAdminPanel } from '../lib/adminPanel';
import { COLLECTIONS } from '../lib/firestore-helpers';

const AuthContext = createContext(null);

async function fetchUserProfile(uid, email) {
 const userDoc = await getDoc(doc(db, COLLECTIONS.users, uid));

 if (!userDoc.exists()) {
 return { uid, email, role: 'member', name: email };
 }

 return { uid, ...userDoc.data() };
}

export function AuthProvider({ children }) {
 const [user, setUser] = useState(null);
 const [userData, setUserData] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
 if (!firebaseUser) {
 setUser(null);
 setUserData(null);
 setLoading(false);
 return;
 }

 setUser(firebaseUser);

 try {
 const profile = await fetchUserProfile(firebaseUser.uid, firebaseUser.email);

 if (profile?.role === 'admin') {
 setUserData(null);
 redirectToAdminPanel();
 return;
 }

 setUserData(profile);
 } catch (error) {
 console.error('Error fetching user data:', error);
 setUserData({
 uid: firebaseUser.uid,
 email: firebaseUser.email,
 role: 'member',
 name: firebaseUser.email,
 });
 } finally {
 setLoading(false);
 }
 });

 return () => unsubscribe();
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

 const value = {
 user,
 userData,
 loading,
 login,
 logout,
 changePassword,
 isAdmin: userData?.role === 'admin',
 isMember: userData?.role === 'member',
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

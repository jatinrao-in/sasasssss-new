import { useEffect, useState } from 'react';
import {
 collection,
 doc,
 getDocs,
 onSnapshot,
 orderBy,
 query,
 updateDoc,
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useTeam() {
 const [members, setMembers] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const teamQuery = query(collection(db, COLLECTIONS.users), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 teamQuery,
 (snapshot) => {
 setMembers(snapshot.docs.map((memberDoc) => ({ id: memberDoc.id, ...memberDoc.data() })));
 setLoading(false);
 },
 (error) => {
 console.error('Team listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, []);

 const updateMember = async (uid, updates) => updateDoc(doc(db, COLLECTIONS.users, uid), updates);

 const toggleStatus = async (uid, currentStatus) => updateDoc(doc(db, COLLECTIONS.users, uid), {
 status: currentStatus === 'active' ? 'inactive' : 'active',
 });

 const getActiveMembers = () => members.filter((member) => member.role === 'member' && member.status === 'active');

 const fetchActiveMembers = async () => {
 const teamSnapshot = await getDocs(
 query(
 collection(db, COLLECTIONS.users),
 where('role', '==', 'member'),
 where('status', '==', 'active'),
 ),
 );

 return teamSnapshot.docs.map((memberDoc) => ({ id: memberDoc.id, ...memberDoc.data() }));
 };

 return { members, loading, updateMember, toggleStatus, getActiveMembers, fetchActiveMembers };
}

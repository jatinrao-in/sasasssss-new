import { useEffect, useState } from 'react';
import {
 collection,
 deleteDoc,
 doc,
 getDocs,
 onSnapshot,
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
 const teamQuery = query(
 collection(db, COLLECTIONS.users),
 where('role', '==', 'member'),
 );

 const unsubscribe = onSnapshot(
 teamQuery,
 (snapshot) => {
 const nextMembers = snapshot.docs
 .map((memberDoc) => ({ id: memberDoc.id, ...memberDoc.data() }))
 .sort((firstMember, secondMember) => {
 const firstCreatedAt = firstMember.createdAt?.toDate?.() ?? new Date(0);
 const secondCreatedAt = secondMember.createdAt?.toDate?.() ?? new Date(0);
 return secondCreatedAt - firstCreatedAt;
 });

 setMembers(nextMembers);
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

 const deleteMember = async (uid) => deleteDoc(doc(db, COLLECTIONS.users, uid));

 const toggleStatus = async (uid, currentStatus) => updateDoc(doc(db, COLLECTIONS.users, uid), {
 status: currentStatus === 'active' ? 'inactive' : 'active',
 });

 const getActiveMembers = () => members.filter((member) => member.status === 'active');

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

 return { members, loading, updateMember, deleteMember, toggleStatus, getActiveMembers, fetchActiveMembers };
}

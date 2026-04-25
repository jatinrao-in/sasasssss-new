import { useEffect, useState } from 'react';
import {
 collection,
 getDocs,
 onSnapshot,
 query,
 serverTimestamp,
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import { COLLECTIONS, deleteDocument, updateDocument } from '../lib/firestore-helpers';
import { normalizeRole } from '../lib/accessControl';

export function useTeam(options = {}) {
 const { includeAdmins = false } = options;
 const [members, setMembers] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 const unsubscribe = onSnapshot(
 collection(db, COLLECTIONS.users),
 (snapshot) => {
 const nextMembers = snapshot.docs
 .map((memberDoc) => ({ id: memberDoc.id, ...memberDoc.data() }))
 .filter((member) => includeAdmins
   ? ['admin', 'member'].includes(normalizeRole(member.role))
   : normalizeRole(member.role) === 'member')
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
 }, [includeAdmins]);

 const updateMember = async (uid, updates) => {
  await updateDocument(db, COLLECTIONS.users, uid, {
   ...updates,
   updatedAt: serverTimestamp(),
  }, 'update team member');
  await log('member_updated', { memberUid: uid, updates });
 };

 const deleteMember = async (uid) => {
  await deleteDocument(db, COLLECTIONS.users, uid, 'delete team member');
  await log('member_deleted', { memberUid: uid });
 };

 const toggleStatus = async (uid, currentStatus) => {
  const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateDocument(db, COLLECTIONS.users, uid, {
   status: nextStatus,
   updatedAt: serverTimestamp(),
  }, 'update team member status');
  await log('member_status_changed', { memberUid: uid, status: nextStatus });
 };

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

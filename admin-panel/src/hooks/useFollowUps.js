import { useEffect, useState } from 'react';
import {
 collection,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import {
 COLLECTIONS,
 addDocument,
 calculateOverdueDays,
 deleteDocument,
 deriveOpenItemStatus,
 updateDocument,
} from '../lib/firestore-helpers';

export function useFollowUps(filterByUser = null) {
 const [followUps, setFollowUps] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 const followupQuery = filterByUser
 ? query(
 collection(db, COLLECTIONS.followups),
 where('assignedTo', '==', filterByUser),
 orderBy('createdAt', 'desc'),
 )
 : query(collection(db, COLLECTIONS.followups), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 followupQuery,
 (snapshot) => {
 const nextFollowUps = snapshot.docs.map((followupDoc) => {
 const followup = { id: followupDoc.id, ...followupDoc.data() };
 followup.overdueDays = followup.status === 'closed' ? 0 : calculateOverdueDays(followup.targetDate);
 followup.status = deriveOpenItemStatus(followup);
 return followup;
 });

 setFollowUps(nextFollowUps);
 setLoading(false);
 },
 (error) => {
 console.error('Follow-ups listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, [filterByUser]);

 const addFollowUp = async (followupData) => {
  const followUpRef = await addDocument(db, COLLECTIONS.followups, {
   ...followupData,
   assignedDate: serverTimestamp(),
   createdAt: serverTimestamp(),
   status: 'open',
  }, 'save follow-up');

  await log('followup_created', {
   followupId: followUpRef.id,
   assignedTo: followupData.assignedTo || '',
   title: followupData.title || followupData.customerName || '',
  });

  return followUpRef;
 };

 const updateFollowUp = async (id, updates) => {
  await updateDocument(db, COLLECTIONS.followups, id, updates, 'update follow-up');
  await log('followup_updated', { followupId: id, updates });
 };

 const deleteFollowUp = async (id) => {
  await deleteDocument(db, COLLECTIONS.followups, id, 'delete follow-up');
  await log('followup_deleted', { followupId: id });
 };

 const markClosed = async (id) => {
  await updateDocument(db, COLLECTIONS.followups, id, {
   status: 'closed',
   updatedAt: serverTimestamp(),
  }, 'close follow-up');
  await log('followup_closed', { followupId: id });
 };

 return { followUps, loading, addFollowUp, updateFollowUp, deleteFollowUp, markClosed };
}

// Lowercase alias used by page components
export function useFollowups(filterByUser = null) {
 const { followUps, loading, addFollowUp, updateFollowUp, deleteFollowUp, markClosed } = useFollowUps(filterByUser);
 return {
 followups: followUps,
 loading,
 addFollowup: addFollowUp,
 updateFollowup: updateFollowUp,
 deleteFollowup: deleteFollowUp,
 markClosed,
 };
}

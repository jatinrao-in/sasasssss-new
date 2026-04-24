import { useEffect, useState } from 'react';
import {
 addDoc,
 collection,
 doc,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
 updateDoc,
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
 COLLECTIONS,
 calculateOverdueDays,
 deriveOpenItemStatus,
} from '../lib/firestore-helpers';

export function useFollowUps(filterByUser = null) {
 const [followUps, setFollowUps] = useState([]);
 const [loading, setLoading] = useState(true);

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

 const addFollowUp = async (followupData) => addDoc(collection(db, COLLECTIONS.followups), {
 ...followupData,
 assignedDate: serverTimestamp(),
 createdAt: serverTimestamp(),
 status: 'open',
 });

 const updateFollowUp = async (id, updates) => updateDoc(doc(db, COLLECTIONS.followups, id), updates);

 const markClosed = async (id) => updateDoc(doc(db, COLLECTIONS.followups, id), {
 status: 'closed',
 updatedAt: serverTimestamp(),
 });

 return { followUps, loading, addFollowUp, updateFollowUp, markClosed };
}

// Lowercase alias used by page components
export function useFollowups(filterByUser = null) {
 const { followUps, loading, addFollowUp, updateFollowUp, markClosed } = useFollowUps(filterByUser);
 return {
 followups: followUps,
 loading,
 addFollowup: addFollowUp,
 updateFollowup: updateFollowUp,
 markClosed,
 };
}

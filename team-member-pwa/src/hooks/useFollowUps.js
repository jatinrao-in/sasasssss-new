import { useEffect, useMemo, useState } from 'react';
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
import { useRealtime } from '../context/RealtimeContext';
import {
  COLLECTIONS,
  calculateOverdueDays,
  deriveOpenItemStatus,
} from '../lib/firestore-helpers';

export function useFollowUps(filterByUser = null) {
  const realtime = useRealtime();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  const realtimeFollowUps = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const source = filterByUser
      ? realtime.followUps.filter((item) => item.assignedTo === filterByUser)
      : realtime.followUps;

    return source.map((followUp) => {
      const normalized = { ...followUp };
      normalized.overdueDays = normalized.status === 'closed' ? 0 : calculateOverdueDays(normalized.targetDate);
      normalized.status = deriveOpenItemStatus(normalized);
      return normalized;
    });
  }, [realtime, filterByUser]);

  useEffect(() => {
    if (realtimeFollowUps) {
      setFollowUps(realtimeFollowUps);
      setLoading(Boolean(realtime?.loading?.followUps));
      return undefined;
    }

    if (!filterByUser) {
      setFollowUps([]);
      setLoading(false);
      return undefined;
    }

    const followupQuery = query(
      collection(db, COLLECTIONS.followups),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

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
  }, [filterByUser, realtimeFollowUps, realtime?.loading?.followUps]);

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

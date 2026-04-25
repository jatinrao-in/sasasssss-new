import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';
import {
  logError,
  logFetch,
  logInfo,
  logSkip,
  logSnapshot,
} from '../lib/firestoreDebug';
import {
  COLLECTIONS,
  addDocument,
  calculateOverdueDays,
  deriveOpenItemStatus,
  updateDocument,
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
      logInfo('useFollowUps', 'Using realtime follow-ups:', realtimeFollowUps.length);
      setFollowUps(realtimeFollowUps);
      setLoading(Boolean(realtime?.loading?.followUps));
      return undefined;
    }

    if (!filterByUser) {
      logSkip('useFollowUps');
      setFollowUps([]);
      setLoading(false);
      return undefined;
    }

    logFetch('useFollowUps', filterByUser);

    const followupQuery = query(
      collection(db, COLLECTIONS.followups),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      followupQuery,
      (snapshot) => {
        logSnapshot('useFollowUps', snapshot);
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
        logError('useFollowUps', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtimeFollowUps, realtime?.loading?.followUps]);

  const addFollowUp = async (followupData) => addDocument(db, COLLECTIONS.followups, {
    ...followupData,
    assignedDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    status: 'open',
  }, 'save follow-up');

  const updateFollowUp = async (id, updates) => updateDocument(
    db,
    COLLECTIONS.followups,
    id,
    updates,
    'update follow-up',
  );

  const markClosed = async (id) => updateDocument(db, COLLECTIONS.followups, id, {
    status: 'closed',
    updatedAt: serverTimestamp(),
  }, 'close follow-up');

  return { followUps, loading, addFollowUp, updateFollowUp, markClosed };
}

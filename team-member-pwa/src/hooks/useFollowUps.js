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
  toDateValue,
  updateDocument,
} from '../lib/firestore-helpers';

function normalizeFollowupStatus(value) {
  return String(value || 'open')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function isSameDay(firstDate, secondDate) {
  return firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate();
}

function normalizeFollowUp(followUp) {
  const normalized = { ...followUp };
  normalized.companyName = normalized.companyName || normalized.customerName || '';
  normalized.contactPerson = normalized.contactPerson || '';
  normalized.contactPhone = normalized.contactPhone || normalized.phone || '';
  normalized.description = normalized.description || normalized.notes || '';
  normalized.status = normalizeFollowupStatus(normalized.status);
  normalized.isClosed = normalized.status === 'closed';
  normalized.dueDate = normalized.nextFollowupDate || normalized.targetDate;
  normalized.overdueDays = normalized.isClosed ? 0 : calculateOverdueDays(normalized.dueDate);
  normalized.rescheduleCount = Number(normalized.rescheduleCount || 0);

  const dueDateValue = toDateValue(normalized.dueDate);
  const today = new Date();
  normalized.isDueToday = normalized.isClosed
    ? false
    : Boolean(dueDateValue) && isSameDay(dueDateValue, today);

  normalized.statusCategory = normalized.isClosed
    ? 'closed'
    : normalized.overdueDays > 0
      ? 'overdue'
      : normalized.isDueToday
        ? 'due_today'
        : 'open';

  return normalized;
}

export function useFollowUps(filterByUser = null) {
  const realtime = useRealtime();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const realtimeFollowUps = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const source = filterByUser
      ? realtime.followUps.filter((item) => item.assignedTo === filterByUser)
      : realtime.followUps;

    return source.map(normalizeFollowUp);
  }, [realtime, filterByUser]);

  useEffect(() => {
    if (realtimeFollowUps) {
      logInfo('useFollowUps', 'Using realtime follow-ups:', realtimeFollowUps.length);
      setFollowUps(realtimeFollowUps);
      setLoading(Boolean(realtime?.loading?.followUps));
      setError(null);
      return undefined;
    }

    if (!filterByUser) {
      logSkip('useFollowUps');
      setFollowUps([]);
      setLoading(false);
      setError(null);
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
        const nextFollowUps = snapshot.docs.map((followupDoc) => normalizeFollowUp({
          id: followupDoc.id,
          ...followupDoc.data(),
        }));

        setFollowUps(nextFollowUps);
        setLoading(false);
        setError(null);
      },
      (error) => {
        logError('useFollowUps', error);
        setError(error);
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
    rescheduleCount: Number(followupData.rescheduleCount || 0),
    outcome: followupData.outcome ?? null,
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

  return {
    followUps,
    loading,
    error,
    addFollowUp,
    updateFollowUp,
    markClosed,
  };
}

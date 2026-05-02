import { useAuth } from './useAuth';
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
  calculateOverdueDays,
  updateDocument,
} from '../lib/firestore-helpers';

function normalizeRgpStatus(value) {
  return String(value || 'open')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizeRgpType(value) {
  return String(value || 'rgp')
    .trim()
    .toLowerCase();
}

function statusToStep(status) {
  switch (status) {
    case 'closed':
      return 3;
    case 'return_initiated':
      return 2;
    case 'in_progress':
      return 1;
    default:
      return 0;
  }
}

function normalizeRgpEntry(entry) {
  const normalized = { ...entry };
  normalized.status = normalizeRgpStatus(normalized.status);
  normalized.type = normalizeRgpType(normalized.type);
  normalized.isClosed = normalized.status === 'closed';
  normalized.referenceDate = normalized.date || normalized.sentDate || normalized.createdAt;
  normalized.openDays = normalized.isClosed ? 0 : calculateOverdueDays(normalized.referenceDate);
  normalized.statusCategory = normalized.isClosed ? 'closed' : 'open';
  normalized.docStep = Math.max(
    Number.isFinite(Number(normalized.docStep)) ? Number(normalized.docStep) : 0,
    statusToStep(normalized.status),
  );
  return normalized;
}

export function useRgp() {
  const { currentUser } = useAuth();
  const realtime = useRealtime();
  const [rgp, setRgp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (realtime) {
      const source = currentUser?.uid
        ? realtime.rgp.filter((item) => item.assignedTo === currentUser?.uid)
        : realtime.rgp;
      logInfo('useRgp', 'Using realtime RGP items:', source.length);
      setRgp(source.map(normalizeRgpEntry));
      setLoading(Boolean(realtime.loading?.rgp));
      setError(null);
      return undefined;
    }

    if (!currentUser?.uid) {
      logSkip('useRgp');
      setRgp([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    const ref = query(
      collection(db, COLLECTIONS.rgp),
      where('assignedTo', '==', currentUser?.uid),
      orderBy('createdAt', 'desc'),
    );

    logFetch('useRgp', currentUser?.uid);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        logSnapshot('useRgp', snapshot);
        setRgp(snapshot.docs.map((itemDoc) => normalizeRgpEntry({
          id: itemDoc.id,
          ...itemDoc.data(),
        })));
        setLoading(false);
        setError(null);
      },
      (error) => {
        logError('useRgp', error);
        setError(error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, realtime]);

  const updateRgp = async (id, updates) => updateDocument(
    db,
    COLLECTIONS.rgp,
    id,
    {
      ...updates,
      updatedAt: updates.updatedAt || serverTimestamp(),
    },
    'update rgp',
  );

  return {
    rgp,
    loading,
    error,
    updateRgp,
  };
}

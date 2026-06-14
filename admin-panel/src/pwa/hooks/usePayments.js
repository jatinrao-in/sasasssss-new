import { useAuth } from './useAuth';
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
  updateDocument,
} from '../lib/firestore-helpers';

function normalizePaymentStatus(value) {
  return String(value || 'pending')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizePayment(payment) {
  const normalized = { ...payment };
  normalized.paymentStatus = normalizePaymentStatus(normalized.paymentStatus);
  normalized.partialPayments = Array.isArray(normalized.partialPayments) ? normalized.partialPayments : [];
  normalized.totalPaid = Number(normalized.totalPaid || normalized.finalAmount || 0);
  normalized.netPending = Number.isFinite(Number(normalized.netPending))
    ? Number(normalized.netPending)
    : Math.max(0, Number(normalized.amount || 0) - normalized.totalPaid);
  normalized.netPendingAmount = Number.isFinite(Number(normalized.netPendingAmount))
    ? Number(normalized.netPendingAmount)
    : normalized.netPending;
  normalized.overdueDays = normalized.paymentStatus === 'received'
    ? 0
    : calculateOverdueDays(normalized.targetPaymentDate);
  return normalized;
}

export function usePayments() {
  const { currentUser } = useAuth();
  const realtime = useRealtime();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const realtimePayments = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const source = currentUser?.uid
      ? realtime.payments.filter((item) => item.assignedTo === currentUser?.uid)
      : realtime.payments;

    return source.map(normalizePayment);
  }, [realtime, currentUser?.uid]);

  useEffect(() => {
    if (realtimePayments) {
      logInfo('usePayments', 'Using realtime payments:', realtimePayments.length);
      setPayments(realtimePayments);
      setLoading(Boolean(realtime?.loading?.payments));
      return undefined;
    }

    if (!currentUser?.uid) {
      logSkip('usePayments');
      setPayments([]);
      setLoading(false);
      return undefined;
    }

    logFetch('usePayments', currentUser?.uid);

    const paymentQuery = query(
      collection(db, COLLECTIONS.payments),
      where('assignedTo', '==', currentUser?.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      paymentQuery,
      (snapshot) => {
        logSnapshot('usePayments', snapshot);
        const nextPayments = snapshot.docs.map((paymentDoc) => normalizePayment({
          id: paymentDoc.id,
          ...paymentDoc.data(),
        }));

        setPayments(nextPayments);
        setLoading(false);
      },
      (error) => {
        logError('usePayments', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, realtimePayments, realtime?.loading?.payments]);

  const addPayment = async (paymentData) => addDocument(db, COLLECTIONS.payments, {
    ...paymentData,
    createdAt: serverTimestamp(),
    paymentStatus: 'pending',
  }, 'save payment');

  const updatePayment = async (id, updates) => updateDocument(
    db,
    COLLECTIONS.payments,
    id,
    updates,
    'update payment',
  );

  const updateStatus = async (id, statusOrUpdates, remarks = '') => {
    const updates = typeof statusOrUpdates === 'object' && statusOrUpdates !== null
      ? statusOrUpdates
      : {
        paymentStatus: statusOrUpdates,
        remarks,
        updatedAt: serverTimestamp(),
      };

    return updateDocument(db, COLLECTIONS.payments, id, updates, 'update payment status');
  };

  return { payments, loading, addPayment, updatePayment, updateStatus };
}

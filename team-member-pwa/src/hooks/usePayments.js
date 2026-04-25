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

export function usePayments(filterByUser = null) {
  const realtime = useRealtime();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const realtimePayments = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const source = filterByUser
      ? realtime.payments.filter((item) => item.assignedTo === filterByUser)
      : realtime.payments;

    return source.map((payment) => {
      const normalized = { ...payment };
      normalized.overdueDays = normalized.paymentStatus === 'received'
        ? 0
        : calculateOverdueDays(normalized.targetPaymentDate);
      return normalized;
    });
  }, [realtime, filterByUser]);

  useEffect(() => {
    if (realtimePayments) {
      logInfo('usePayments', 'Using realtime payments:', realtimePayments.length);
      setPayments(realtimePayments);
      setLoading(Boolean(realtime?.loading?.payments));
      return undefined;
    }

    if (!filterByUser) {
      logSkip('usePayments');
      setPayments([]);
      setLoading(false);
      return undefined;
    }

    logFetch('usePayments', filterByUser);

    const paymentQuery = query(
      collection(db, COLLECTIONS.payments),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      paymentQuery,
      (snapshot) => {
        logSnapshot('usePayments', snapshot);
        const nextPayments = snapshot.docs.map((paymentDoc) => {
          const payment = { id: paymentDoc.id, ...paymentDoc.data() };
          payment.overdueDays = payment.paymentStatus === 'received'
            ? 0
            : calculateOverdueDays(payment.targetPaymentDate);
          return payment;
        });

        setPayments(nextPayments);
        setLoading(false);
      },
      (error) => {
        logError('usePayments', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtimePayments, realtime?.loading?.payments]);

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

  const updateStatus = async (id, status, remarks = '') => updateDocument(db, COLLECTIONS.payments, id, {
    paymentStatus: status,
    remarks,
    updatedAt: serverTimestamp(),
  }, 'update payment status');

  return { payments, loading, addPayment, updatePayment, updateStatus };
}

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
import { COLLECTIONS, calculateOverdueDays } from '../lib/firestore-helpers';

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
      setPayments(realtimePayments);
      setLoading(Boolean(realtime?.loading?.payments));
      return undefined;
    }

    if (!filterByUser) {
      setPayments([]);
      setLoading(false);
      return undefined;
    }

    const paymentQuery = query(
      collection(db, COLLECTIONS.payments),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      paymentQuery,
      (snapshot) => {
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
        console.error('Payments listener error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtimePayments, realtime?.loading?.payments]);

  const addPayment = async (paymentData) => addDoc(collection(db, COLLECTIONS.payments), {
    ...paymentData,
    createdAt: serverTimestamp(),
    paymentStatus: 'pending',
  });

  const updatePayment = async (id, updates) => updateDoc(doc(db, COLLECTIONS.payments, id), updates);

  const updateStatus = async (id, status, remarks = '') => updateDoc(doc(db, COLLECTIONS.payments, id), {
    paymentStatus: status,
    remarks,
    updatedAt: serverTimestamp(),
  });

  return { payments, loading, addPayment, updatePayment, updateStatus };
}

import { useEffect, useState } from 'react';
import {
 addDoc,
 collection,
 deleteDoc,
 doc,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
 updateDoc,
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import { COLLECTIONS, calculateOverdueDays } from '../lib/firestore-helpers';

export function usePayments(filterByUser = null) {
 const [payments, setPayments] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 const paymentQuery = filterByUser
 ? query(
 collection(db, COLLECTIONS.payments),
 where('assignedTo', '==', filterByUser),
 orderBy('createdAt', 'desc'),
 )
 : query(collection(db, COLLECTIONS.payments), orderBy('createdAt', 'desc'));

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
 }, [filterByUser]);

 const addPayment = async (paymentData) => {
  const paymentRef = await addDoc(collection(db, COLLECTIONS.payments), {
   ...paymentData,
   createdAt: serverTimestamp(),
   paymentStatus: 'pending',
  });

  await log('payment_created', {
   paymentId: paymentRef.id,
   assignedTo: paymentData.assignedTo || '',
   customerName: paymentData.customerName || '',
   amount: Number(paymentData.amount || 0),
  });

  return paymentRef;
 };

 const updatePayment = async (id, updates) => {
  await updateDoc(doc(db, COLLECTIONS.payments, id), updates);
  await log('payment_updated', { paymentId: id, updates });
 };

 const deletePayment = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.payments, id));
  await log('payment_deleted', { paymentId: id });
 };

 const updateStatus = async (id, status, remarks = '') => {
  await updateDoc(doc(db, COLLECTIONS.payments, id), {
   paymentStatus: status,
   remarks,
   updatedAt: serverTimestamp(),
  });
  await log('payment_status_updated', { paymentId: id, status, remarks });
 };

 return { payments, loading, addPayment, updatePayment, deletePayment, updateStatus };
}

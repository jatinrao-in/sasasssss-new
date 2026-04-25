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
import { COLLECTIONS, calculateOverdueDays } from '../lib/firestore-helpers';

export function usePayments(filterByUser = null) {
 const [payments, setPayments] = useState([]);
 const [loading, setLoading] = useState(true);

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

 const addPayment = async (paymentData) => addDoc(collection(db, COLLECTIONS.payments), {
 ...paymentData,
 createdAt: serverTimestamp(),
 paymentStatus: 'pending',
 });

 const updatePayment = async (id, updates) => updateDoc(doc(db, COLLECTIONS.payments, id), updates);

 const deletePayment = async (id) => deleteDoc(doc(db, COLLECTIONS.payments, id));

 const updateStatus = async (id, status, remarks = '') => updateDoc(doc(db, COLLECTIONS.payments, id), {
 paymentStatus: status,
 remarks,
 updatedAt: serverTimestamp(),
 });

 return { payments, loading, addPayment, updatePayment, deletePayment, updateStatus };
}

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
 deleteDoc,
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import { COLLECTIONS, calculateOverdueDays } from '../lib/firestore-helpers';

export function useOutgoingPayments(filterByUser = null) {
 const [outgoingPayments, setOutgoingPayments] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 const q = filterByUser
 ? query(
 collection(db, COLLECTIONS.outgoing_payments),
 where('assignedTo', '==', filterByUser),
 orderBy('createdAt', 'desc'),
 )
 : query(collection(db, COLLECTIONS.outgoing_payments), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 q,
 (snapshot) => {
 const items = snapshot.docs.map((d) => {
 const data = { id: d.id, ...d.data() };
 data.netPendingAmount = (data.amount || 0) - (data.paidAmount || 0);
 data.overdueDays = data.paymentStatus === 'paid'
 ? 0
 : calculateOverdueDays(data.paymentDueDate);
 return data;
 });
 setOutgoingPayments(items);
 setLoading(false);
 },
 (error) => {
 console.error('Outgoing payments listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, [filterByUser]);

 const addOutgoingPayment = async (data) => {
 const netPendingAmount = (Number(data.amount) || 0) - (Number(data.paidAmount) || 0);
 let paymentStatus = 'pending';
 if (netPendingAmount <= 0 && (Number(data.amount) || 0) > 0) paymentStatus = 'paid';
 else if ((Number(data.paidAmount) || 0) > 0) paymentStatus = 'partial';

 const paymentRef = await addDoc(collection(db, COLLECTIONS.outgoing_payments), {
 ...data,
 netPendingAmount,
 paymentStatus,
 createdAt: serverTimestamp(),
 });
 await log('outgoing_payment_created', {
  paymentId: paymentRef.id,
  vendorName: data.vendorName || '',
  amount: Number(data.amount || 0),
 });
 return paymentRef;
 };

 const updateOutgoingPayment = async (id, updates) => {
 const netPendingAmount = (Number(updates.amount) || 0) - (Number(updates.paidAmount) || 0);
 let paymentStatus = updates.paymentStatus || 'pending';
 if (netPendingAmount <= 0 && (Number(updates.amount) || 0) > 0) paymentStatus = 'paid';
 else if ((Number(updates.paidAmount) || 0) > 0) paymentStatus = 'partial';

 await updateDoc(doc(db, COLLECTIONS.outgoing_payments, id), {
 ...updates,
 netPendingAmount,
 paymentStatus,
 updatedAt: serverTimestamp(),
 });
 await log('outgoing_payment_updated', { paymentId: id, updates });
 };

 const deleteOutgoingPayment = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.outgoing_payments, id));
  await log('outgoing_payment_deleted', { paymentId: id });
 };

 return { outgoingPayments, loading, addOutgoingPayment, updateOutgoingPayment, deleteOutgoingPayment };
}

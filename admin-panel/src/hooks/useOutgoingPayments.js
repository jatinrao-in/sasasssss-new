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
import useAuditLog from './useAuditLog';
import {
 COLLECTIONS,
 addDocument,
 calculateOverdueDays,
 deleteDocument,
 updateDocument,
} from '../lib/firestore-helpers';

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

 const paymentRef = await addDocument(db, COLLECTIONS.outgoing_payments, {
  ...data,
  assignedDate: data.assignedDate || serverTimestamp(),
  netPendingAmount,
  paymentStatus,
  createdAt: serverTimestamp(),
 }, 'save outgoing payment');
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

 await updateDocument(db, COLLECTIONS.outgoing_payments, id, {
 ...updates,
 netPendingAmount,
 paymentStatus,
 updatedAt: serverTimestamp(),
 }, 'update outgoing payment');
 await log('outgoing_payment_updated', { paymentId: id, updates });
 };

 const deleteOutgoingPayment = async (id) => {
  await deleteDocument(db, COLLECTIONS.outgoing_payments, id, 'delete outgoing payment');
  await log('outgoing_payment_deleted', { paymentId: id });
 };

 return { outgoingPayments, loading, addOutgoingPayment, updateOutgoingPayment, deleteOutgoingPayment };
}

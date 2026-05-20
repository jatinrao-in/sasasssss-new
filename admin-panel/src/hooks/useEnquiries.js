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

const CLOSED_ENQUIRY_STATUSES = new Set(['closed', 'won', 'lost']);

function normalizeEnquiryStatus(value) {
 return String(value || 'open')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_');
}

function normalizeEnquiry(enquiry) {
 const normalized = { ...enquiry };
 normalized.companyName = normalized.companyName || normalized.customerName || '';
 normalized.contactPerson = normalized.contactPerson || '';
 normalized.contactPhone = normalized.contactPhone || normalized.phone || '';
 normalized.description = normalized.description || normalized.notes || '';
 normalized.status = normalizeEnquiryStatus(normalized.status);
 normalized.isClosed = CLOSED_ENQUIRY_STATUSES.has(normalized.status);
 normalized.overdueDays = normalized.isClosed ? 0 : calculateOverdueDays(normalized.targetDate);
 normalized.statusCategory = normalized.isClosed
  ? 'closed'
  : normalized.overdueDays > 0
   ? 'overdue'
   : 'open';
 return normalized;
}

export function useEnquiries(filterByUser = null) {
 const [enquiries, setEnquiries] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 const enquiryQuery = filterByUser
 ? query(
 collection(db, COLLECTIONS.enquiries),
 where('assignedTo', '==', filterByUser),
 orderBy('createdAt', 'desc'),
 )
 : query(collection(db, COLLECTIONS.enquiries), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 enquiryQuery,
 (snapshot) => {
 const nextEnquiries = snapshot.docs.map((enquiryDoc) => normalizeEnquiry({
  id: enquiryDoc.id,
  ...enquiryDoc.data(),
 }));

 setEnquiries(nextEnquiries);
 setLoading(false);
 },
 (error) => {
 console.error('Enquiries listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, [filterByUser]);

 const addEnquiry = async (enquiryData) => {
  const enquiryRef = await addDocument(db, COLLECTIONS.enquiries, {
    ...enquiryData,
    assignedDate: enquiryData.assignedDate || serverTimestamp(),
    createdAt: serverTimestamp(),
    status: 'open',
    overdueDays: 0,
  }, 'save enquiry');

  await log('enquiry_created', {
   enquiryId: enquiryRef.id,
   companyName: enquiryData.companyName || enquiryData.customerName || '',
   assignedTo: enquiryData.assignedTo || '',
  });

  return enquiryRef;
 };

 const updateEnquiry = async (id, updates) => {
  await updateDocument(db, COLLECTIONS.enquiries, id, updates, 'update enquiry');
  await log('enquiry_updated', { enquiryId: id, updates });
 };

 const deleteEnquiry = async (id) => {
  await deleteDocument(db, COLLECTIONS.enquiries, id, 'delete enquiry');
  await log('enquiry_deleted', { enquiryId: id });
 };

 const markClosed = async (id) => {
  await updateDocument(db, COLLECTIONS.enquiries, id, {
   status: 'closed',
   updatedAt: serverTimestamp(),
  }, 'close enquiry');
  await log('enquiry_closed', { enquiryId: id });
 };

 return { enquiries, loading, addEnquiry, updateEnquiry, deleteEnquiry, markClosed };
}

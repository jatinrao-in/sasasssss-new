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
import {
 COLLECTIONS,
 calculateOverdueDays,
 deriveOpenItemStatus,
} from '../lib/firestore-helpers';

export function useEnquiries(filterByUser = null) {
 const [enquiries, setEnquiries] = useState([]);
 const [loading, setLoading] = useState(true);

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
 const nextEnquiries = snapshot.docs.map((enquiryDoc) => {
 const enquiry = { id: enquiryDoc.id, ...enquiryDoc.data() };
 enquiry.overdueDays = enquiry.status === 'closed' ? 0 : calculateOverdueDays(enquiry.targetDate);
 enquiry.status = deriveOpenItemStatus(enquiry);
 return enquiry;
 });

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

 const addEnquiry = async (enquiryData) => addDoc(collection(db, COLLECTIONS.enquiries), {
 ...enquiryData,
 assignedDate: serverTimestamp(),
 createdAt: serverTimestamp(),
 status: 'open',
 });

 const updateEnquiry = async (id, updates) => updateDoc(doc(db, COLLECTIONS.enquiries, id), updates);

 const deleteEnquiry = async (id) => deleteDoc(doc(db, COLLECTIONS.enquiries, id));

 const markClosed = async (id) => updateDoc(doc(db, COLLECTIONS.enquiries, id), {
 status: 'closed',
 updatedAt: serverTimestamp(),
 });

 return { enquiries, loading, addEnquiry, updateEnquiry, deleteEnquiry, markClosed };
}

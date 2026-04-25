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
import {
  COLLECTIONS,
  calculateOverdueDays,
  deriveOpenItemStatus,
} from '../lib/firestore-helpers';

export function useEnquiries(filterByUser = null) {
  const realtime = useRealtime();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const realtimeEnquiries = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const source = filterByUser
      ? realtime.enquiries.filter((item) => item.assignedTo === filterByUser)
      : realtime.enquiries;

    return source.map((enquiry) => {
      const normalized = { ...enquiry };
      normalized.overdueDays = normalized.status === 'closed' ? 0 : calculateOverdueDays(normalized.targetDate);
      normalized.status = deriveOpenItemStatus(normalized);
      return normalized;
    });
  }, [realtime, filterByUser]);

  useEffect(() => {
    if (realtimeEnquiries) {
      setEnquiries(realtimeEnquiries);
      setLoading(Boolean(realtime?.loading?.enquiries));
      return undefined;
    }

    if (!filterByUser) {
      setEnquiries([]);
      setLoading(false);
      return undefined;
    }

    const enquiryQuery = query(
      collection(db, COLLECTIONS.enquiries),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

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
  }, [filterByUser, realtimeEnquiries, realtime?.loading?.enquiries]);

  const addEnquiry = async (enquiryData) => addDoc(collection(db, COLLECTIONS.enquiries), {
    ...enquiryData,
    assignedDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    status: 'open',
  });

  const updateEnquiry = async (id, updates) => updateDoc(doc(db, COLLECTIONS.enquiries, id), updates);

  const markClosed = async (id) => updateDoc(doc(db, COLLECTIONS.enquiries, id), {
    status: 'closed',
    updatedAt: serverTimestamp(),
  });

  return { enquiries, loading, addEnquiry, updateEnquiry, markClosed };
}

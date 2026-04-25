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
  deriveOpenItemStatus,
  updateDocument,
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
      logInfo('useEnquiries', 'Using realtime enquiries:', realtimeEnquiries.length);
      setEnquiries(realtimeEnquiries);
      setLoading(Boolean(realtime?.loading?.enquiries));
      return undefined;
    }

    if (!filterByUser) {
      logSkip('useEnquiries');
      setEnquiries([]);
      setLoading(false);
      return undefined;
    }

    logFetch('useEnquiries', filterByUser);

    const enquiryQuery = query(
      collection(db, COLLECTIONS.enquiries),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      enquiryQuery,
      (snapshot) => {
        logSnapshot('useEnquiries', snapshot);
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
        logError('useEnquiries', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtimeEnquiries, realtime?.loading?.enquiries]);

  const addEnquiry = async (enquiryData) => addDocument(db, COLLECTIONS.enquiries, {
    ...enquiryData,
    assignedDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    status: 'open',
  }, 'save enquiry');

  const updateEnquiry = async (id, updates) => updateDocument(
    db,
    COLLECTIONS.enquiries,
    id,
    updates,
    'update enquiry',
  );

  const markClosed = async (id) => updateDocument(db, COLLECTIONS.enquiries, id, {
    status: 'closed',
    updatedAt: serverTimestamp(),
  }, 'close enquiry');

  return { enquiries, loading, addEnquiry, updateEnquiry, markClosed };
}

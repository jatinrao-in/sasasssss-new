import { useAuth } from './useAuth';
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

export function useEnquiries() {
  const { currentUser } = useAuth();
  const realtime = useRealtime();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const realtimeEnquiries = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const source = currentUser?.uid
      ? realtime.enquiries.filter((item) => item.assignedTo === currentUser?.uid)
      : realtime.enquiries;

    return source.map(normalizeEnquiry);
  }, [realtime, currentUser?.uid]);

  useEffect(() => {
    if (realtimeEnquiries) {
      logInfo('useEnquiries', 'Using realtime enquiries:', realtimeEnquiries.length);
      setEnquiries(realtimeEnquiries);
      setLoading(Boolean(realtime?.loading?.enquiries));
      setError(null);
      return undefined;
    }

    if (!currentUser?.uid) {
      logSkip('useEnquiries');
      setEnquiries([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    logFetch('useEnquiries', currentUser?.uid);

    const enquiryQuery = query(
      collection(db, COLLECTIONS.enquiries),
      where('assignedTo', '==', currentUser?.uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      enquiryQuery,
      (snapshot) => {
        logSnapshot('useEnquiries', snapshot);
        const nextEnquiries = snapshot.docs.map((enquiryDoc) => normalizeEnquiry({
          id: enquiryDoc.id,
          ...enquiryDoc.data(),
        }));

        setEnquiries(nextEnquiries);
        setLoading(false);
        setError(null);
      },
      (error) => {
        logError('useEnquiries', error);
        setError(error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, realtimeEnquiries, realtime?.loading?.enquiries]);

  const addEnquiry = async (enquiryData) => addDocument(db, COLLECTIONS.enquiries, {
    ...enquiryData,
    assignedDate: serverTimestamp(),
    createdAt: serverTimestamp(),
    status: 'open',
    overdueDays: 0,
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

  return {
    enquiries,
    loading,
    error,
    addEnquiry,
    updateEnquiry,
    markClosed,
  };
}

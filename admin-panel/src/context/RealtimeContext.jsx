import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';
import { useAuth } from '../hooks/useAuth';

const RealtimeContext = createContext(null);

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const createInitialState = () => ({
  tasks: [],
  projects: [],
  enquiries: [],
  followUps: [],
  payments: [],
  rgp: [],
  tools: [],
  notifications: [],
  currentSalary: null,
  unreadCount: 0,
});

const createInitialLoadingState = () => ({
  tasks: true,
  projects: true,
  enquiries: true,
  followUps: true,
  payments: true,
  rgp: true,
  tools: true,
  notifications: true,
  currentSalary: true,
});

export function RealtimeProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState(createInitialState);
  const [loading, setLoading] = useState(createInitialLoadingState);

  useEffect(() => {
    if (!currentUser?.uid) {
      setState(createInitialState());
      setLoading(createInitialLoadingState());
      return undefined;
    }

    const uid = currentUser.uid;
    const isAdmin = currentUser.role === 'admin';
    const monthKey = currentMonthKey();
    const unsubs = [];

    const setCollectionState = (key, data) => {
      setState((prev) => ({ ...prev, [key]: data }));
      setLoading((prev) => ({ ...prev, [key]: false }));
    };

    const setCollectionError = (key, error) => {
      console.error(`Realtime listener error for ${key}:`, error);
      setLoading((prev) => ({ ...prev, [key]: false }));
    };

    const listenToList = ({ key, collectionName, constraints = [] }) => {
      const ref = query(collection(db, collectionName), ...constraints);
      unsubs.push(onSnapshot(
        ref,
        (snapshot) => {
          setCollectionState(key, snapshot.docs.map((itemDoc) => ({
            id: itemDoc.id,
            ...itemDoc.data(),
          })));
        },
        (error) => setCollectionError(key, error),
      ));
    };

    const assignedQuery = (collectionName) => (
      isAdmin
        ? [orderBy('createdAt', 'desc')]
        : [where('assignedTo', '==', uid), orderBy('createdAt', 'desc')]
    );

    listenToList({ key: 'tasks', collectionName: COLLECTIONS.tasks, constraints: assignedQuery(COLLECTIONS.tasks) });
    listenToList({ key: 'projects', collectionName: COLLECTIONS.projects, constraints: [orderBy('createdAt', 'desc')] });
    listenToList({ key: 'enquiries', collectionName: COLLECTIONS.enquiries, constraints: assignedQuery(COLLECTIONS.enquiries) });
    listenToList({ key: 'followUps', collectionName: COLLECTIONS.followups, constraints: assignedQuery(COLLECTIONS.followups) });
    listenToList({ key: 'payments', collectionName: COLLECTIONS.payments, constraints: assignedQuery(COLLECTIONS.payments) });
    listenToList({ key: 'rgp', collectionName: COLLECTIONS.rgp, constraints: assignedQuery(COLLECTIONS.rgp) });
    listenToList({ key: 'tools', collectionName: COLLECTIONS.tools, constraints: assignedQuery(COLLECTIONS.tools) });

    unsubs.push(onSnapshot(
      query(
        collection(db, COLLECTIONS.notifications, uid, 'items'),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
      (snapshot) => {
        const notifications = snapshot.docs.map((itemDoc) => ({
          id: itemDoc.id,
          ...itemDoc.data(),
        }));

        setState((prev) => ({
          ...prev,
          notifications,
          unreadCount: notifications.filter((item) => !item.read).length,
        }));
        setLoading((prev) => ({ ...prev, notifications: false }));
      },
      (error) => setCollectionError('notifications', error),
    ));

    unsubs.push(onSnapshot(
      doc(db, COLLECTIONS.salary, uid, 'months', monthKey),
      (snapshot) => {
        setState((prev) => ({
          ...prev,
          currentSalary: snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
        }));
        setLoading((prev) => ({ ...prev, currentSalary: false }));
      },
      (error) => setCollectionError('currentSalary', error),
    ));

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser?.uid, currentUser?.role]);

  const value = useMemo(() => ({
    ...state,
    loading,
  }), [state, loading]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

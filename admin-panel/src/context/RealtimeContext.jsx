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
    let projectUnsubs = [];
    let activeProjectKey = '';

    setState(createInitialState());
    setLoading(createInitialLoadingState());

    const setCollectionState = (key, data) => {
      setState((prev) => ({ ...prev, [key]: data }));
      setLoading((prev) => ({ ...prev, [key]: false }));
    };

    const setCollectionError = (key, error) => {
      console.error(`RealtimeProvider error for ${key}:`, error);
      setLoading((prev) => ({ ...prev, [key]: false }));
    };

    const listenToList = ({ key, collectionName, constraints = [], onData }) => {
      const ref = query(collection(db, collectionName), ...constraints);
      unsubs.push(onSnapshot(
        ref,
        (snapshot) => {
          let data = snapshot.docs.map((itemDoc) => ({
            id: itemDoc.id,
            ...itemDoc.data(),
          }));
          
          if (!isAdmin) {
            data = [...data].sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const bTime = b.createdAt?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return bTime - aTime;
            });
          }

          if (onData) {
            onData(data, snapshot);
          } else {
            setCollectionState(key, data);
          }
        },
        (error) => setCollectionError(key, error)
      ));
    };

    const assignedQuery = () => (
      isAdmin
        ? [orderBy('createdAt', 'desc')]
        : [where('assignedTo', '==', uid)]
    );

    // Dynamic project listener setup for members
    const replaceProjectListeners = (projectIds = []) => {
      const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
      const nextProjectKey = uniqueProjectIds.join(',');

      if (nextProjectKey === activeProjectKey) {
        return;
      }

      activeProjectKey = nextProjectKey;
      projectUnsubs.forEach((unsubscribe) => unsubscribe());
      projectUnsubs = [];
      setLoading((prev) => ({ ...prev, projects: true }));

      if (!uniqueProjectIds.length) {
        setCollectionState('projects', []);
        return;
      }

      const projectMap = new Map();

      projectUnsubs = uniqueProjectIds.map((projectId) => onSnapshot(
        doc(db, COLLECTIONS.projects, projectId),
        (snapshot) => {
          if (snapshot.exists()) {
            projectMap.set(projectId, { id: snapshot.id, ...snapshot.data() });
          } else {
            projectMap.delete(projectId);
          }

          setCollectionState(
            'projects',
            uniqueProjectIds
              .map((id) => projectMap.get(id))
              .filter(Boolean)
          );
        },
        (error) => setCollectionError('projects', error)
      ));
    };

    // Subscriptions
    
    // Tasks
    listenToList({
      key: 'tasks',
      collectionName: COLLECTIONS.tasks,
      constraints: assignedQuery(),
      onData: (data) => {
        setCollectionState('tasks', data);
        if (!isAdmin) {
          replaceProjectListeners(data.map((task) => task.projectId));
        }
      }
    });

    // Projects (Admin listens to all; Member listens via task projects listener)
    if (isAdmin) {
      listenToList({
        key: 'projects',
        collectionName: COLLECTIONS.projects,
        constraints: [orderBy('createdAt', 'desc')]
      });
    }

    // Enquiries
    listenToList({
      key: 'enquiries',
      collectionName: COLLECTIONS.enquiries,
      constraints: assignedQuery()
    });

    // Follow-ups
    listenToList({
      key: 'followUps',
      collectionName: COLLECTIONS.followups,
      constraints: assignedQuery()
    });

    // Payments
    listenToList({
      key: 'payments',
      collectionName: COLLECTIONS.payments,
      constraints: assignedQuery()
    });

    // RGP
    listenToList({
      key: 'rgp',
      collectionName: COLLECTIONS.rgp,
      constraints: assignedQuery()
    });

    // Tools (For Member: no orderBy on tools to prevent composite index requirement)
    if (isAdmin) {
      listenToList({
        key: 'tools',
        collectionName: COLLECTIONS.tools,
        constraints: [orderBy('createdAt', 'desc')]
      });
    } else {
      listenToList({
        key: 'tools',
        collectionName: COLLECTIONS.tools,
        constraints: [where('assignedTo', '==', uid)],
        onData: (data) => {
          const sorted = [...data].sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
          setCollectionState('tools', sorted);
        }
      });
    }

    // Notifications
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
      (error) => setCollectionError('notifications', error)
    ));

    // Salary Months
    unsubs.push(onSnapshot(
      doc(db, COLLECTIONS.salary, uid, 'months', monthKey),
      (snapshot) => {
        setState((prev) => ({
          ...prev,
          currentSalary: snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
        }));
        setLoading((prev) => ({ ...prev, currentSalary: false }));
      },
      (error) => setCollectionError('currentSalary', error)
    ));

    return () => {
      projectUnsubs.forEach((unsubscribe) => unsubscribe());
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

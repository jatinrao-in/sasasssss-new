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
import {
  logDocSnapshot,
  logError,
  logFetch,
  logInfo,
  logSkip,
  logSnapshot,
} from '../lib/firestoreDebug';
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
      logSkip('RealtimeProvider');
      setState(createInitialState());
      setLoading(createInitialLoadingState());
      return undefined;
    }

    const uid = currentUser.uid;
    const monthKey = currentMonthKey();
    const unsubs = [];
    let projectUnsubs = [];
    let activeProjectKey = '';

    setState(createInitialState());
    setLoading(createInitialLoadingState());
    logFetch('RealtimeProvider', uid, { role: currentUser.role || 'unknown' });

    const setCollectionState = (key, data) => {
      setState((prev) => ({ ...prev, [key]: data }));
      setLoading((prev) => ({ ...prev, [key]: false }));
    };

    const setCollectionError = (key, error) => {
      logError(`RealtimeProvider.${key}`, error);
      setLoading((prev) => ({ ...prev, [key]: false }));
    };

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

      logInfo('RealtimeProvider.projects', 'Derived project IDs from tasks:', uniqueProjectIds);

      if (!uniqueProjectIds.length) {
        setCollectionState('projects', []);
        return;
      }

      const projectMap = new Map();

      projectUnsubs = uniqueProjectIds.map((projectId) => onSnapshot(
        doc(db, COLLECTIONS.projects, projectId),
        (snapshot) => {
          logDocSnapshot(`RealtimeProvider.projects.${projectId}`, snapshot);

          if (snapshot.exists()) {
            projectMap.set(projectId, { id: snapshot.id, ...snapshot.data() });
          } else {
            projectMap.delete(projectId);
          }

          setCollectionState(
            'projects',
            uniqueProjectIds
              .map((id) => projectMap.get(id))
              .filter(Boolean),
          );
        },
        (error) => setCollectionError('projects', error),
      ));
    };

    const listenToList = ({ key, scope, ref, onData }) => {
      unsubs.push(onSnapshot(
        ref,
        (snapshot) => {
          logSnapshot(scope, snapshot);

          const data = snapshot.docs.map((itemDoc) => ({
            id: itemDoc.id,
            ...itemDoc.data(),
          }));

          if (onData) {
            onData(data, snapshot);
            return;
          }

          setCollectionState(key, data);
        },
        (error) => setCollectionError(key, error),
      ));
    };

    listenToList({
      key: 'tasks',
      scope: 'RealtimeProvider.tasks',
      ref: query(
        collection(db, COLLECTIONS.tasks),
        where('assignedTo', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
      onData: (data) => {
        setCollectionState('tasks', data);
        replaceProjectListeners(data.map((task) => task.projectId));
      },
    });
    listenToList({
      key: 'enquiries',
      scope: 'RealtimeProvider.enquiries',
      ref: query(
        collection(db, COLLECTIONS.enquiries),
        where('assignedTo', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    });
    listenToList({
      key: 'followUps',
      scope: 'RealtimeProvider.followups',
      ref: query(
        collection(db, COLLECTIONS.followups),
        where('assignedTo', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    });
    listenToList({
      key: 'payments',
      scope: 'RealtimeProvider.payments',
      ref: query(
        collection(db, COLLECTIONS.payments),
        where('assignedTo', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    });
    listenToList({
      key: 'rgp',
      scope: 'RealtimeProvider.rgp',
      ref: query(
        collection(db, COLLECTIONS.rgp),
        where('assignedTo', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    });
    listenToList({
      key: 'tools',
      scope: 'RealtimeProvider.tools',
      ref: query(
        collection(db, COLLECTIONS.tools),
        where('assignedTo', '==', uid),
        orderBy('createdAt', 'desc'),
      ),
    });

    unsubs.push(onSnapshot(
      query(
        collection(db, COLLECTIONS.notifications, uid, 'items'),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
      (snapshot) => {
        logSnapshot('RealtimeProvider.notifications', snapshot);
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
        logDocSnapshot('RealtimeProvider.salary', snapshot);
        setState((prev) => ({
          ...prev,
          currentSalary: snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
        }));
        setLoading((prev) => ({ ...prev, currentSalary: false }));
      },
      (error) => setCollectionError('currentSalary', error),
    ));

    return () => {
      projectUnsubs.forEach((unsubscribe) => unsubscribe());
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser?.role, currentUser?.uid]);

  const value = useMemo(() => ({
    ...state,
    loading,
  }), [state, loading]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
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
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useTools(filterByUser = null) {
  const realtime = useRealtime();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (realtime) {
      const source = filterByUser
        ? realtime.tools.filter((item) => item.assignedTo === filterByUser)
        : realtime.tools;
      logInfo('useTools', 'Using realtime tools:', source.length);
      setTools(source);
      setLoading(Boolean(realtime.loading?.tools));
      return undefined;
    }

    if (!filterByUser) {
      logSkip('useTools');
      setTools([]);
      setLoading(false);
      return undefined;
    }

    logFetch('useTools', filterByUser);

    const ref = query(
      collection(db, COLLECTIONS.tools),
      where('assignedTo', '==', filterByUser),
      where('returnStatus', '==', 'pending'),
    );

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        logSnapshot('useTools', snapshot);
        setTools(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
        setLoading(false);
      },
      (error) => {
        logError('useTools', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtime]);

  return { tools, loading };
}

import { useAuth } from './useAuth';
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

export function useTools() {
  const { currentUser } = useAuth();
  const realtime = useRealtime();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (realtime) {
      const source = currentUser?.uid
        ? realtime.tools.filter((item) => item.assignedTo === currentUser?.uid)
        : realtime.tools;
      logInfo('useTools', 'Using realtime tools:', source.length);
      setTools(source);
      setLoading(Boolean(realtime.loading?.tools));
      return undefined;
    }

    if (!currentUser?.uid) {
      logSkip('useTools');
      setTools([]);
      setLoading(false);
      return undefined;
    }

    logFetch('useTools', currentUser?.uid);

    const ref = query(
      collection(db, COLLECTIONS.tools),
      where('assignedTo', '==', currentUser?.uid),
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
  }, [currentUser?.uid, realtime]);

  return { tools, loading };
}

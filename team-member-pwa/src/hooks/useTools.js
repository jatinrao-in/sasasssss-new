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
    console.log('[useTools] Querying tools for UID:', currentUser?.uid);

    // NOTE: No orderBy — combining where() + orderBy() on different fields requires
    // a Firestore composite index. Sort client-side to avoid silent query failures.
    const ref = query(
      collection(db, COLLECTIONS.tools),
      where('assignedTo', '==', currentUser?.uid),
    );

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        console.log('[useTools] Tools found:', snapshot.size);
        snapshot.docs.forEach(d => console.log('[useTools] Tool:', d.data()));
        logSnapshot('useTools', snapshot);
        const sorted = snapshot.docs
          .map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
        setTools(sorted);
        setLoading(false);
      },
      (error) => {
        console.error('[useTools] Snapshot error:', error);
        logError('useTools', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, realtime]);

  return { tools, loading };
}

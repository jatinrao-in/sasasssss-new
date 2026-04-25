import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
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

export function useRgp(filterByUser = null) {
  const realtime = useRealtime();
  const [rgp, setRgp] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (realtime) {
      const source = filterByUser
        ? realtime.rgp.filter((item) => item.assignedTo === filterByUser)
        : realtime.rgp;
      logInfo('useRgp', 'Using realtime RGP items:', source.length);
      setRgp(source);
      setLoading(Boolean(realtime.loading?.rgp));
      return undefined;
    }

    if (!filterByUser) {
      logSkip('useRgp');
      setRgp([]);
      setLoading(false);
      return undefined;
    }

    const ref = query(
      collection(db, COLLECTIONS.rgp),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    logFetch('useRgp', filterByUser);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        logSnapshot('useRgp', snapshot);
        setRgp(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
        setLoading(false);
      },
      (error) => {
        logError('useRgp', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtime]);

  return { rgp, loading };
}

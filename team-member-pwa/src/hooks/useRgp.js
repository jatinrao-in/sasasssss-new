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
      setRgp(source);
      setLoading(Boolean(realtime.loading?.rgp));
      return undefined;
    }

    if (!filterByUser) {
      setRgp([]);
      setLoading(false);
      return undefined;
    }

    const ref = query(
      collection(db, COLLECTIONS.rgp),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setRgp(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('RGP listener error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtime]);

  return { rgp, loading };
}

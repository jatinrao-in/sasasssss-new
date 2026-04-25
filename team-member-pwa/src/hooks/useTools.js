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

export function useTools(filterByUser = null) {
  const realtime = useRealtime();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (realtime) {
      const source = filterByUser
        ? realtime.tools.filter((item) => item.assignedTo === filterByUser)
        : realtime.tools;
      setTools(source);
      setLoading(Boolean(realtime.loading?.tools));
      return undefined;
    }

    if (!filterByUser) {
      setTools([]);
      setLoading(false);
      return undefined;
    }

    const ref = query(
      collection(db, COLLECTIONS.tools),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setTools(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Tools listener error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtime]);

  return { tools, loading };
}

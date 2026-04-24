import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useTools(filterByUser = null) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filterByUser) {
      setTools([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.tools),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTools(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Tools listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filterByUser]);

  return { tools, loading };
}

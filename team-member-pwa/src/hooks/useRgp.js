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

export function useRgp(filterByUser = null) {
  const [rgp, setRgp] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filterByUser) {
      setRgp([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.rgp),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRgp(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('RGP listener error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filterByUser]);

  return { rgp, loading };
}

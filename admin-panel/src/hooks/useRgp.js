import { useEffect, useState } from 'react';
import {
 addDoc,
 collection,
 doc,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
 updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useRgp() {
 const [rgpList, setRgpList] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const rgpQuery = query(collection(db, COLLECTIONS.rgp), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 rgpQuery,
 (snapshot) => {
 setRgpList(snapshot.docs.map((rgpDoc) => ({ id: rgpDoc.id, ...rgpDoc.data() })));
 setLoading(false);
 },
 (error) => {
 console.error('RGP listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, []);

 const addRgp = async (rgpData) => addDoc(collection(db, COLLECTIONS.rgp), {
 ...rgpData,
 createdAt: serverTimestamp(),
 status: 'open',
 });

 const updateRgp = async (id, updates) => updateDoc(doc(db, COLLECTIONS.rgp, id), updates);

 const markClosed = async (id) => updateDoc(doc(db, COLLECTIONS.rgp, id), { status: 'closed' });

 return { rgpList, loading, addRgp, updateRgp, markClosed };
}

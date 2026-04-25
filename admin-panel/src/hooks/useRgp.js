import { useEffect, useState } from 'react';
import {
 addDoc,
 collection,
 deleteDoc,
 doc,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
 updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useRgp() {
 const [rgpList, setRgpList] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

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

 const addRgp = async (rgpData) => {
  const rgpRef = await addDoc(collection(db, COLLECTIONS.rgp), {
   ...rgpData,
   createdAt: serverTimestamp(),
   status: 'open',
  });

  await log('rgp_created', {
   rgpId: rgpRef.id,
   assignedTo: rgpData.assignedTo || '',
   reference: rgpData.referenceNumber || rgpData.itemName || '',
  });

  return rgpRef;
 };

 const updateRgp = async (id, updates) => {
  await updateDoc(doc(db, COLLECTIONS.rgp, id), updates);
  await log('rgp_updated', { rgpId: id, updates });
 };

 const deleteRgp = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.rgp, id));
  await log('rgp_deleted', { rgpId: id });
 };

 const markClosed = async (id) => {
  await updateDoc(doc(db, COLLECTIONS.rgp, id), { status: 'closed' });
  await log('rgp_closed', { rgpId: id });
 };

 return { rgpList, loading, addRgp, updateRgp, deleteRgp, markClosed };
}

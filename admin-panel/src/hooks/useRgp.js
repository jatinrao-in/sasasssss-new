import { useEffect, useState } from 'react';
import {
 collection,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import {
 COLLECTIONS,
 addDocument,
 deleteDocument,
 updateDocument,
} from '../lib/firestore-helpers';

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
  const rgpRef = await addDocument(db, COLLECTIONS.rgp, {
    ...rgpData,
    assignedDate: rgpData.assignedDate || serverTimestamp(),
    createdAt: serverTimestamp(),
    status: rgpData.status || 'open',
  }, 'save rgp');

  await log('rgp_created', {
   rgpId: rgpRef.id,
   assignedTo: rgpData.assignedTo || '',
   reference: rgpData.referenceNumber || rgpData.itemName || '',
  });

  return rgpRef;
 };

 const updateRgp = async (id, updates) => {
  await updateDocument(db, COLLECTIONS.rgp, id, updates, 'update rgp');
  await log('rgp_updated', { rgpId: id, updates });
 };

 const deleteRgp = async (id) => {
  await deleteDocument(db, COLLECTIONS.rgp, id, 'delete rgp');
  await log('rgp_deleted', { rgpId: id });
 };

 const markClosed = async (id) => {
  await updateDocument(db, COLLECTIONS.rgp, id, { status: 'closed' }, 'close rgp');
  await log('rgp_closed', { rgpId: id });
 };

 return { rgpList, loading, addRgp, updateRgp, deleteRgp, markClosed };
}

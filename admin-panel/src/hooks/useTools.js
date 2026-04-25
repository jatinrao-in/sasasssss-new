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
 deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useTools() {
 const [tools, setTools] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 const q = query(collection(db, COLLECTIONS.tools), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 q,
 (snapshot) => {
 setTools(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
 setLoading(false);
 },
 (error) => {
 console.error('Tools listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, []);

 const assignTool = async (data) => {
  const toolRef = await addDoc(collection(db, COLLECTIONS.tools), {
   ...data,
   returnStatus: 'pending',
   returnDate: null,
   createdAt: serverTimestamp(),
  });

  await log('tool_assigned', {
   toolId: toolRef.id,
   toolName: data.toolName || data.name || '',
   assignedTo: data.assignedTo || '',
  });

  return toolRef;
 };

 const updateTool = async (id, updates) => {
  await updateDoc(doc(db, COLLECTIONS.tools, id), {
   ...updates,
   updatedAt: serverTimestamp(),
  });
  await log('tool_updated', { toolId: id, updates });
 };

 const markReturned = async (id) => {
  await updateDoc(doc(db, COLLECTIONS.tools, id), {
   returnStatus: 'returned',
   returnDate: serverTimestamp(),
  });
  await log('tool_returned', { toolId: id });
 };

 const deleteTool = async (id) => {
  await deleteDoc(doc(db, COLLECTIONS.tools, id));
  await log('tool_deleted', { toolId: id });
 };

 return { tools, loading, assignTool, updateTool, markReturned, deleteTool };
}

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
  const toolRef = await addDocument(db, COLLECTIONS.tools, {
   ...data,
   returnStatus: 'pending',
   returnDate: null,
   createdAt: serverTimestamp(),
  }, 'save tool assignment');

  await log('tool_assigned', {
   toolId: toolRef.id,
   toolName: data.toolName || data.name || '',
   assignedTo: data.assignedTo || '',
  });

  return toolRef;
 };

 const updateTool = async (id, updates) => {
  await updateDocument(db, COLLECTIONS.tools, id, {
   ...updates,
   updatedAt: serverTimestamp(),
  }, 'update tool assignment');
  await log('tool_updated', { toolId: id, updates });
 };

 const markReturned = async (id) => {
  await updateDocument(db, COLLECTIONS.tools, id, {
   returnStatus: 'returned',
   returnDate: serverTimestamp(),
  }, 'mark tool returned');
  await log('tool_returned', { toolId: id });
 };

 const deleteTool = async (id) => {
  await deleteDocument(db, COLLECTIONS.tools, id, 'delete tool assignment');
  await log('tool_deleted', { toolId: id });
 };

 return { tools, loading, assignTool, updateTool, markReturned, deleteTool };
}

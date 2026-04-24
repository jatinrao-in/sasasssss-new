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
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore-helpers';

export function useTools() {
 const [tools, setTools] = useState([]);
 const [loading, setLoading] = useState(true);

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

 const assignTool = async (data) => addDoc(collection(db, COLLECTIONS.tools), {
 ...data,
 returnStatus: 'pending',
 returnDate: null,
 createdAt: serverTimestamp(),
 });

 const updateTool = async (id, updates) => updateDoc(doc(db, COLLECTIONS.tools, id), {
 ...updates,
 updatedAt: serverTimestamp(),
 });

 const markReturned = async (id) => updateDoc(doc(db, COLLECTIONS.tools, id), {
 returnStatus: 'returned',
 returnDate: serverTimestamp(),
 });

 const deleteTool = async (id) => deleteDoc(doc(db, COLLECTIONS.tools, id));

 return { tools, loading, assignTool, updateTool, markReturned, deleteTool };
}

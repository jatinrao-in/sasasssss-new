import { useEffect, useState } from 'react';
import {
 addDoc,
 collection,
 deleteDoc,
 doc,
 getDoc,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
 updateDoc,
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
 COLLECTIONS,
 calculateOverdueDays,
 deriveTaskStatus,
 recalculateProjectCompletion,
} from '../lib/firestore-helpers';

export function useTasks(filterByUser = null) {
 const [tasks, setTasks] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 if (!filterByUser) {
 setTasks([]);
 setLoading(false);
 return;
 }
 
 const taskQuery = query(
 collection(db, COLLECTIONS.tasks),
 where('assignedTo', '==', filterByUser),
 orderBy('createdAt', 'desc'),
 );

 const unsubscribe = onSnapshot(
 taskQuery,
 (snapshot) => {
 const nextTasks = snapshot.docs.map((taskDoc) => {
 const task = { id: taskDoc.id, ...taskDoc.data() };
 task.overdueDays = task.status === 'completed' ? 0 : calculateOverdueDays(task.targetDate);
 task.status = deriveTaskStatus(task);
 return task;
 });

 setTasks(nextTasks);
 setLoading(false);
 },
 (error) => {
 console.error('Tasks listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, [filterByUser]);

 const addTask = async (taskData) => addDoc(collection(db, COLLECTIONS.tasks), {
 ...taskData,
 completionPercent: Number(taskData.completionPercent || 0),
 createdAt: serverTimestamp(),
 startDate: serverTimestamp(),
 status: 'open',
 });

 const updateTask = async (taskId, updates) => updateDoc(doc(db, COLLECTIONS.tasks, taskId), updates);

 const updateCompletion = async (taskId, percent) => {
 const taskRef = doc(db, COLLECTIONS.tasks, taskId);
 const taskSnapshot = await getDoc(taskRef);
 const taskData = taskSnapshot.exists() ? taskSnapshot.data() : null;

 await updateDoc(taskRef, {
 completedAt: percent >= 100 ? serverTimestamp() : null,
 completionPercent: Number(percent),
 status: percent >= 100 ? 'completed' : 'open',
 updatedAt: serverTimestamp(),
 });

 if (taskData?.projectId) {
 await recalculateProjectCompletion(db, taskData.projectId);
 }
 };

 const deleteTask = async (taskId) => {
 const taskRef = doc(db, COLLECTIONS.tasks, taskId);
 const taskSnapshot = await getDoc(taskRef);
 const taskData = taskSnapshot.exists() ? taskSnapshot.data() : null;

 await deleteDoc(taskRef);

 if (taskData?.projectId) {
 await recalculateProjectCompletion(db, taskData.projectId);
 }
 };

 return { tasks, loading, addTask, updateTask, updateCompletion, deleteTask };
}

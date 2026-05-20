import { useEffect, useState } from 'react';
import {
 collection,
 doc,
 getDoc,
 onSnapshot,
 orderBy,
 query,
 serverTimestamp,
 where,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import {
 COLLECTIONS,
 addDocument,
 calculateOverdueDays,
 deleteDocumentRef,
 deriveTaskStatus,
 recalculateProjectCompletion,
 updateDocument,
 updateDocumentRef,
} from '../lib/firestore-helpers';
import { onAuthStateChanged } from 'firebase/auth';


export function useTasks(filterByUser = null) {
 const [tasks, setTasks] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();
 // authReady tracks whether we have a definite auth state (null = loading, string = uid, 'admin' = admin)
 const [authReady, setAuthReady] = useState(false);

 useEffect(() => {
  const unsubAuth = onAuthStateChanged(auth, (user) => {
   if (user) setAuthReady(true);
   else { setAuthReady(false); setTasks([]); setLoading(false); }
  });
  return () => unsubAuth();
 }, []);

 useEffect(() => {
  if (!authReady) return;

  const taskQuery = filterByUser
   ? query(
    collection(db, COLLECTIONS.tasks),
    where('assignedTo', '==', filterByUser),
    orderBy('createdAt', 'desc'),
   )
   : query(collection(db, COLLECTIONS.tasks), orderBy('createdAt', 'desc'));

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
 }, [filterByUser, authReady]);

 const addTask = async (taskData) => {
  const taskRef = await addDocument(db, COLLECTIONS.tasks, {
   ...taskData,
   assignedDate: taskData.assignedDate || serverTimestamp(),
   completionPercent: Number(taskData.completionPercent || 0),
   createdAt: serverTimestamp(),
   startDate: serverTimestamp(),
   status: 'open',
  }, 'save task');

  await log('task_created', {
   taskId: taskRef.id,
   taskName: taskData.title || '',
   assignedTo: taskData.assignedTo || '',
   projectId: taskData.projectId || '',
  });

  return taskRef;
 };

 const updateTask = async (taskId, updates) => {
  await updateDocument(db, COLLECTIONS.tasks, taskId, updates, 'update task');
  await log('task_updated', { taskId, updates });
 };

 const updateCompletion = async (taskId, percent) => {
 const taskRef = doc(db, COLLECTIONS.tasks, taskId);
 const taskSnapshot = await getDoc(taskRef);
 const taskData = taskSnapshot.exists() ? taskSnapshot.data() : null;

 await updateDocumentRef(taskRef, {
 completedAt: percent >= 100 ? serverTimestamp() : null,
 completionPercent: Number(percent),
 status: percent >= 100 ? 'completed' : 'open',
 updatedAt: serverTimestamp(),
 }, { action: 'update task completion', collectionName: COLLECTIONS.tasks });

 await log('task_progress_updated', {
  taskId,
  taskName: taskData?.title || '',
  projectId: taskData?.projectId || '',
  completionPercent: Number(percent),
  status: percent >= 100 ? 'completed' : 'open',
 });

 if (taskData?.projectId) {
 await recalculateProjectCompletion(db, taskData.projectId);
 }
 };

 const deleteTask = async (taskId) => {
 const taskRef = doc(db, COLLECTIONS.tasks, taskId);
 const taskSnapshot = await getDoc(taskRef);
 const taskData = taskSnapshot.exists() ? taskSnapshot.data() : null;

 await deleteDocumentRef(taskRef, { action: 'delete task', collectionName: COLLECTIONS.tasks });

 await log('task_deleted', {
  taskId,
  taskName: taskData?.title || '',
  projectId: taskData?.projectId || '',
 });

 if (taskData?.projectId) {
 await recalculateProjectCompletion(db, taskData.projectId);
 }
 };

 return { tasks, loading, addTask, updateTask, updateCompletion, deleteTask };
}

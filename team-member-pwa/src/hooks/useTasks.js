import { useEffect, useMemo, useState } from 'react';
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
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';
import {
  logError,
  logFetch,
  logInfo,
  logSkip,
  logSnapshot,
} from '../lib/firestoreDebug';
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

export function useTasks(filterByUser = null) {
  const realtime = useRealtime();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const realtimeTasks = useMemo(() => {
    if (!realtime) {
      return null;
    }

    const source = Array.isArray(realtime.tasks) ? realtime.tasks : [];
    const filtered = filterByUser
      ? source.filter((task) => task.assignedTo === filterByUser)
      : source;

    return filtered.map((task) => {
      const normalizedTask = { ...task };
      normalizedTask.overdueDays = normalizedTask.status === 'completed'
        ? 0
        : calculateOverdueDays(normalizedTask.targetDate);
      normalizedTask.status = deriveTaskStatus(normalizedTask);
      return normalizedTask;
    });
  }, [realtime, filterByUser]);

  useEffect(() => {
    if (realtimeTasks) {
      logInfo('useTasks', 'Using realtime tasks:', realtimeTasks.length);
      setTasks(realtimeTasks);
      setLoading(Boolean(realtime?.loading?.tasks));
      return undefined;
    }

    if (!filterByUser) {
      logSkip('useTasks');
      setTasks([]);
      setLoading(false);
      return undefined;
    }

    logFetch('useTasks', filterByUser);

    const taskQuery = query(
      collection(db, COLLECTIONS.tasks),
      where('assignedTo', '==', filterByUser),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      taskQuery,
      (snapshot) => {
        logSnapshot('useTasks', snapshot);
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
        logError('useTasks', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filterByUser, realtimeTasks, realtime?.loading?.tasks]);

  const addTask = async (taskData) => addDocument(db, COLLECTIONS.tasks, {
    ...taskData,
    completionPercent: Number(taskData.completionPercent || 0),
    createdAt: serverTimestamp(),
    startDate: serverTimestamp(),
    status: 'open',
  }, 'save task');

  const updateTask = async (taskId, updates) => updateDocument(
    db,
    COLLECTIONS.tasks,
    taskId,
    updates,
    'update task',
  );

  const updateCompletion = async (taskId, percent) => {
    const taskRef = doc(db, COLLECTIONS.tasks, taskId);
    const taskSnapshot = await getDoc(taskRef);
    const taskData = taskSnapshot.exists() ? taskSnapshot.data() : null;

    await updateDocumentRef(taskRef, {
      completionPercent: Number(percent),
      status: percent >= 100 ? 'completed' : 'open',
      updatedAt: serverTimestamp(),
    }, { action: 'update task completion', collectionName: COLLECTIONS.tasks });

    if (taskData?.projectId) {
      await recalculateProjectCompletion(db, taskData.projectId);
    }
  };

  const deleteTask = async (taskId) => {
    const taskRef = doc(db, COLLECTIONS.tasks, taskId);
    const taskSnapshot = await getDoc(taskRef);
    const taskData = taskSnapshot.exists() ? taskSnapshot.data() : null;

    await deleteDocumentRef(taskRef, { action: 'delete task', collectionName: COLLECTIONS.tasks });

    if (taskData?.projectId) {
      await recalculateProjectCompletion(db, taskData.projectId);
    }
  };

  return { tasks, loading, addTask, updateTask, updateCompletion, deleteTask };
}

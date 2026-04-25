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
 where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import {
 COLLECTIONS,
 recalculateProjectCompletion,
 recalculateProjectTotalExpense,
} from '../lib/firestore-helpers';

export function useProjects() {
 const [projects, setProjects] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 const projectQuery = query(collection(db, COLLECTIONS.projects), orderBy('createdAt', 'desc'));

 const unsubscribe = onSnapshot(
 projectQuery,
 (snapshot) => {
 setProjects(snapshot.docs.map((projectDoc) => ({ id: projectDoc.id, ...projectDoc.data() })));
 setLoading(false);
 },
 (error) => {
 console.error('Projects listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, []);

 const addProject = async (projectData) => {
  const projectRef = await addDoc(collection(db, COLLECTIONS.projects), {
   ...projectData,
   completionPercent: 0,
   createdAt: serverTimestamp(),
   status: 'active',
   totalExpense: 0,
  });

  await log('project_created', {
   projectId: projectRef.id,
   projectName: projectData.name || '',
   client: projectData.client || '',
  });

  return projectRef;
 };

 const updateProject = async (projectId, updates) => {
  await updateDoc(doc(db, COLLECTIONS.projects, projectId), updates);
  await log('project_updated', { projectId, updates });
 };

 const deleteProject = async (projectId) => {
  await deleteDoc(doc(db, COLLECTIONS.projects, projectId));
  await log('project_deleted', { projectId });
 };

 const recalcTotalExpense = async (projectId) => recalculateProjectTotalExpense(db, projectId);

 const recalcCompletion = async (projectId) => recalculateProjectCompletion(db, projectId);

 return {
 projects,
 loading,
 addProject,
 updateProject,
 deleteProject,
 recalcTotalExpense,
 recalcCompletion,
 };
}

export function useExpenses(projectId = null) {
 const [expenses, setExpenses] = useState([]);
 const [loading, setLoading] = useState(true);
 const { log } = useAuditLog();

 useEffect(() => {
 if (!projectId) {
 setExpenses([]);
 setLoading(false);
 return undefined;
 }

 const expenseQuery = query(
 collection(db, COLLECTIONS.expenses),
 where('projectId', '==', projectId),
 orderBy('createdAt', 'desc'),
 );

 const unsubscribe = onSnapshot(
 expenseQuery,
 (snapshot) => {
 setExpenses(snapshot.docs.map((expenseDoc) => ({ id: expenseDoc.id, ...expenseDoc.data() })));
 setLoading(false);
 },
 (error) => {
 console.error('Expenses listener error:', error);
 setLoading(false);
 },
 );

 return () => unsubscribe();
 }, [projectId]);

 const addExpense = async (expenseData) => {
 if (!expenseData.projectId) {
 throw new Error('projectId is required for an expense');
 }

 const expenseRef = await addDoc(collection(db, COLLECTIONS.expenses), {
 activity: expenseData.activity,
 amount: Number(expenseData.amount || 0),
 assignedTo: expenseData.assignedTo || '',
 createdAt: serverTimestamp(),
 projectId: expenseData.projectId,
 taskId: expenseData.taskId || '',
 });

 await recalculateProjectTotalExpense(db, expenseData.projectId);
 await log('expense_created', {
  expenseId: expenseRef.id,
  projectId: expenseData.projectId,
  taskId: expenseData.taskId || '',
  amount: Number(expenseData.amount || 0),
  activity: expenseData.activity || '',
 });
 return expenseRef;
 };

 return { expenses, loading, addExpense };
}

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  COLLECTIONS,
  recalculateProjectCompletion,
  recalculateProjectTotalExpense,
} from './firestore-helpers';

export async function deleteDocsByIds(collectionName, ids) {
  await Promise.all(ids.map((id) => deleteDoc(doc(db, collectionName, id))));
}

export async function deleteProjectCascade(projectId) {
  const tasksSnap = await getDocs(
    query(collection(db, COLLECTIONS.tasks), where('projectId', '==', projectId)),
  );
  const expensesSnap = await getDocs(
    query(collection(db, COLLECTIONS.expenses), where('projectId', '==', projectId)),
  );

  await Promise.all([
    ...tasksSnap.docs.map((taskDoc) => deleteDoc(taskDoc.ref)),
    ...expensesSnap.docs.map((expenseDoc) => deleteDoc(expenseDoc.ref)),
    deleteDoc(doc(db, COLLECTIONS.projects, projectId)),
  ]);
}

export async function deleteTaskCascade(taskId, projectId = null) {
  const expensesSnap = await getDocs(
    query(collection(db, COLLECTIONS.expenses), where('taskId', '==', taskId)),
  );

  await Promise.all([
    ...expensesSnap.docs.map((expenseDoc) => deleteDoc(expenseDoc.ref)),
    deleteDoc(doc(db, COLLECTIONS.tasks, taskId)),
  ]);

  if (projectId) {
    await Promise.all([
      recalculateProjectCompletion(db, projectId),
      recalculateProjectTotalExpense(db, projectId),
    ]);
  }
}

export async function deleteExpenseAndRecalculate(expenseId, projectId) {
  await deleteDoc(doc(db, COLLECTIONS.expenses, expenseId));

  if (projectId) {
    await recalculateProjectTotalExpense(db, projectId);
  }
}

export async function clearCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  await Promise.all(snapshot.docs.map((itemDoc) => deleteDoc(itemDoc.ref)));
}

import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  COLLECTIONS,
  deleteDocument,
  deleteDocumentRef,
  recalculateProjectCompletion,
  recalculateProjectTotalExpense,
} from './firestore-helpers';

export async function deleteDocsByIds(collectionName, ids) {
  await Promise.all(ids.map((id) => deleteDocument(db, collectionName, id, `delete ${collectionName}`)));
}

export async function deleteProjectCascade(projectId) {
  const tasksSnap = await getDocs(
    query(collection(db, COLLECTIONS.tasks), where('projectId', '==', projectId)),
  );
  const expensesSnap = await getDocs(
    query(collection(db, COLLECTIONS.expenses), where('projectId', '==', projectId)),
  );

  await Promise.all([
    ...tasksSnap.docs.map((taskDoc) => deleteDocumentRef(taskDoc.ref, { action: 'delete project task', collectionName: COLLECTIONS.tasks })),
    ...expensesSnap.docs.map((expenseDoc) => deleteDocumentRef(expenseDoc.ref, { action: 'delete project expense', collectionName: COLLECTIONS.expenses })),
    deleteDocument(db, COLLECTIONS.projects, projectId, 'delete project'),
  ]);
}

export async function deleteTaskCascade(taskId, projectId = null) {
  const expensesSnap = await getDocs(
    query(collection(db, COLLECTIONS.expenses), where('taskId', '==', taskId)),
  );

  await Promise.all([
    ...expensesSnap.docs.map((expenseDoc) => deleteDocumentRef(expenseDoc.ref, { action: 'delete task expense', collectionName: COLLECTIONS.expenses })),
    deleteDocument(db, COLLECTIONS.tasks, taskId, 'delete task'),
  ]);

  if (projectId) {
    await Promise.all([
      recalculateProjectCompletion(db, projectId),
      recalculateProjectTotalExpense(db, projectId),
    ]);
  }
}

export async function deleteExpenseAndRecalculate(expenseId, projectId) {
  await deleteDocument(db, COLLECTIONS.expenses, expenseId, 'delete expense');

  if (projectId) {
    await recalculateProjectTotalExpense(db, projectId);
  }
}

export async function clearCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  await Promise.all(snapshot.docs.map((itemDoc) => deleteDocumentRef(
    itemDoc.ref,
    { action: `delete ${collectionName}`, collectionName },
  )));
}

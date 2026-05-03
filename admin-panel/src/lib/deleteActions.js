import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
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
  const batch = writeBatch(db);

  const [tasksSnap, expensesSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.tasks), where('projectId', '==', projectId))),
    getDocs(query(collection(db, COLLECTIONS.expenses), where('projectId', '==', projectId)))
  ]);

  tasksSnap.docs.forEach((taskDoc) => batch.delete(taskDoc.ref));
  expensesSnap.docs.forEach((expenseDoc) => batch.delete(expenseDoc.ref));
  batch.delete(doc(db, COLLECTIONS.projects, projectId));

  await batch.commit();
}

export async function deleteTaskCascade(taskId, projectId = null) {
  const batch = writeBatch(db);

  const expensesSnap = await getDocs(
    query(collection(db, COLLECTIONS.expenses), where('taskId', '==', taskId)),
  );

  expensesSnap.docs.forEach((expenseDoc) => batch.delete(expenseDoc.ref));
  batch.delete(doc(db, COLLECTIONS.tasks, taskId));

  await batch.commit();

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

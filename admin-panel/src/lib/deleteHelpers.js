/**
 * deleteHelpers.js
 * Direct Firestore delete helpers — no API needed (client SDK is fine for these).
 * Only member create/delete needs the API (requires Firebase Auth Admin SDK).
 */
import { deleteDoc, doc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

// ── PROJECTS ────────────────────────────────────────────────────────────────
export async function deleteProject(projectId) {
  const batch = writeBatch(db);

  const [tasksSnap, expSnap] = await Promise.all([
    getDocs(query(collection(db, 'tasks'), where('projectId', '==', projectId))),
    getDocs(query(collection(db, 'expenses'), where('projectId', '==', projectId))),
  ]);

  tasksSnap.docs.forEach((d) => batch.delete(d.ref));
  expSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'projects', projectId));

  await batch.commit();
}

// ── TASKS ────────────────────────────────────────────────────────────────────
export async function deleteTask(taskId) {
  const batch = writeBatch(db);

  const expSnap = await getDocs(
    query(collection(db, 'expenses'), where('taskId', '==', taskId)),
  );
  expSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'tasks', taskId));

  await batch.commit();
}

// ── SIMPLE DELETES ───────────────────────────────────────────────────────────
export const deleteEnquiry = (id) => deleteDoc(doc(db, 'enquiries', id));
export const deleteFollowup = (id) => deleteDoc(doc(db, 'followups', id));
export const deletePayment = (id) => deleteDoc(doc(db, 'payments', id));
export const deleteOutgoing = (id) => deleteDoc(doc(db, 'outgoing_payments', id));
export const deleteRgp = (id) => deleteDoc(doc(db, 'rgp', id));
export const deleteTool = (id) => deleteDoc(doc(db, 'tools', id));
export const deleteExpense = (id) => deleteDoc(doc(db, 'expenses', id));
export const deleteSalaryRecord = (uid, month) =>
  deleteDoc(doc(db, 'salary', uid, 'months', month));

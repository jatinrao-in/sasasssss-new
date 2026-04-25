import {
 addDoc,
 collection,
 deleteDoc,
 doc,
 getDocs,
 query,
 serverTimestamp,
 setDoc,
 updateDoc,
 where,
} from 'firebase/firestore';

export const COLLECTIONS = {
 audit_logs: 'audit_logs',
 enquiries: 'enquiries',
 expenses: 'expenses',
 followups: 'followups',
 notifications: 'notifications',
 outgoing_payments: 'outgoing_payments',
 payments: 'payments',
 projects: 'projects',
 rgp: 'rgp',
 salary: 'salary',
 settings: 'settings',
 tasks: 'tasks',
 tools: 'tools',
 users: 'users',
 whatsapp_config: 'whatsapp_config',
 whatsapp_logs: 'whatsapp_logs',
};

function createFirestoreActionError(error, fallbackMessage) {
 const code = String(error?.code || '').trim();
 let message = fallbackMessage;

 if (code === 'permission-denied') {
  message = 'Permission denied. Check Firebase security rules.';
 } else if (code === 'unavailable') {
  message = 'Firebase unavailable. Check your internet connection.';
 } else if (error?.message) {
  message = error.message;
 }

 const wrappedError = new Error(message);
 wrappedError.code = error?.code;
 wrappedError.cause = error;
 return wrappedError;
}

export async function runFirestoreMutation({
 action,
 collectionName,
 documentPath = '',
 payload,
 operation,
 successDetails,
}) {
 try {
  return await operation();
 } catch (error) {
  throw createFirestoreActionError(error, `${action} failed.`);
 }
}

export function addDocument(db, collectionName, data, action = `save ${collectionName}`) {
 return runFirestoreMutation({
  action,
  collectionName,
  payload: data,
  operation: () => addDoc(collection(db, collectionName), data),
  successDetails: (docRef) => ({ id: docRef.id }),
 });
}

export function addDocumentToCollection(collectionRef, data, {
 action = `save ${collectionRef.id}`,
 collectionName = collectionRef.id,
} = {}) {
 return runFirestoreMutation({
  action,
  collectionName,
  documentPath: collectionRef.path,
  payload: data,
  operation: () => addDoc(collectionRef, data),
  successDetails: (docRef) => ({ id: docRef.id }),
 });
}

export function setDocument(documentRef, data, options = {}, {
 action = `save ${documentRef.parent?.id || documentRef.id}`,
 collectionName = documentRef.parent?.id || documentRef.id,
} = {}) {
 return runFirestoreMutation({
  action,
  collectionName,
  documentPath: documentRef.path,
  payload: data,
  operation: () => setDoc(documentRef, data, options),
 });
}

export function updateDocument(db, collectionName, documentId, data, action = `update ${collectionName}`) {
 return runFirestoreMutation({
  action,
  collectionName,
  documentPath: `${collectionName}/${documentId}`,
  payload: data,
  operation: () => updateDoc(doc(db, collectionName, documentId), data),
 });
}

export function updateDocumentRef(documentRef, data, {
 action = `update ${documentRef.parent?.id || documentRef.id}`,
 collectionName = documentRef.parent?.id || documentRef.id,
} = {}) {
 return runFirestoreMutation({
  action,
  collectionName,
  documentPath: documentRef.path,
  payload: data,
  operation: () => updateDoc(documentRef, data),
 });
}

export function deleteDocument(db, collectionName, documentId, action = `delete ${collectionName}`) {
 return runFirestoreMutation({
  action,
  collectionName,
  documentPath: `${collectionName}/${documentId}`,
  operation: () => deleteDoc(doc(db, collectionName, documentId)),
 });
}

export function deleteDocumentRef(documentRef, {
 action = `delete ${documentRef.parent?.id || documentRef.id}`,
 collectionName = documentRef.parent?.id || documentRef.id,
} = {}) {
 return runFirestoreMutation({
  action,
  collectionName,
  documentPath: documentRef.path,
  operation: () => deleteDoc(documentRef),
 });
}

export function toDateValue(value) {
 if (!value) {
 return null;
 }

 if (typeof value.toDate === 'function') {
 return value.toDate();
 }

 const parsed = value instanceof Date ? value : new Date(value);
 return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateOverdueDays(targetDate) {
 const parsedTargetDate = toDateValue(targetDate);

 if (!parsedTargetDate) {
 return 0;
 }

 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const normalizedTargetDate = new Date(parsedTargetDate);
 normalizedTargetDate.setHours(0, 0, 0, 0);

 const diff = Math.floor((today - normalizedTargetDate) / (1000 * 60 * 60 * 24));
 return diff > 0 ? diff : 0;
}

export function deriveTaskStatus(task) {
 if ((task.completionPercent || 0) >= 100 || task.status === 'completed') {
 return 'completed';
 }

 return calculateOverdueDays(task.targetDate) > 0 ? 'overdue' : 'open';
}

export function deriveOpenItemStatus(item) {
 if (item.status === 'closed') {
 return 'closed';
 }

 return calculateOverdueDays(item.targetDate) > 0 ? 'overdue' : 'open';
}

export function getNotificationItemsCollection(db, userId) {
 return collection(db, COLLECTIONS.notifications, userId, 'items');
}

export function getNotificationItemDoc(db, userId, notificationId) {
 return doc(db, COLLECTIONS.notifications, userId, 'items', notificationId);
}

export function getSalaryMonthsCollection(db, userId) {
 return collection(db, COLLECTIONS.salary, userId, 'months');
}

export function getSalaryMonthDoc(db, userId, monthYear) {
 return doc(db, COLLECTIONS.salary, userId, 'months', monthYear);
}

export function buildNotificationPayload({ message, type, relatedId = '' }) {
 return {
 createdAt: serverTimestamp(),
 message,
 read: false,
 relatedId,
 type,
 };
}

export async function recalculateProjectTotalExpense(db, projectId) {
 if (!projectId) {
 return 0;
 }

 const expenseSnapshot = await getDocs(
 query(collection(db, COLLECTIONS.expenses), where('projectId', '==', projectId)),
 );

 const totalExpense = expenseSnapshot.docs.reduce(
 (sum, expenseDoc) => sum + Number(expenseDoc.data().amount || 0),
 0,
 );

 await updateDocument(db, COLLECTIONS.projects, projectId, { totalExpense }, 'sync project total expense');
 return totalExpense;
}

export async function recalculateProjectCompletion(db, projectId) {
 if (!projectId) {
 return 0;
 }

 const taskSnapshot = await getDocs(
 query(collection(db, COLLECTIONS.tasks), where('projectId', '==', projectId)),
 );

 const completionPercent = taskSnapshot.empty
 ? 0
 : Math.round(
 taskSnapshot.docs.reduce(
 (sum, taskDoc) => sum + Number(taskDoc.data().completionPercent || 0),
 0,
 ) / taskSnapshot.size,
 );

 await updateDocument(db, COLLECTIONS.projects, projectId, { completionPercent }, 'sync project completion');
 return completionPercent;
}

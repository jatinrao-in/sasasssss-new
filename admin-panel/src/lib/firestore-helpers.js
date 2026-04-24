import {
 collection,
 doc,
 getDocs,
 query,
 serverTimestamp,
 updateDoc,
 where,
} from 'firebase/firestore';

export const COLLECTIONS = {
 enquiries: 'enquiries',
 expenses: 'expenses',
 followups: 'followups',
 notifications: 'notifications',
 outgoing_payments: 'outgoing_payments',
 payments: 'payments',
 projects: 'projects',
 rgp: 'rgp',
 salary: 'salary',
 tasks: 'tasks',
 tools: 'tools',
 users: 'users',
 whatsapp_config: 'whatsapp_config',
};

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

 await updateDoc(doc(db, COLLECTIONS.projects, projectId), { totalExpense });
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

 await updateDoc(doc(db, COLLECTIONS.projects, projectId), { completionPercent });
 return completionPercent;
}

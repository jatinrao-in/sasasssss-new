/**
 * Client-side sync helpers - replaces Firebase onDocumentWritten triggers.
 * These run in the Admin Panel browser after every Firestore write.
 */
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// ── Overdue Calculation ──────────────────────────────────────────────────────

export function calculateOverdueDays(targetDate) {
  if (!targetDate) return 0;
  const d = targetDate?.toDate ? targetDate.toDate() : new Date(targetDate);
  if (isNaN(d)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const norm = new Date(d);
  norm.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - norm) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function deriveTaskStatus(task) {
  if ((task.completionPercent || 0) >= 100 || task.status === 'completed') return 'completed';
  return calculateOverdueDays(task.targetDate) > 0 ? 'overdue' : 'open';
}

export function deriveOpenStatus(record) {
  if (record.status === 'closed') return 'closed';
  return calculateOverdueDays(record.targetDate) > 0 ? 'overdue' : 'open';
}

// ── Project Expense Total Sync ─────────────────────────────────────────────
// Call after saving/deleting an expense.

export async function syncProjectExpenseTotals(projectId) {
  if (!projectId) return;
  try {
    const snap = await getDocs(
      query(collection(db, 'expenses'), where('projectId', '==', projectId))
    );
    const total = snap.docs.reduce((sum, d) => sum + Number(d.data().amount || 0), 0);
    await setDoc(doc(db, 'projects', projectId), { totalExpense: total }, { merge: true });
  } catch (err) {
    console.error('[syncProjectExpenseTotals]', err.message);
  }
}

// ── Project Completion Sync ───────────────────────────────────────────────
// Call after saving/deleting a task.

export async function syncProjectCompletion(projectId) {
  if (!projectId) return;
  try {
    const snap = await getDocs(
      query(collection(db, 'tasks'), where('projectId', '==', projectId))
    );
    const pct = snap.empty
      ? 0
      : Math.round(
          snap.docs.reduce((s, d) => s + Number(d.data().completionPercent || 0), 0) / snap.size
        );
    await setDoc(doc(db, 'projects', projectId), { completionPercent: pct }, { merge: true });
  } catch (err) {
    console.error('[syncProjectCompletion]', err.message);
  }
}

// ── Task Derived Fields ──────────────────────────────────────────────────────
// Call after saving a task.

export async function syncTaskDerivedFields(taskId, taskData) {
  if (!taskId || !taskData) return;
  try {
    const overdueDays = taskData.status === 'completed'
      ? 0
      : calculateOverdueDays(taskData.targetDate);
    const status = deriveTaskStatus(taskData);
    const updates = {};
    if (taskData.overdueDays !== overdueDays) updates.overdueDays = overdueDays;
    if (taskData.status !== status) updates.status = status;
    if (Object.keys(updates).length > 0) {
      await setDoc(doc(db, 'tasks', taskId), updates, { merge: true });
    }
  } catch (err) {
    console.error('[syncTaskDerivedFields]', err.message);
  }
}

// ── Salary Derived Fields ──────────────────────────────────────────────────
// Call after saving a salary record.

export function calculateSalaryDerivedFields(d) {
  const totalAllowances = Number(d.hra || 0) + Number(d.travelAllowance || 0) + Number(d.otherAllowances || 0);
  const totalDeductions = Number(d.pfDeduction || 0) + Number(d.tdDeduction || 0) + Number(d.otherDeductions || 0);
  const grossSalary = Number(d.basicSalary || 0) + totalAllowances;
  const netSalary = grossSalary - totalDeductions;
  const lopDays = Math.max(0, Number(d.workingDays || 0) - Number(d.presentDays || 0));
  const finalSalary = Number(d.workingDays || 0) > 0
    ? Math.round(netSalary - (netSalary / Number(d.workingDays) * lopDays))
    : netSalary;
  return { totalAllowances, totalDeductions, grossSalary, netSalary, lopDays, finalSalary };
}


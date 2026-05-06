import { useEffect, useState, useCallback } from 'react';
import {
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import {
  deleteDocumentRef,
  getSalaryMonthDoc,
  getSalaryMonthsCollection,
  setDocument,
  updateDocumentRef,
} from '../lib/firestore-helpers';

export function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

// Fetch salary docs for all members in a given month.
// Uses individual listeners per member to avoid collectionGroup issues.
export function useSalaryForMonth(members, month) {
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecords({});

    const validMembers = (members || []).filter(Boolean);

    if (!month || validMembers.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const localData = {};
    let resolvedCount = 0;
    const total = validMembers.length;

    const unsubscribers = validMembers.map((member) => {
      const ref = getSalaryMonthDoc(db, member.id, month);
      return onSnapshot(
        ref,
        (snap) => {
          localData[member.id] = snap.exists() ? { id: snap.id, ...snap.data() } : null;
          resolvedCount += 1;
          setRecords((prev) => ({ ...prev, [member.id]: localData[member.id] }));
          if (resolvedCount >= total) setLoading(false);
        },
        (err) => {
          console.error(`Salary listener error for ${member.id}:`, err.message);
          localData[member.id] = null;
          resolvedCount += 1;
          setRecords((prev) => ({ ...prev, [member.id]: null }));
          if (resolvedCount >= total) setLoading(false);
        }
      );
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [members, month]);

  return { records, loading };
}

// Member salary history in real time.
export function useSalaryForMember(uid) {
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setSalaryHistory([]);
      setLoading(false);
      return;
    }

    const salaryQuery = query(getSalaryMonthsCollection(db, uid), orderBy('month', 'desc'));

    const unsubscribe = onSnapshot(
      salaryQuery,
      (snap) => {
        setSalaryHistory(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useSalaryForMember error:', err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { salaryHistory, loading };
}

// Salary write operations.
export function useSalaryActions() {
  const { log } = useAuditLog();

  const saveSalary = useCallback(async (uid, month, data) => {
    const netSalary = Number(data.netSalary) || 0;
    const ref = getSalaryMonthDoc(db, uid, month);

    await setDocument(
      ref,
      {
        uid,
        month,
        memberName: data.memberName || '',
        designation: data.designation || '',
        netSalary,
        status: data.status || 'pending',
        paidDate: data.paidDate ?? null,
        remarks: data.remarks || '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
      { action: 'save salary', collectionName: 'salary_months' },
    );

    await log('salary_saved', {
      memberUid: uid,
      month,
      memberName: data.memberName || '',
      netSalary,
    });
  }, [log]);

  const markPaid = useCallback(async (uid, month) => {
    const ref = getSalaryMonthDoc(db, uid, month);
    await updateDocumentRef(ref, {
      status: 'paid',
      paidDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { action: 'mark salary paid', collectionName: 'salary_months' });
    await log('salary_marked_paid', { memberUid: uid, month });
  }, [log]);

  const deleteSalary = useCallback(async (uid, month) => {
    await deleteDocumentRef(
      getSalaryMonthDoc(db, uid, month),
      { action: 'delete salary', collectionName: 'salary_months' },
    );
    await log('salary_deleted', { memberUid: uid, month });
  }, [log]);

  const bulkMarkPaid = useCallback(async (rows) => {
    await Promise.all(
      rows
        .filter((row) => row.status === 'pending')
        .map((row) =>
          updateDocumentRef(getSalaryMonthDoc(db, row.uid, row.month || row.id), {
            status: 'paid',
            paidDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { action: 'mark salary paid', collectionName: 'salary_months' })
        )
    );
    await log('salary_bulk_mark_paid', {
      count: rows.filter((row) => row.status === 'pending').length,
      months: Array.from(new Set(rows.map((row) => row.month || row.id))),
    });
  }, [log]);

  const initMonthForAllMembers = useCallback(async (members, month) => {
    await Promise.all(
      members.map((member) =>
        setDocument(
          getSalaryMonthDoc(db, member.id, month),
          {
            uid: member.id,
            month,
            memberName: member.name || '',
            designation: member.designation || '',
            netSalary: 0,
            status: 'pending',
            paidDate: null,
            remarks: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
          { action: 'initialize salary month', collectionName: 'salary_months' },
        )
      )
    );
    await log('salary_month_initialized', {
      month,
      memberCount: members.length,
    });
  }, [log]);

  return {
    saveSalary,
    markPaid,
    deleteSalary,
    bulkMarkPaid,
    initMonthForAllMembers,
  };
}

// Legacy compatibility wrapper.
export function useSalary(selectedUserId = null) {
  const { salaryHistory, loading } = useSalaryForMember(selectedUserId);
  const { saveSalary, markPaid } = useSalaryActions();

  const addSalary = (userId, monthYear, data) =>
    saveSalary(userId, monthYear, {
      ...data,
      netSalary: data.netSalary || data.baseSalary || data.basicSalary || 0,
      memberName: data.employeeName || data.memberName || '',
    });

  return { salaryHistory, loading, addSalary, markPaid };
}

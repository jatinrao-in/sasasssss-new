import { useEffect, useState, useCallback } from 'react';
import {
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getSalaryMonthDoc, getSalaryMonthsCollection } from '../lib/firestore-helpers';

// ─── Calculation Logic ────────────────────────────────────────────────────────
export function calcSalary(baseSalary, workingDays, presentDays) {
  const base = Number(baseSalary) || 0;
  const working = Number(workingDays) || 0;
  const present = Math.min(Number(presentDays) || 0, working);
  const perDayRate = working > 0 ? base / working : 0;
  const lopDays = Math.max(0, working - present);
  const lopDeduction = Math.round(perDayRate * lopDays);
  const netSalary = Math.max(0, Math.round(base - lopDeduction));
  return {
    perDayRate: Math.round(perDayRate),
    lopDays,
    lopDeduction,
    netSalary,
  };
}

export function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

// ─── Hook: useSalaryForMonth ──────────────────────────────────────────────────
// Fetches salary docs for all members in a given month.
// Uses individual onSnapshot listeners per member (avoids collectionGroup issues).
export function useSalaryForMonth(members, month) {
  const [records, setRecords] = useState({});   // { uid: salaryData | null }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always clean state when inputs change
    setRecords({});

    const validMembers = (members || []).filter(Boolean);

    if (!month || validMembers.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Track per-member data in a closure object
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
          // Update records on every change
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

    return () => unsubscribers.forEach((u) => u());
  }, [members, month]); // eslint-disable-line react-hooks/exhaustive-deps

  return { records, loading };
}

// ─── Hook: useSalaryForMember (member history — real-time) ───────────────────
export function useSalaryForMember(uid) {
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setSalaryHistory([]);
      setLoading(false);
      return;
    }

    const q = query(getSalaryMonthsCollection(db, uid), orderBy('month', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setSalaryHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('useSalaryForMember error:', err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { salaryHistory, loading };
}

// ─── Salary Write Operations ──────────────────────────────────────────────────
export function useSalaryActions() {
  const saveSalary = useCallback(async (uid, month, data) => {
    const calc = calcSalary(data.baseSalary, data.workingDays, data.presentDays);
    const ref = getSalaryMonthDoc(db, uid, month);

    await setDoc(
      ref,
      {
        uid,
        month,
        memberName: data.memberName || '',
        designation: data.designation || '',
        workingDays: Number(data.workingDays) || 26,
        presentDays: Number(data.presentDays) || 0,
        lopDays: calc.lopDays,
        baseSalary: Number(data.baseSalary) || 0,
        perDayRate: calc.perDayRate,
        lopDeduction: calc.lopDeduction,
        netSalary: calc.netSalary,
        status: data.status || 'pending',
        paidDate: data.paidDate ?? null,
        remarks: data.remarks || '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, []);

  const markPaid = useCallback(async (uid, month) => {
    const ref = getSalaryMonthDoc(db, uid, month);
    await updateDoc(ref, {
      status: 'paid',
      paidDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }, []);

  const bulkSetWorkingDays = useCallback(async (uids, month, workingDays) => {
    await Promise.all(
      uids.map((uid) =>
        setDoc(
          getSalaryMonthDoc(db, uid, month),
          { workingDays: Number(workingDays), updatedAt: serverTimestamp() },
          { merge: true }
        )
      )
    );
  }, []);

  const bulkMarkPaid = useCallback(async (rows) => {
    await Promise.all(
      rows
        .filter((r) => r.status === 'pending')
        .map((r) =>
          updateDoc(getSalaryMonthDoc(db, r.uid, r.month || r.id), {
            status: 'paid',
            paidDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        )
    );
  }, []);

  const initMonthForAllMembers = useCallback(async (members, month) => {
    await Promise.all(
      members.map((m) =>
        setDoc(
          getSalaryMonthDoc(db, m.id, month),
          {
            uid: m.id,
            month,
            memberName: m.name || '',
            designation: m.designation || '',
            workingDays: 26,
            presentDays: 26,
            lopDays: 0,
            baseSalary: 0,
            perDayRate: 0,
            lopDeduction: 0,
            netSalary: 0,
            status: 'pending',
            paidDate: null,
            remarks: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      )
    );
  }, []);

  return {
    saveSalary,
    markPaid,
    bulkSetWorkingDays,
    bulkMarkPaid,
    initMonthForAllMembers,
  };
}

// ─── Legacy compat ────────────────────────────────────────────────────────────
export function useSalary(selectedUserId = null) {
  const { salaryHistory, loading } = useSalaryForMember(selectedUserId);
  const { saveSalary, markPaid } = useSalaryActions();

  const addSalary = (userId, monthYear, data) =>
    saveSalary(userId, monthYear, {
      ...data,
      baseSalary: data.basicSalary || data.baseSalary || 0,
      memberName: data.employeeName || data.memberName || '',
    });

  return { salaryHistory, loading, addSalary, markPaid };
}

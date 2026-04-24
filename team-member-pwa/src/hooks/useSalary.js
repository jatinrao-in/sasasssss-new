import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function calcSalary(baseSalary, workingDays, presentDays) {
  const base = Number(baseSalary) || 0;
  const working = Number(workingDays) || 0;
  const present = Math.min(Number(presentDays) || 0, working);
  const perDayRate = working > 0 ? base / working : 0;
  const lopDays = Math.max(0, working - present);
  const lopDeduction = Math.round(perDayRate * lopDays);
  const netSalary = Math.max(0, Math.round(base - lopDeduction));
  return { perDayRate: Math.round(perDayRate), lopDays, lopDeduction, netSalary };
}

export function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
}

// Real-time listener for a single member's salary history
export function useMemberSalary(uid) {
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    const q = query(
      collection(db, 'salary', uid, 'months'),
      orderBy('month', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setSalaryHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [uid]);

  return { salaryHistory, loading };
}

// Real-time listener for a specific month
export function useMemberSalaryMonth(uid, month) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !month) { setLoading(false); return; }

    const ref = doc(db, 'salary', uid, 'months', month);
    const unsub = onSnapshot(ref, (snap) => {
      setRecord(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [uid, month]);

  return { record, loading };
}

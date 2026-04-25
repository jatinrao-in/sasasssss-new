import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';

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
    month: 'long',
    year: 'numeric',
  });
}

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function useMemberSalary(uid) {
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setSalaryHistory([]);
      setLoading(false);
      return undefined;
    }

    const ref = query(
      collection(db, 'salary', uid, 'months'),
      orderBy('month', 'desc'),
    );

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setSalaryHistory(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsubscribe();
  }, [uid]);

  return { salaryHistory, loading };
}

export function useMemberSalaryMonth(uid, month) {
  const realtime = useRealtime();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentMonth = currentMonthKey();

  useEffect(() => {
    if (!uid || !month) {
      setRecord(null);
      setLoading(false);
      return undefined;
    }

    if (realtime && month === currentMonth) {
      setRecord(realtime.currentSalary || null);
      setLoading(Boolean(realtime.loading?.currentSalary));
      return undefined;
    }

    const ref = doc(db, 'salary', uid, 'months', month);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setRecord(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsubscribe();
  }, [currentMonth, month, realtime, uid]);

  return { record, loading };
}

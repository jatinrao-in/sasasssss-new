import { useAuth } from './useAuth';
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';
import {
  logDocSnapshot,
  logError,
  logFetch,
  logInfo,
  logSkip,
  logSnapshot,
} from '../lib/firestoreDebug';

export function calcSalary(baseSalary, workingDays, presentDays, overtimePayment) {
  const base = Number(baseSalary) || 0;
  const working = Number(workingDays) || 0;
  const present = Math.min(Number(presentDays) || 0, working);
  const ot = Number(overtimePayment) || 0;
  const perDayRate = working > 0 ? base / working : 0;
  const lopDays = Math.max(0, working - present);
  const lopDeduction = Math.round(perDayRate * lopDays);
  const netSalary = Math.max(0, Math.round(base - lopDeduction) + ot);
  return { perDayRate: Math.round(perDayRate), lopDays, lopDeduction, netSalary, overtimePayment: ot };
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
      logSkip('useMemberSalary');
      setSalaryHistory([]);
      setLoading(false);
      return undefined;
    }

    logFetch('useMemberSalary', uid);

    const ref = query(
      collection(db, 'salary', uid, 'months'),
      orderBy('month', 'desc'),
    );

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        logSnapshot('useMemberSalary', snapshot);
        setSalaryHistory(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
        setLoading(false);
      },
      (error) => {
        logError('useMemberSalary', error);
        setLoading(false);
      },
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
      logSkip('useMemberSalaryMonth');
      setRecord(null);
      setLoading(false);
      return undefined;
    }

    if (realtime && month === currentMonth) {
      logInfo(
        'useMemberSalaryMonth',
        'Using realtime salary record:',
        realtime.currentSalary ? 1 : 0,
        'documents',
      );
      setRecord(realtime.currentSalary || null);
      setLoading(Boolean(realtime.loading?.currentSalary));
      return undefined;
    }

    logFetch('useMemberSalaryMonth', uid, { month });

    const ref = doc(db, 'salary', uid, 'months', month);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        logDocSnapshot('useMemberSalaryMonth', snapshot);
        setRecord(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        setLoading(false);
      },
      (error) => {
        logError('useMemberSalaryMonth', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentMonth, month, realtime, uid]);

  return { record, loading };
}

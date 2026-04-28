import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, ShieldAlert, Wrench } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { db } from '../lib/firebase';
import { COLLECTIONS, timestampToDate } from '../lib/firestore-helpers';
import {
  MAINTENANCE_PASSCODE,
  getMaintenanceColor,
  getMaintenanceMetrics,
} from '../lib/systemConfig';

function formatDateLabel(value) {
  const parsedDate = timestampToDate(value);
  if (!parsedDate) {
    return 'Not recorded';
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MaintenanceAlert({ enabled = true }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [shouldRepeat, setShouldRepeat] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const maintenanceRef = doc(db, COLLECTIONS.settings, 'maintenance');
    const unsubscribe = onSnapshot(
      maintenanceRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setMaintenanceData(null);
          setShouldRepeat(true);
          setShow(true);
          return;
        }

        const nextData = snapshot.data();
        const metrics = getMaintenanceMetrics(nextData.lastMaintenanceDate?.toDate?.() || nextData.lastMaintenanceDate);
        setMaintenanceData(nextData);
        setShouldRepeat(metrics.isDue);
        setShow(metrics.isDue);

        if (!metrics.isDue) {
          setPasscode('');
        }
      },
      (error) => {
        console.error('Maintenance alert listener failed:', error);
      },
    );

    return () => unsubscribe();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !shouldRepeat) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setShow(true);
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [enabled, shouldRepeat]);

  const metrics = useMemo(() => getMaintenanceMetrics(
    maintenanceData?.lastMaintenanceDate?.toDate?.() || maintenanceData?.lastMaintenanceDate,
  ), [maintenanceData]);

  if (!enabled || !show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl rounded-[28px] border-2 p-7 shadow-2xl"
        style={{
          background: 'var(--bg-card)',
          borderColor: '#DC2626',
        }}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">Urgent Attention</p>
          <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Maintenance Required!</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Software maintenance is overdue. This may cause performance issues or crashes.
          </p>
          <p className="mt-2 text-sm font-semibold text-red-600">
            Please contact your administrator to perform maintenance immediately.
          </p>
        </div>

        <div
          className="mt-6 grid gap-4 rounded-2xl border p-4 md:grid-cols-2"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Clock3 className="h-4 w-4 text-teal-600" />
              Last Maintenance
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {formatDateLabel(maintenanceData?.lastMaintenanceDate)}
            </p>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <Wrench className="h-4 w-4 text-teal-600" />
              Status
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {metrics.overdueDays > 0
                ? `Overdue by ${metrics.overdueDays} day${metrics.overdueDays === 1 ? '' : 's'}`
                : 'Maintenance is overdue now'}
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/70">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${metrics.percent}%`,
                  background: getMaintenanceColor(metrics.percent),
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Enter passcode to dismiss
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border-primary)' }}>
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="____"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-28 border-0 bg-transparent text-center text-2xl font-semibold tracking-[0.5em] outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => {
              if (passcode !== MAINTENANCE_PASSCODE) {
                toast.error('Wrong passcode');
                return;
              }

              setPasscode('');
              setShow(false);
              navigate('/settings/maintenance');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <Wrench className="h-4 w-4" />
            Update Maintenance
          </button>

          <button
            type="button"
            onClick={() => setShow(false)}
            className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            Close
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          This alert will reappear every 20 seconds until maintenance is updated.
        </p>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import {
  Wallet, Check, Edit2, X, Save, Users,
  AlertTriangle, ChevronDown, RefreshCw,
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTeam } from '../hooks/useTeam';
import {
  useSalaryForMonth,
  useSalaryActions,
  calcSalary,
  formatMonthLabel,
} from '../hooks/useSalary';
import { useToast } from '../hooks/useToast';
import { formatCurrency, getInitials } from '../lib/formatters';
import { notify } from '../lib/notify';
import { formatMonth } from '../lib/helpers';

// Month options (next + last 12)
function getMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = -1; i <= 11; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    opts.push({ val, label });
  }
  return opts;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Skeleton
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="table-cell">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="space-y-1">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-2 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      </td>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="table-cell">
          <div className="h-4 bg-gray-200 rounded w-full" />
        </td>
      ))}
      <td className="table-cell">
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </td>
    </tr>
  );
}

// Edit modal
function EditModal({ row, month, onClose, onSave }) {
  const [form, setForm] = useState({
    workingDays: row?.workingDays ?? 26,
    presentDays: row?.presentDays ?? 26,
    baseSalary: row?.baseSalary ?? 0,
    remarks: row?.remarks ?? '',
  });
  const [saving, setSaving] = useState(false);

  const calc = calcSalary(form.baseSalary, form.workingDays, form.presentDays);
  const presentExceedsWorking = Number(form.presentDays) > Number(form.workingDays);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (presentExceedsWorking) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Edit Salary - {row?.memberName}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatMonthLabel(month)}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Working Days</label>
              <input
                className="input-field"
                type="number" min="1" max="31"
                value={form.workingDays}
                onChange={(e) => set('workingDays', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Present Days</label>
              <input
                className={`input-field ${presentExceedsWorking ? 'border-red-400 focus:ring-red-400' : ''}`}
                type="number" min="0" max={form.workingDays}
                value={form.presentDays}
                onChange={(e) => set('presentDays', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Base Salary (Rs)</label>
              <input
                className="input-field"
                type="number" min="0"
                value={form.baseSalary}
                onChange={(e) => set('baseSalary', e.target.value)}
              />
            </div>
          </div>

          {presentExceedsWorking && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Present days cannot exceed working days
            </p>
          )}

          {/* Auto-calculated preview */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm border border-[var(--border-primary)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Auto Calculated
            </p>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Per Day Rate</span>
              <span className="font-medium text-[var(--text-primary)]">{formatCurrency(calc.perDayRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">LOP Days</span>
              <span className={`font-medium ${calc.lopDays > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                {calc.lopDays} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">LOP Deduction</span>
              <span className="font-medium text-red-500">
                {calc.lopDeduction > 0 ? `-${formatCurrency(calc.lopDeduction)}` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-[var(--border-primary)] pt-2.5">
              <span className="font-semibold text-[var(--text-primary)]">Net Salary</span>
              <span className="text-2xl font-bold text-teal-600">{formatCurrency(calc.netSalary)}</span>
            </div>
          </div>

          <div>
            <label className="label">Remarks (optional)</label>
            <input
              className="input-field"
              type="text"
              placeholder="Any notes..."
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border-primary)]">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || presentExceedsWorking}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Summary cards
function SummaryCards({ rows, loading }) {
  const withData = rows.filter((r) => r.hasData);
  const total = withData.reduce((s, r) => s + (r.netSalary || 0), 0);
  const paid = withData.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.netSalary || 0), 0);
  const pending = total - paid;

  const cards = [
    { label: 'Total Payroll', value: total, textColor: 'text-[var(--text-primary)]', bg: '' },
    { label: 'Paid', value: paid, textColor: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending', value: pending, textColor: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`${c.bg || 'bg-[var(--bg-card)]'} rounded-xl px-4 py-3 border border-[var(--border-primary)]`}
        >
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-6 w-28 bg-gray-200 rounded" />
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--text-muted)]">{c.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${c.textColor}`}>{formatCurrency(c.value)}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {c.label === 'Total Payroll'
                  ? `${withData.length} processed`
                  : c.label === 'Paid'
                  ? `${withData.filter((r) => r.status === 'paid').length} employees`
                  : `${withData.filter((r) => r.status !== 'paid').length} employees`}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// Main page
export default function SalaryPage() {
  const toast = useToast();
  const { members, loading: teamLoading } = useTeam();
  const [month, setMonth] = useState(currentMonth);
  const [editRow, setEditRow] = useState(null);
  const [bulkDays, setBulkDays] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const teamMembers = useMemo(() => members.filter((m) => m.role === 'member'), [members]);

  // Fetch salary data with individual listeners per member.
  const { records, loading: salaryLoading } = useSalaryForMonth(teamMembers, month);
  const { saveSalary, markPaid, bulkSetWorkingDays, bulkMarkPaid, initMonthForAllMembers } =
    useSalaryActions();

  const loading = teamLoading || salaryLoading;

  // Merge member list with their salary data
  const rows = useMemo(() => {
    return teamMembers.map((m) => {
      const rec = records[m.id];
      const base = rec?.baseSalary ?? 0;
      const working = rec?.workingDays ?? 26;
      const present = rec?.presentDays ?? 26;
      const calc = calcSalary(base, working, present);
      return {
        uid: m.id,
        memberName: m.name || '',
        designation: m.designation || '',
        month,
        workingDays: rec?.workingDays ?? 26,
        presentDays: rec?.presentDays ?? 26,
        baseSalary: base,
        status: rec?.status ?? 'pending',
        paidDate: rec?.paidDate ?? null,
        remarks: rec?.remarks ?? '',
        perDayRate: rec?.perDayRate ?? calc.perDayRate,
        lopDays: rec?.lopDays ?? calc.lopDays,
        lopDeduction: rec?.lopDeduction ?? calc.lopDeduction,
        netSalary: rec?.netSalary ?? calc.netSalary,
        hasData: !!rec,
      };
    });
  }, [teamMembers, records, month]);

  // Save salary for one member.
  const handleSaveRow = useCallback(
    async (uid, form) => {
      const row = rows.find((r) => r.uid === uid);
      try {
        await saveSalary(uid, month, {
          memberName: row?.memberName || '',
          designation: row?.designation || '',
          ...form,
        });
        toast.success('Salary saved!');
      } catch (e) {
        console.error('Save salary error:', e);
        toast.error('Failed to save: ' + e.message);
      }
    },
    [rows, month, saveSalary, toast]
  );

    // Mark one member as paid.
  const handleMarkPaid = useCallback(
    async (row) => {
      if (!row.hasData) {
        toast.error('Please save salary data first');
        return;
      }
      setProcessing(true);
      try {
        await markPaid(row.uid, month);

        // Send in-app notification
        try {
          await addDoc(collection(db, 'notifications', row.uid, 'items'), {
            message: `Your salary of ${formatCurrency(row.netSalary)} for ${formatMonthLabel(month)} has been processed.`,
            type: 'salary',
            relatedId: month,
            read: false,
            createdAt: serverTimestamp(),
          });
          
          const member = teamMembers.find(m => m.id === row.uid);
          if (member?.whatsapp) {
            notify('salary_paid', {
              memberUid: row.uid,
              whatsappNumber: member.whatsapp,
              memberName: row.memberName,
              month: formatMonthLabel(month),
              workingDays: row.workingDays ?? '-',
              presentDays: row.presentDays ?? '-',
              lopDays: row.lopDays ?? 0,
              baseSalary: row.baseSalary?.toLocaleString('en-IN') ?? '-',
              lopDeduction: row.lopDeduction?.toLocaleString('en-IN') ?? '0',
              netSalary: row.netSalary?.toLocaleString('en-IN') ?? '-',
              paidDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            });
          }
        } catch (notifErr) {
          console.warn('Notification failed (non-fatal):', notifErr.message);
        }

        toast.success(`Marked paid for ${row.memberName}`);
      } catch (e) {
        console.error('Mark paid error:', e);
        toast.error('Failed: ' + e.message);
      } finally {
        setProcessing(false);
      }
    },
    [month, markPaid, toast]
  );

  // Initialize payroll for all members.
  const handleProcessPayroll = useCallback(async () => {
    if (!teamMembers.length) {
      toast.error('No team members found');
      return;
    }
    setProcessing(true);
    try {
      await initMonthForAllMembers(teamMembers, month);
      toast.success(`Payroll initialized for ${formatMonthLabel(month)}`);
    } catch (e) {
      console.error('Process payroll error:', e);
      toast.error('Failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [teamMembers, month, initMonthForAllMembers, toast]);

  // Bulk: set working days.
  const handleBulkWorkingDays = useCallback(async () => {
    const days = Number(bulkDays);
    if (!days || days < 1 || days > 31) {
      toast.error('Enter valid days (1-31)');
      return;
    }
    setProcessing(true);
    try {
      await bulkSetWorkingDays(teamMembers.map((m) => m.id), month, days);
      toast.success(`Working days set to ${days} for all members`);
      setShowBulkInput(false);
      setBulkDays('');
    } catch (e) {
      console.error('Bulk working days error:', e);
      toast.error('Failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [bulkDays, teamMembers, month, bulkSetWorkingDays, toast]);

  // Bulk: mark all paid.
  const handleBulkMarkPaid = useCallback(async () => {
    const pending = rows.filter((r) => r.status === 'pending' && r.hasData);
    if (!pending.length) {
      toast.error('No pending salaries with saved data');
      return;
    }
    if (!window.confirm(`Mark ${pending.length} salaries as paid?`)) return;
    setProcessing(true);
    try {
      await bulkMarkPaid(pending);

      // Notify all
      await Promise.allSettled(
        pending.map((r) =>
          addDoc(collection(db, 'notifications', r.uid, 'items'), {
            message: `Your salary of ${formatCurrency(r.netSalary)} for ${formatMonthLabel(month)} has been processed.`,
            type: 'salary',
            relatedId: month,
            read: false,
            createdAt: serverTimestamp(),
          })
        )
      );
      
      // WhatsApp notifications for bulk
      await Promise.allSettled(
        pending.map(r => {
          const member = teamMembers.find(m => m.id === r.uid);
          if (member?.whatsapp) {
            return notify('salary_paid', {
              memberUid: r.uid,
              whatsappNumber: member.whatsapp,
              memberName: r.memberName,
              month: formatMonthLabel(month),
              workingDays: r.workingDays ?? '-',
              presentDays: r.presentDays ?? '-',
              lopDays: r.lopDays ?? 0,
              baseSalary: r.baseSalary?.toLocaleString('en-IN') ?? '-',
              lopDeduction: r.lopDeduction?.toLocaleString('en-IN') ?? '0',
              netSalary: r.netSalary?.toLocaleString('en-IN') ?? '-',
              paidDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            });
          }
          return Promise.resolve();
        })
      );

      toast.success(`Marked ${pending.length} salaries as paid!`);
    } catch (e) {
      console.error('Bulk mark paid error:', e);
      toast.error('Failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [rows, month, bulkMarkPaid, toast]);

  const hasAnyData = rows.some((r) => r.hasData);

  return (
    <div className="space-y-5 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Salary Management</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {teamMembers.length} employees | {formatMonthLabel(month)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month selector */}
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer"
            >
              {getMonthOptions().map((o) => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={handleProcessPayroll}
            disabled={processing || teamLoading}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Process Payroll
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards rows={rows} loading={loading} />

      {/* Bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowBulkInput((v) => !v)}
          className="btn-secondary text-xs flex items-center gap-1"
        >
          <Users className="w-3.5 h-3.5" /> Set Working Days for All
        </button>

        {showBulkInput && (
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" max="31" placeholder="Days (e.g. 26)"
              value={bulkDays}
              onChange={(e) => setBulkDays(e.target.value)}
              className="input-field w-24 text-sm py-1.5"
            />
            <button onClick={handleBulkWorkingDays} disabled={processing} className="btn-primary text-xs py-1.5 px-3">
              Apply
            </button>
            <button
              onClick={() => { setShowBulkInput(false); setBulkDays(''); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}

        <button
          onClick={handleBulkMarkPaid}
          disabled={processing}
          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors disabled:opacity-60"
        >
          <Check className="w-3.5 h-3.5" /> Mark All as Paid
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-[var(--border-primary)]">
                <th className="table-header text-left min-w-[160px]">Employee</th>
                <th className="table-header text-center">Working Days</th>
                <th className="table-header text-center">Present Days</th>
                <th className="table-header text-center">LOP Days</th>
                <th className="table-header text-right">Base Salary</th>
                <th className="table-header text-right">Per Day</th>
                <th className="table-header text-right text-red-500">LOP Deduction</th>
                <th className="table-header text-right text-teal-700">Net Salary</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Team</div>
                    <p className="font-medium text-[var(--text-primary)]">No team members added yet</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Add members from Team page.</p>
                  </td>
                </tr>
              ) : !hasAnyData ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Payroll</div>
                    <p className="font-semibold text-[var(--text-primary)] text-base">No salary data for this month.</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1.5">Click "Process Payroll" to initialize records for all members.</p>
                    <button
                      onClick={handleProcessPayroll}
                      disabled={processing}
                      className="btn-primary mt-4 text-sm"
                    >
                      <Wallet className="w-4 h-4" /> Initialize Payroll
                    </button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.uid}
                    className={`hover:bg-gray-50/50 transition-colors border-b border-[var(--border-primary)] last:border-0 ${
                      !row.hasData ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Employee */}
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {getInitials(row.memberName)}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)] text-xs leading-tight">{row.memberName}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{row.designation || 'Member'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="table-cell text-center text-[var(--text-primary)]">{row.workingDays}</td>
                    <td className="table-cell text-center text-[var(--text-primary)]">{row.presentDays}</td>

                    <td className="table-cell text-center">
                      <span className={row.lopDays > 0 ? 'text-orange-500 font-semibold' : 'text-gray-400'}>
                        {row.lopDays}
                      </span>
                    </td>

                    <td className="table-cell text-right text-[var(--text-primary)]">
                      {formatCurrency(row.baseSalary)}
                    </td>

                    <td className="table-cell text-right text-[var(--text-muted)] text-xs">
                      {formatCurrency(row.perDayRate)}
                    </td>

                    <td className="table-cell text-right text-red-500 font-medium">
                      {row.lopDeduction > 0 ? `-${formatCurrency(row.lopDeduction)}` : '-'}
                    </td>

                    <td className="table-cell text-right font-bold text-teal-700">
                      {formatCurrency(row.netSalary)}
                    </td>

                    <td className="table-cell text-center">
                      {row.hasData ? (
                        <span className={`badge ${row.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                          {row.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>

                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditRow(row)}
                          className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        {row.hasData && row.status === 'pending' && (
                          <button
                            onClick={() => handleMarkPaid(row)}
                            disabled={processing}
                            className="text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" /> Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editRow && (
        <EditModal
          row={editRow}
          month={month}
          onClose={() => setEditRow(null)}
          onSave={(form) => handleSaveRow(editRow.uid, form)}
        />
      )}
    </div>
  );
}



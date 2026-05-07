import { useState, useMemo, useCallback } from 'react';
import {
  Wallet, Check, Edit2, X, Save, Users,
  AlertTriangle, ChevronDown, RefreshCw,
} from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTeam } from '../hooks/useTeam';
import {
  useSalaryForMonth,
  useSalaryActions,
  formatMonthLabel,
} from '../hooks/useSalary';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatCurrency, getInitials } from '../lib/formatters';
import { addDocumentToCollection, getNotificationItemsCollection } from '../lib/firestore-helpers';
import { notifySalaryPaid } from '../lib/notify';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';

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
    basicSalary: row?.basicSalary ?? 0,
    workingDays: row?.workingDays ?? 0,
    presentDays: row?.presentDays ?? 0,
    overtime: row?.overtime ?? 0,
    allowances: row?.allowances ?? 0,
    remarks: row?.remarks ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const netSalary = (Number(form.basicSalary) || 0) + (Number(form.overtime) || 0) + (Number(form.allowances) || 0);

  const handleSave = async () => {
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Working Days</label>
                <input
                  className="input-field"
                  type="number" min="0" step="0.5"
                  value={form.workingDays}
                  onChange={(e) => set('workingDays', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Present Days</label>
                <input
                  className="input-field"
                  type="number" min="0" step="0.5"
                  value={form.presentDays}
                  onChange={(e) => set('presentDays', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Basic Salary</label>
                <input
                  className="input-field"
                  type="number" min="0"
                  value={form.basicSalary}
                  onChange={(e) => set('basicSalary', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Overtime</label>
                <input
                  className="input-field"
                  type="number" min="0"
                  value={form.overtime}
                  onChange={(e) => set('overtime', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Allowances</label>
                <input
                  className="input-field"
                  type="number" min="0"
                  value={form.allowances}
                  onChange={(e) => set('allowances', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Net Salary</label>
                <input
                  className="input-field bg-gray-50 text-teal-700 font-bold"
                  type="number"
                  value={netSalary}
                  disabled
                />
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
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border-primary)]">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
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
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { members, loading: teamLoading } = useTeam();
  const [month, setMonth] = useState(currentMonth);
  const [editRow, setEditRow] = useState(null);
  const [processing, setProcessing] = useState(false);

  const teamMembers = useMemo(() => members.filter((m) => m.role === 'member'), [members]);

  // Fetch salary data with individual listeners per member.
  const { records, loading: salaryLoading } = useSalaryForMonth(teamMembers, month);
  const { saveSalary, markPaid, deleteSalary, bulkMarkPaid, initMonthForAllMembers } =
    useSalaryActions();

  const loading = teamLoading || salaryLoading;

  // Merge member list with their salary data
  const rows = useMemo(() => {
    return teamMembers.map((m) => {
      const rec = records[m.id];
      const net = rec?.netSalary ?? 0;
      return {
        uid: m.id,
        memberName: m.name || '',
        designation: m.designation || '',
        month,
        status: rec?.status ?? 'pending',
        paidDate: rec?.paidDate ?? null,
        remarks: rec?.remarks ?? '',
        basicSalary: rec?.basicSalary ?? 0,
        workingDays: rec?.workingDays ?? 0,
        presentDays: rec?.presentDays ?? 0,
        overtime: rec?.overtime ?? 0,
        allowances: rec?.allowances ?? 0,
        netSalary: net,
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

  const handleDeleteSalary = useCallback(
    (row) => {
      confirmDelete({
        title: 'Delete Salary Record',
        description: `Delete salary record for ${formatMonthLabel(month)}?`,
        onConfirm: async () => {
          await deleteSalary(row.uid, month);
          toast.success('Salary record deleted');
        },
      });
    },
    [confirmDelete, deleteSalary, month, toast]
  );

    // Mark one member as paid.
  const handleMarkPaid = useCallback(
    async (row) => {
      if (!row.hasData) {
        toast.error('Please save salary data first');
        return;
      }
      if (!row.netSalary || Number(row.netSalary) <= 0) {
        toast.error('Invalid salary amount. Please enter correct salary.');
        return;
      }
      if (row.status === 'paid') {
        toast.error('Salary already marked as paid');
        return;
      }
      setProcessing(true);
      try {
        await markPaid(row.uid, month);

        try {
          await addDocumentToCollection(getNotificationItemsCollection(db, row.uid), {
            message: `Your salary of ${formatCurrency(row.netSalary)} for ${formatMonthLabel(month)} has been processed.`,
            type: 'salary',
            relatedId: month,
            read: false,
            createdAt: serverTimestamp(),
          }, { action: 'save salary notification', collectionName: 'notification_items' });

          const member = teamMembers.find(m => m.id === row.uid);
          if (member) {
            await notifySalaryPaid(member, { ...row, status: 'paid' }, formatMonthLabel(month));
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

  // Bulk: mark all paid.
  const handleBulkMarkPaid = useCallback(async () => {
    const pending = rows.filter((r) => r.status === 'pending' && r.hasData && Number(r.netSalary) > 0);
    if (!pending.length) {
      toast.error('No pending salaries with valid saved data');
      return;
    }
    if (!window.confirm(`Mark ${pending.length} salaries as paid?`)) return;
    setProcessing(true);
    try {
      await bulkMarkPaid(pending);

      await Promise.allSettled(
        pending.map((r) =>
          addDocumentToCollection(getNotificationItemsCollection(db, r.uid), {
            message: `Your salary of ${formatCurrency(r.netSalary)} for ${formatMonthLabel(month)} has been processed.`,
            type: 'salary',
            relatedId: month,
            read: false,
            createdAt: serverTimestamp(),
          }, { action: 'save salary notification', collectionName: 'notification_items' })
        )
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
                <th className="table-header text-center">Days (W/P)</th>
                <th className="table-header text-right">Basic</th>
                <th className="table-header text-right">Overtime</th>
                <th className="table-header text-right">Allowances</th>
                <th className="table-header text-right">Net Salary</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Paid Date</th>
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

                    <td className="table-cell text-center">
                      <div className="text-xs">
                        <span className="text-gray-500">W:</span> {row.workingDays} <span className="text-gray-300">|</span> <span className="text-gray-500">P:</span> {row.presentDays}
                      </div>
                    </td>

                    <td className="table-cell text-right text-gray-700">
                      {formatCurrency(row.basicSalary)}
                    </td>

                    <td className="table-cell text-right text-gray-700">
                      {formatCurrency(row.overtime)}
                    </td>

                    <td className="table-cell text-right text-gray-700">
                      {formatCurrency(row.allowances)}
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

                    <td className="table-cell text-center text-[var(--text-muted)] text-xs">
                      {row.status === 'paid' && row.paidDate
                        ? new Date(row.paidDate.toDate ? row.paidDate.toDate() : row.paidDate).toLocaleDateString('en-IN')
                        : '-'}
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
                            <Check className="w-3 h-3" /> Mark as Paid
                          </button>
                        )}
                        {row.hasData && (
                          <DeleteButton onClick={() => handleDeleteSalary(row)} />
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
      <DeleteConfirmDialog
        isOpen={deleteState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={deleteState.title}
        description={deleteState.description}
        isDeleting={deleteState.isDeleting}
      />
    </div>
  );
}



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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-[-0.01em]">
                Edit Salary - {row?.memberName}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-[#64748B] font-semibold uppercase tracking-[0.02em] mt-0.5">{formatMonthLabel(month)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-4 font-sans text-xs sm:text-[13px] font-medium text-[#0F172A]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Working Days</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="number" min="0" step="0.5"
                value={form.workingDays}
                onChange={(e) => set('workingDays', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Present Days</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="number" min="0" step="0.5"
                value={form.presentDays}
                onChange={(e) => set('presentDays', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Basic Salary</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="number" min="0"
                value={form.basicSalary}
                onChange={(e) => set('basicSalary', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Overtime</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="number" min="0"
                value={form.overtime}
                onChange={(e) => set('overtime', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Allowances</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="number" min="0"
                value={form.allowances}
                onChange={(e) => set('allowances', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Net Salary</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-emerald-100 focus:outline-none text-xs sm:text-[13px] bg-emerald-50/70 text-emerald-700 font-bold"
                type="number"
                value={netSalary}
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-[#64748B] mb-1.5 font-sans">Remarks (optional)</label>
            <input
              className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
              type="text"
              placeholder="Any notes..."
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
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
    { label: 'Total Payroll', value: total, icon: Wallet, iconBg: 'bg-blue-50/70', iconColor: 'text-blue-600', border: 'border-l-blue-400', desc: `${withData.length} processed` },
    { label: 'Paid', value: paid, icon: Check, iconBg: 'bg-emerald-50/70', iconColor: 'text-emerald-600', border: 'border-l-emerald-400', desc: `${withData.filter((r) => r.status === 'paid').length} employees` },
    { label: 'Pending', value: pending, icon: AlertTriangle, iconBg: 'bg-amber-50/70', iconColor: 'text-amber-600', border: 'border-l-amber-400', desc: `${withData.filter((r) => r.status !== 'paid').length} employees` },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm flex items-center gap-3 border-l-4 ${c.border}`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
              <Icon className={`h-5 w-5 ${c.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[12px] font-semibold text-[#64748B] uppercase tracking-[0.08em] truncate">{c.label}</p>
              <p className="text-xl sm:text-[22px] font-bold text-[#0F172A] mt-0.5 [font-variant-numeric:tabular-nums]">
                {formatCurrency(c.value)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{c.desc}</p>
            </div>
          </div>
        );
      })}
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
    const membersToInit = teamMembers.filter((m) => !records[m.id]);
    if (membersToInit.length === 0) {
      toast.info('All team members are already initialized for this month');
      return;
    }
    setProcessing(true);
    try {
      await initMonthForAllMembers(membersToInit, month);
      toast.success(`Payroll initialized for ${membersToInit.length} member(s)`);
    } catch (e) {
      console.error('Process payroll error:', e);
      toast.error('Failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  }, [teamMembers, records, month, initMonthForAllMembers, toast]);

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
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F172A] tracking-[-0.02em] leading-tight">Salary Management</h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1 font-medium">
            {teamMembers.length} employees | {formatMonthLabel(month)}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month selector */}
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-650 focus:ring-1 focus:ring-blue-655 text-xs sm:text-[13px] font-semibold text-[#0F172A] bg-white cursor-pointer appearance-none shadow-sm"
            >
              {getMonthOptions().map((o) => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={handleProcessPayroll}
            disabled={processing || loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-705 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
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
          type="button"
          onClick={handleBulkMarkPaid}
          disabled={processing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" /> Mark All as Paid
        </button>
      </div>

      {/* Table */}
      {/* Desktop View */}
      <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left font-sans min-w-[900px]">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Days (W/P)</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Basic</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Overtime</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Allowances</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Net Salary</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Paid Date</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Team</div>
                    <p className="font-semibold text-[#0F172A]">No team members added yet</p>
                    <p className="text-xs text-[#64748B] mt-1 font-medium">Add members from Team page.</p>
                  </td>
                </tr>
              ) : !hasAnyData ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Payroll</div>
                    <p className="font-semibold text-[#0F172A] text-base">No salary data for this month.</p>
                    <p className="text-xs text-[#64748B] mt-1.5 font-medium">Click "Process Payroll" to initialize records for all members.</p>
                    <button
                      type="button"
                      onClick={handleProcessPayroll}
                      disabled={processing}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-[13px] font-semibold shadow-sm flex items-center gap-1.5 mx-auto transition-colors"
                    >
                      <Wallet className="w-4 h-4" /> Initialize Payroll
                    </button>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.uid}
                    className={`hover:bg-slate-50/50 transition-colors border-b border-[#E2E8F0] last:border-0 ${
                      !row.hasData ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Employee */}
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {getInitials(row.memberName)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0F172A] text-xs leading-tight">{row.memberName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{row.designation || 'Member'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-center text-xs font-medium text-[#0F172A]">
                      <div>
                        <span className="text-slate-400">W:</span> {row.workingDays} <span className="text-slate-200 px-1">|</span> <span className="text-slate-400">P:</span> {row.presentDays}
                      </div>
                    </td>

                    <td className="p-4 text-right text-xs font-semibold text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatCurrency(row.basicSalary)}
                    </td>

                    <td className="p-4 text-right text-xs font-semibold text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatCurrency(row.overtime)}
                    </td>

                    <td className="p-4 text-right text-xs font-semibold text-slate-700 [font-variant-numeric:tabular-nums]">
                      {formatCurrency(row.allowances)}
                    </td>

                    <td className="p-4 text-right text-xs font-bold text-teal-700 [font-variant-numeric:tabular-nums]">
                      {formatCurrency(row.netSalary)}
                    </td>

                    <td className="p-4 text-center text-xs">
                      {row.hasData ? (
                        <span className={`badge ${row.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                          {row.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    <td className="p-4 text-center text-slate-500 text-xs font-medium">
                      {row.status === 'paid' && row.paidDate
                        ? new Date(row.paidDate.toDate ? row.paidDate.toDate() : row.paidDate).toLocaleDateString('en-IN')
                        : '-'}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditRow(row)}
                          className="text-xs text-blue-650 hover:bg-blue-50 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        {row.hasData && row.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(row)}
                            disabled={processing}
                            className="text-xs text-green-600 hover:bg-green-50 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
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

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200" />
                  <div className="h-4 bg-slate-200 rounded w-24" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-8 text-center text-slate-500 font-medium text-xs">
            No team members added yet. Add members from Team page.
          </div>
        ) : !hasAnyData ? (
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-8 text-center text-[#0F172A]">
            <p className="font-semibold text-sm">No salary data for this month.</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Click "Process Payroll" to initialize records.</p>
            <button
              type="button"
              onClick={handleProcessPayroll}
              disabled={processing}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-[13px] font-semibold shadow-sm flex items-center gap-1.5 mx-auto transition-colors"
            >
              <Wallet className="w-4 h-4" /> Initialize Payroll
            </button>
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.uid} className={`bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3 ${!row.hasData ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {getInitials(row.memberName)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 leading-tight text-sm">{row.memberName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{row.designation || 'Member'}</p>
                  </div>
                </div>
                {row.hasData ? (
                  <span className={`badge ${row.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>
                    {row.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-slate-100 font-sans font-medium text-slate-755">
                <div>
                  <span className="text-slate-400 font-sans">Working Days:</span> <span className="font-semibold text-[#0F172A]">{row.workingDays}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Present/Paid:</span> <span className="font-semibold text-[#0F172A]">{row.presentDays}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Basic:</span> <span className="font-semibold text-[#0F172A]">{formatCurrency(row.basicSalary)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Overtime:</span> <span className="font-semibold text-[#0F172A]">{formatCurrency(row.overtime)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Allowances:</span> <span className="font-semibold text-[#0F172A]">{formatCurrency(row.allowances)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">Net Salary:</span> <span className="font-bold text-teal-700">{formatCurrency(row.netSalary)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-450 font-medium">
                  {row.status === 'paid' && row.paidDate
                    ? `Paid: ${new Date(row.paidDate.toDate ? row.paidDate.toDate() : row.paidDate).toLocaleDateString('en-IN')}`
                    : 'Unpaid'}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditRow(row)} className="text-xs text-blue-650 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                    Edit
                  </button>
                  {row.hasData && row.status === 'pending' && (
                    <button type="button" onClick={() => handleMarkPaid(row)} disabled={processing} className="text-xs text-green-600 bg-green-50 hover:bg-green-100 border border-green-100 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                      Pay
                    </button>
                  )}
                  {row.hasData && (
                    <DeleteButton onClick={() => handleDeleteSalary(row)} />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
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



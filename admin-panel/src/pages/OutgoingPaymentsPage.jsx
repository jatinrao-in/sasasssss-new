import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, X, Search, DollarSign, TrendingUp, TrendingDown, Clock,
  AlertTriangle, CheckCircle2, BarChart3, Download, Eye, Check,
  SlidersHorizontal, ArrowUpRight, HelpCircle, FileCheck2, ShieldAlert,
  ChevronRight, Phone, Mail, MessageSquare, Trash2, Users, Wallet,
  CalendarDays, Calendar, ChevronDown, CheckCheck, RefreshCw, Info, CheckCircle
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, Cell } from 'recharts';
import { useOutgoingPayments } from '../hooks/useOutgoingPayments';
import { usePayments } from '../hooks/usePayments';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatDate, formatCurrency, getInitials } from '../lib/formatters';
import { notifyPaymentAssigned } from '../lib/notify';

import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';

// ── Date Triage Helper Functions ──────────────────────────────
const isToday = (dateInput) => {
  if (!dateInput) return false;
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const isWithinDays = (dateInput, numDays) => {
  if (!dateInput) return false;
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= numDays;
};

// ── Outgoing Payments Modal Component ─────────────────────────
function OutgoingModal({ onClose, onSubmit, members, editing }) {
  const [form, setForm] = useState({
    vendorName: editing?.vendorName || '',
    invoiceNumber: editing?.invoiceNumber || '',
    amount: editing?.amount || '',
    totalPaid: editing?.totalPaid || 0,
    paymentStatus: editing?.paymentStatus || 'pending',
    approvalStatus: editing?.approvalStatus || 'draft',
    paymentDueDate: editing?.paymentDueDate
      ? (typeof editing.paymentDueDate.toDate === 'function' 
          ? editing.paymentDueDate.toDate().toISOString().split('T')[0] 
          : new Date(editing.paymentDueDate).toISOString().split('T')[0])
      : '',
    nextFollowupDate: editing?.nextFollowupDate
      ? (typeof editing.nextFollowupDate.toDate === 'function' 
          ? editing.nextFollowupDate.toDate().toISOString().split('T')[0] 
          : new Date(editing.nextFollowupDate).toISOString().split('T')[0])
      : '',
    category: editing?.category || 'Material',
    assignedTo: editing?.assignedTo || '',
    assignedToName: editing?.assignedToName || '',
    remarks: editing?.remarks || '',
    priority: editing?.priority || 'medium',
    vendorRisk: editing?.vendorRisk || 'low_risk',
    partialPayment: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorName || !form.amount) return;
    setSaving(true);
    try {
      let finalTotalPaid = 0;
      let finalStatus = form.paymentStatus;

      if (editing) {
        const partial = Number(form.partialPayment || 0);
        finalTotalPaid = Number(form.totalPaid || 0) + partial;
      } else {
        if (form.paymentStatus === 'paid') {
          finalTotalPaid = Number(form.amount || 0);
        } else if (form.paymentStatus === 'partial') {
          finalTotalPaid = Number(form.totalPaid || 0);
        } else {
          finalTotalPaid = 0;
        }
      }

      if (finalTotalPaid >= Number(form.amount || 0) && Number(form.amount || 0) > 0) {
        finalStatus = 'paid';
      } else if (finalTotalPaid > 0) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'pending';
      }

      await onSubmit({
        vendorName: form.vendorName,
        invoiceNumber: form.invoiceNumber,
        amount: Number(form.amount),
        totalPaid: finalTotalPaid,
        paymentStatus: finalStatus,
        approvalStatus: form.approvalStatus,
        paymentDueDate: form.paymentDueDate ? Timestamp.fromDate(new Date(form.paymentDueDate)) : null,
        nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
        category: form.category,
        assignedTo: form.assignedTo,
        assignedToName: form.assignedToName,
        remarks: form.remarks,
        priority: form.priority,
        vendorRisk: form.vendorRisk,
        netPendingAmount: Number(form.amount) - finalTotalPaid,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-[-0.01em]">{editing ? 'Edit Outgoing Payment' : 'New Outgoing Payment'}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Vendor Name *</label>
              <input
                required
                type="text"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                placeholder="Vendor name"
                value={form.vendorName}
                onChange={e => setForm({ ...form, vendorName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Invoice Number</label>
              <input
                type="text"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                placeholder="INV-XXXX"
                value={form.invoiceNumber}
                onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Amount (Rs) *</label>
              <input
                required
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A] [font-variant-numeric:tabular-nums]"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Category</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                <option value="Material">Material</option>
                <option value="Salary">Salary</option>
                <option value="Operations">Operations</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Approval Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.approvalStatus}
                onChange={e => setForm({ ...form, approvalStatus: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending Approval</option>
                <option value="finance_review">Finance Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Payment Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.paymentStatus}
                onChange={e => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {editing ? (
            <div className="bg-slate-55 border border-slate-100 rounded-xl p-4 space-y-3 font-sans">
              <div className="flex justify-between text-xs sm:text-[13px] font-semibold text-[#0F172A]">
                <span className="text-[#64748B]">Paid Amount:</span>
                <span className="text-emerald-600 [font-variant-numeric:tabular-nums]">{formatCurrency(form.totalPaid)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-[13px] font-semibold text-[#0F172A]">
                <span className="text-[#64748B]">Outstanding Balance:</span>
                <span className="text-rose-600 [font-variant-numeric:tabular-nums]">{formatCurrency(Math.max(0, Number(form.amount || 0) - Number(form.totalPaid || 0)))}</span>
              </div>
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-[#64748B] mb-1 font-sans">Record Additional Payment (Rs)</label>
                <input
                  type="number"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] font-medium text-[#0F172A] [font-variant-numeric:tabular-nums]"
                  placeholder="0.00"
                  value={form.partialPayment}
                  onChange={e => setForm({ ...form, partialPayment: e.target.value })}
                />
              </div>
            </div>
          ) : (
            form.paymentStatus === 'partial' && (
              <div className="bg-slate-55 border border-slate-100 rounded-xl p-4">
                <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Initial Paid Amount (Rs)</label>
                <input
                  type="number"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] font-medium text-[#0F172A] [font-variant-numeric:tabular-nums]"
                  placeholder="0.00"
                  value={form.totalPaid}
                  onChange={e => setForm({ ...form, totalPaid: e.target.value })}
                />
              </div>
            )
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Payment Priority</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Vendor Risk Level</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.vendorRisk}
                onChange={e => setForm({ ...form, vendorRisk: e.target.value })}
              >
                <option value="low_risk">Low Risk</option>
                <option value="medium_risk">Medium Risk</option>
                <option value="high_risk">High Risk</option>
                <option value="critical">Critical Risk</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Payment Due Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.paymentDueDate}
                onChange={e => setForm({ ...form, paymentDueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Next Follow-up Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.nextFollowupDate}
                onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Assign Representative</label>
            <select
              className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
              value={form.assignedTo}
              onChange={e => {
                const m = members.find(item => item.id === e.target.value);
                setForm({ ...form, assignedTo: e.target.value, assignedToName: m?.name || '' });
              }}
            >
              <option value="">Select executive</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-[13px] font-medium text-[#64748B] mb-1.5 font-sans">Remarks / Notes</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 resize-none font-medium text-[#0F172A]"
              rows={2}
              placeholder="Record any checkout notes..."
              value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-[#0F172A] text-xs sm:text-[13px] font-semibold hover:bg-slate-55 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-xs sm:text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {editing ? 'Save Updates' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Outgoing Payment Detail Panel ─────────────────────────────
function OutgoingDetailPanel({ payment, onClose, onSaveNotes, allPayments }) {
  const [activeTab, setActiveTab] = useState('details');
  const [notes, setNotes] = useState(payment.remarks || '');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(payment.remarks || '');
  }, [payment]);

  if (!payment) return null;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(payment.id, notes);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNotes(false);
    }
  };

  const getPriorityBadge = (prio) => {
    const maps = {
      critical: 'bg-rose-50 text-rose-700 border-rose-200',
      high: 'bg-amber-50 text-amber-700 border-amber-200',
      medium: 'bg-blue-50 text-blue-700 border-blue-200',
      low: 'bg-slate-50 text-slate-700 border-slate-250',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${maps[prio] || 'bg-slate-50 text-slate-650'}`}>
        {prio || 'medium'}
      </span>
    );
  };

  const getRiskBadge = (risk) => {
    const maps = {
      critical: 'bg-rose-50 text-rose-700 border-rose-200',
      high_risk: 'bg-orange-50 text-orange-700 border-orange-200',
      medium_risk: 'bg-amber-50 text-amber-700 border-amber-200',
      low_risk: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${maps[risk] || 'bg-slate-50'}`}>
        {(risk || 'low_risk').replace('_', ' ')}
      </span>
    );
  };

  // Vendor aggregates
  const vendorPayments = allPayments.filter(p => p.vendorName === payment.vendorName);
  const vendorTotalInvoiced = vendorPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const vendorTotalPaid = vendorPayments.reduce((s, p) => s + (p.totalPaid || 0), 0);
  const vendorTotalOutstanding = Math.max(0, vendorTotalInvoiced - vendorTotalPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md h-full shadow-2xl overflow-y-auto border-l border-slate-100 flex flex-col slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-[-0.01em]">Finance Operations Logs</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 font-bold text-lg">
            {getInitials(payment.vendorName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base sm:text-lg font-bold text-[#0F172A] tracking-[-0.02em] truncate">{payment.vendorName}</p>
            <p className="text-xs sm:text-[13px] text-[#64748B] font-medium truncate mt-1">Invoice: {payment.invoiceNumber || 'N/A'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4 bg-white">
          {[
            { id: 'details', label: 'Details' },
            { id: 'vendor', label: 'Vendor Insights' },
            { id: 'notes', label: 'Finance Notes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs sm:text-[13px] font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4 font-sans">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] mb-1">Status</p>
                  <span className="text-xs sm:text-[14px] font-semibold text-[#0F172A] uppercase">{payment.paymentStatus}</span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] mb-1">Approval</p>
                  <span className="text-xs sm:text-[14px] font-semibold text-[#0F172A] uppercase">{(payment.approvalStatus || 'draft').replace('_', ' ')}</span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] mb-1">Priority</p>
                  <div>{getPriorityBadge(payment.priority)}</div>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] mb-1">Risk Rating</p>
                  <div>{getRiskBadge(payment.vendorRisk)}</div>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] mb-1">Invoice Value</p>
                  <span className="text-xs sm:text-[14px] font-semibold text-[#0F172A] [font-variant-numeric:tabular-nums]">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.04em] mb-1">Total Paid</p>
                  <span className="text-xs sm:text-[14px] font-semibold text-emerald-600 [font-variant-numeric:tabular-nums]">{formatCurrency(payment.totalPaid || 0)}</span>
                </div>
              </div>

              <div className="bg-slate-55/50 border border-[#E2E8F0] rounded-xl p-4 space-y-2 text-xs sm:text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-medium">Assigned Executive:</span>
                  <span className="text-[#0F172A] font-semibold">{payment.assignedToName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-medium">Assigned Date:</span>
                  <span className="text-[#0F172A] font-semibold">{formatDate(payment.assignedDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-medium">Due Date:</span>
                  <span className="text-blue-650 font-semibold">{formatDate(payment.paymentDueDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B] font-medium">Next Follow-up Date:</span>
                  <span className="text-[#0F172A] font-semibold">{formatDate(payment.nextFollowupDate)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendor' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-sm">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-400">Total Vendor Spend</p>
                <p className="text-xl sm:text-[24px] font-bold tracking-[-0.02em] [font-variant-numeric:tabular-nums]">{formatCurrency(vendorTotalInvoiced)}</p>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs sm:text-[13px]">
                  <div>
                    <span className="text-slate-400 font-medium block">Total Settled</span>
                    <span className="text-sm sm:text-[15px] font-semibold text-emerald-400 block mt-0.5 [font-variant-numeric:tabular-nums]">{formatCurrency(vendorTotalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Outstanding Balance</span>
                    <span className="text-sm sm:text-[15px] font-semibold text-rose-400 block mt-0.5 [font-variant-numeric:tabular-nums]">{formatCurrency(vendorTotalOutstanding)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                <p className="text-xs sm:text-[13px] font-semibold text-[#0F172A] mb-2">Invoice Logs For Vendor</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {vendorPayments.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs sm:text-[13px] py-1.5 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-semibold text-[#0F172A]">{item.invoiceNumber || 'INV-N/A'}</p>
                        <p className="text-[10px] sm:text-[11px] text-[#64748B] font-medium">{formatDate(item.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#0F172A] [font-variant-numeric:tabular-nums]">{formatCurrency(item.amount)}</p>
                        <span className={`text-[9px] sm:text-[10px] font-semibold uppercase ${item.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-650'}`}>
                          {item.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs sm:text-[13px] font-semibold text-[#0F172A] mb-2 uppercase tracking-[0.02em]">Record Finance Notes</label>
                <textarea
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs sm:text-[13px] focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-none resize-none font-medium text-[#0F172A]"
                  rows={6}
                  placeholder="Record bank transaction refs, vendor notes, follow-up logs, or cost breakdowns..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {savingNotes && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Notes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Outgoing Payments Page Main Component ─────────────────────
export default function OutgoingPaymentsPage() {
  const toast = useToast();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { outgoingPayments, loading, addOutgoingPayment, updateOutgoingPayment, deleteOutgoingPayment } = useOutgoingPayments();
  const { payments: incomingPayments } = usePayments();
  const { members } = useTeam({ includeAdmins: true });

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  
  // Triage state & filters
  const [activeInsightFilter, setActiveInsightFilter] = useState(null); // 'critical', 'pending_approval', 'commitments', 'spend_inc'
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');

  // Multi-select & Drawers
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignTo, setBulkAssignTo] = useState('');

  // Column visibilities
  const [visibleColumns, setVisibleColumns] = useState({
    vendor: true,
    category: true,
    invoice: true,
    amount: true,
    paid: true,
    outstanding: true,
    dueDate: true,
    daysRemaining: true,
    riskLevel: true,
    approvalStatus: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Cash Burn Tab Selector
  const [burnTab, setBurnTab] = useState('monthly'); // 'daily', 'weekly', 'monthly', 'forecast'

  // Fetch active team members
  const activeMembers = members.filter(m => m.status === 'active');

  // Calculations
  const metrics = useMemo(() => {
    const totalOutgoing = outgoingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalPaidOut = outgoingPayments.reduce((s, p) => s + Number(p.totalPaid || 0), 0);
    const pendingOut = outgoingPayments.reduce((s, p) => s + Math.max(0, Number(p.amount || 0) - Number(p.totalPaid || 0)), 0);
    const totalIncoming = incomingPayments.reduce((s, p) => s + Number(p.totalPaid || 0), 0);
    const netCashFlow = totalIncoming - totalPaidOut;

    // Awaiting Approval status: pending or draft
    const awaitingApprovalCount = outgoingPayments.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'draft').length;
    const awaitingApprovalValue = outgoingPayments.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'draft').reduce((s, p) => s + (p.amount || 0), 0);

    return { totalOutgoing, totalPaidOut, pendingOut, totalIncoming, netCashFlow, awaitingApprovalCount, awaitingApprovalValue };
  }, [outgoingPayments, incomingPayments]);

  // Insights counts
  const insightsMetrics = useMemo(() => {
    // 🔴 Critical Vendor Payments: Overdue > 15 days or priority critical
    const criticalCount = outgoingPayments.filter(p => p.paymentStatus !== 'paid' && (p.priority === 'critical' || p.overdueDays > 15)).length;
    // ⚠ Pending Approvals: status pending or draft
    const pendingCount = outgoingPayments.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'draft').length;
    // 💰 Upcoming Commitments: Due in next 7 days
    const upcomingCount = outgoingPayments.filter(p => p.paymentStatus !== 'paid' && p.paymentDueDate && isWithinDays(p.paymentDueDate, 7)).length;

    // 📉 Spending Increased: MoM check
    const today = new Date();
    const curSpend = outgoingPayments.filter(p => {
      const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      return pd && pd.getMonth() === today.getMonth() && pd.getFullYear() === today.getFullYear();
    }).reduce((s, p) => s + Number(p.amount || 0), 0);

    const prevSpend = outgoingPayments.filter(p => {
      const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      const prevM = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const prevY = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      return pd && pd.getMonth() === prevM && pd.getFullYear() === prevY;
    }).reduce((s, p) => s + Number(p.amount || 0), 0);

    let spendIncPercent = 0;
    if (prevSpend > 0) {
      spendIncPercent = Math.round(((curSpend - prevSpend) / prevSpend) * 100);
    } else if (curSpend > 0) {
      spendIncPercent = 100;
    }

    return { criticalCount, pendingCount, upcomingCount, spendIncPercent };
  }, [outgoingPayments]);

  // Expense breakdown by categories
  const expenseBreakdown = useMemo(() => {
    const categories = ['Material', 'Salary', 'Operations', 'Maintenance', 'Marketing', 'Other'];
    const totalSpend = metrics.totalOutgoing || 1;

    return categories.map(cat => {
      const catPayments = outgoingPayments.filter(p => {
        const c = (p.category || '').toLowerCase();
        if (cat === 'Salary') return c === 'salary' || c === 'labour';
        if (cat === 'Operations') return c === 'operations' || c === 'transport' || c === 'utilities' || c === 'rent';
        if (cat === 'Maintenance') return c === 'maintenance' || c === 'equipment';
        return c === cat.toLowerCase();
      });
      const amount = catPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const pct = Math.round((amount / totalSpend) * 100);

      // Simple MoM breakdown calculation
      const today = new Date();
      const curCatSpend = catPayments.filter(p => {
        const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return pd && pd.getMonth() === today.getMonth() && pd.getFullYear() === today.getFullYear();
      }).reduce((s, p) => s + Number(p.amount || 0), 0);

      const prevCatSpend = catPayments.filter(p => {
        const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        const lastM = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
        const lastY = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
        return pd && pd.getMonth() === lastM && pd.getFullYear() === lastY;
      }).reduce((s, p) => s + Number(p.amount || 0), 0);

      let trend = '+0% MoM';
      let isPositive = false;
      if (prevCatSpend > 0) {
        const diff = ((curCatSpend - prevCatSpend) / prevCatSpend) * 100;
        trend = `${diff >= 0 ? '+' : ''}${Math.round(diff)}% MoM`;
        isPositive = diff >= 0;
      } else if (curCatSpend > 0) {
        trend = '+100%';
        isPositive = true;
      }

      return { name: cat, amount, pct, trend, isPositive };
    });
  }, [outgoingPayments, metrics.totalOutgoing]);

  // Burn data generator (Daily, Weekly, Monthly, Forecasted)
  const burnData = useMemo(() => {
    const today = new Date();
    
    // Daily Burn
    const daily = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amt = outgoingPayments.filter(p => {
        const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return pd && pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).reduce((s, p) => s + Number(p.totalPaid || 0), 0);
      daily.push({ name: label, amount: Math.round(amt) });
    }

    // Weekly Burn
    const weekly = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(today.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = `Wk -${i}`;
      const amt = outgoingPayments.filter(p => {
        const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return pd && pd >= start && pd < end;
      }).reduce((s, p) => s + Number(p.totalPaid || 0), 0);
      weekly.push({ name: label, amount: Math.round(amt) });
    }

    // Monthly Burn
    const monthly = [];
    const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = mNames[d.getMonth()];
      const amt = outgoingPayments.filter(p => {
        const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        return pd && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).reduce((s, p) => s + Number(p.totalPaid || 0), 0);
      monthly.push({ name: label, amount: Math.round(amt) });
    }

    // Forecasted Burn (expected payments due next 15 days)
    const forecast = [];
    for (let i = 0; i < 15; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const amt = outgoingPayments.filter(p => {
        const pd = p.paymentDueDate?.toDate ? p.paymentDueDate.toDate() : (p.paymentDueDate ? new Date(p.paymentDueDate) : null);
        return pd && pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear() && p.paymentStatus !== 'paid';
      }).reduce((s, p) => s + Number(p.amount || 0) - Number(p.totalPaid || 0), 0);
      forecast.push({ name: label, amount: Math.round(amt) });
    }

    return { daily, weekly, monthly, forecast };
  }, [outgoingPayments]);

  const activeBurnChartData = useMemo(() => {
    if (burnTab === 'daily') return burnData.daily;
    if (burnTab === 'weekly') return burnData.weekly;
    if (burnTab === 'forecast') return burnData.forecast;
    return burnData.monthly;
  }, [burnTab, burnData]);

  // Approval Dashboard summaries
  const approvalSummary = useMemo(() => {
    const awaiting = outgoingPayments.filter(p => p.approvalStatus === 'pending' || p.approvalStatus === 'draft').length;
    const approved = outgoingPayments.filter(p => p.approvalStatus === 'approved').length;
    const rejected = outgoingPayments.filter(p => p.approvalStatus === 'rejected').length;
    const review = outgoingPayments.filter(p => p.approvalStatus === 'finance_review').length;

    // Bottlenecks: pending approval > 5 days
    const today = new Date();
    const bottlenecksList = outgoingPayments.filter(p => {
      const isPending = p.approvalStatus === 'pending' || p.approvalStatus === 'draft';
      const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      if (!pd) return false;
      const ageDays = (today.getTime() - pd.getTime()) / (1000 * 60 * 60 * 24);
      return isPending && ageDays > 5;
    });

    return { awaiting, approved, rejected, review, bottlenecks: bottlenecksList };
  }, [outgoingPayments]);

  // Vendor Insights summary
  const vendorInsights = useMemo(() => {
    const summary = {};
    outgoingPayments.forEach(p => {
      if (!summary[p.vendorName]) {
        summary[p.vendorName] = { name: p.vendorName, total: 0, count: 0, overdueDays: 0, risk: 'low_risk' };
      }
      summary[p.vendorName].total += Number(p.amount || 0);
      summary[p.vendorName].count += 1;
      if (p.paymentStatus !== 'paid' && p.overdueDays > summary[p.vendorName].overdueDays) {
        summary[p.vendorName].overdueDays = p.overdueDays;
      }
      if (p.vendorRisk === 'critical' || p.vendorRisk === 'high_risk') {
        summary[p.vendorName].risk = 'critical';
      }
    });

    const vendorList = Object.values(summary);
    const topVendors = [...vendorList].sort((a, b) => b.total - a.total).slice(0, 4);

    let highestSpendInvoice = null;
    let maxSpend = 0;
    outgoingPayments.forEach(p => {
      if ((p.amount || 0) > maxSpend) {
        maxSpend = p.amount;
        highestSpendInvoice = p;
      }
    });

    let mostOverdueInvoice = null;
    let maxOverdue = 0;
    outgoingPayments.forEach(p => {
      if (p.paymentStatus !== 'paid' && (p.overdueDays || 0) > maxOverdue) {
        maxOverdue = p.overdueDays;
        mostOverdueInvoice = p;
      }
    });

    const totalRiskSpend = outgoingPayments.filter(p => {
      const score = p.vendorRisk || 'low_risk';
      return p.paymentStatus !== 'paid' && (score === 'critical' || score === 'high_risk');
    }).reduce((s, p) => s + (p.amount - (p.totalPaid || 0)), 0);

    return { topVendors, highestSpendInvoice, mostOverdueInvoice, totalRiskSpend };
  }, [outgoingPayments]);

  // ── Filters & Triage Sorting ─────────────────────────────────
  const filtered = useMemo(() => {
    return outgoingPayments.filter(p => {
      const matchSearch = search === '' || 
        (p.vendorName || '').toLowerCase().includes(search.toLowerCase()) || 
        (p.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());

      const matchStatus = filterStatus === 'All' || p.paymentStatus === filterStatus;
      const matchCategory = filterCategory === 'All' || 
        (p.category || 'Other').toLowerCase() === filterCategory.toLowerCase();
      const matchPriority = filterPriority === 'All' || p.priority === filterPriority;
      const matchRisk = filterRisk === 'All' || p.vendorRisk === filterRisk;

      // Clickable Insights filters
      let matchInsight = true;
      if (activeInsightFilter === 'critical') {
        matchInsight = p.paymentStatus !== 'paid' && (p.priority === 'critical' || (p.overdueDays || 0) > 15);
      } else if (activeInsightFilter === 'pending_approval') {
        matchInsight = p.approvalStatus === 'pending' || p.approvalStatus === 'draft';
      } else if (activeInsightFilter === 'commitments') {
        matchInsight = p.paymentStatus !== 'paid' && p.paymentDueDate && isWithinDays(p.paymentDueDate, 7);
      } else if (activeInsightFilter === 'spend_inc') {
        matchInsight = p.priority === 'high' || p.vendorRisk === 'high_risk' || p.vendorRisk === 'critical';
      }

      return matchSearch && matchStatus && matchCategory && matchPriority && matchRisk && matchInsight;
    });
  }, [outgoingPayments, search, filterStatus, filterCategory, filterPriority, filterRisk, activeInsightFilter]);

  // Table Sort logic
  const sorted = useMemo(() => {
    const data = [...filtered];
    data.sort((firstItem, secondItem) => {
      let aVal = firstItem[sortField];
      let bVal = secondItem[sortField];

      // Handle Timestamp comparing
      if (aVal?.toDate) aVal = aVal.toDate().getTime();
      if (bVal?.toDate) bVal = bVal.toDate().getTime();

      // Fallbacks
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' 
          ? (aVal > bVal ? 1 : -1) 
          : (bVal > aVal ? 1 : -1);
      }
    });
    return data;
  }, [filtered, sortField, sortDirection]);

  // Sparkline data helper
  const getSparklineData = (value) => {
    const seed = value ? Number(value) : 100;
    return [
      { value: seed * 0.8 },
      { value: seed * 0.95 },
      { value: seed * 0.75 },
      { value: seed * 1.15 },
      { value: seed * 1.0 }
    ];
  };

  // Checkboxes
  const toggleSelectPayment = (id) => {
    setSelectedPaymentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const allVisibleSelected = sorted.length > 0 && sorted.every(p => selectedPaymentIds.includes(p.id));
  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedPaymentIds(prev => prev.filter(id => !sorted.map(s => s.id).includes(id)));
    } else {
      setSelectedPaymentIds(prev => Array.from(new Set([...prev, ...sorted.map(s => s.id)])));
    }
  };

  // Core functions
  const handleAdd = async (data) => {
    try {
      await addOutgoingPayment(data);
      if (data.assignedTo) {
        const member = members.find(m => m.id === data.assignedTo);
        if (member?.whatsapp) {
          try { await notifyPaymentAssigned(member, data); } catch (e) { console.error(e); }
        }
      }
      toast.success('Outgoing Payment added successfully!');
    } catch (err) {
      toast.error('Failed to create payment: ' + err.message);
    }
  };

  const handleEdit = async (data) => {
    try {
      await updateOutgoingPayment(editing.id, data);
      toast.success('Payment updated successfully!');
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  const deleteOutgoing = (id, vendorName) => {
    confirmDelete({
      title: 'Delete Outgoing Payment',
      description: `Remove payment entry for "${vendorName}"? This action is permanent.`,
      onConfirm: async () => {
        await deleteOutgoingPayment(id);
        toast.success('Payment removed');
        if (selectedPayment?.id === id) setSelectedPayment(null);
      },
    });
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    try {
      await Promise.all(selectedPaymentIds.map(id => updateOutgoingPayment(id, { approvalStatus: 'approved' })));
      toast.success('Selected payments approved');
      setSelectedPaymentIds([]);
    } catch (e) {
      toast.error('Bulk Approve failed: ' + e.message);
    }
  };

  const handleBulkReject = async () => {
    try {
      await Promise.all(selectedPaymentIds.map(id => updateOutgoingPayment(id, { approvalStatus: 'rejected' })));
      toast.success('Selected payments rejected');
      setSelectedPaymentIds([]);
    } catch (e) {
      toast.error('Bulk Reject failed: ' + e.message);
    }
  };

  const handleBulkMarkPaid = async () => {
    try {
      await Promise.all(selectedPaymentIds.map(id => {
        const item = outgoingPayments.find(p => p.id === id);
        return updateOutgoingPayment(id, {
          paymentStatus: 'paid',
          totalPaid: item?.amount || 0,
          netPendingAmount: 0,
        });
      }));
      toast.success('Selected payments marked paid');
      setSelectedPaymentIds([]);
    } catch (e) {
      toast.error('Bulk Mark Paid failed: ' + e.message);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignTo) return;
    try {
      const member = members.find(m => m.id === bulkAssignTo);
      await Promise.all(selectedPaymentIds.map(id => updateOutgoingPayment(id, {
        assignedTo: bulkAssignTo,
        assignedToName: member?.name || ''
      })));
      toast.success('Assigned representative updated');
      setSelectedPaymentIds([]);
      setShowBulkAssign(false);
      setBulkAssignTo('');
    } catch (e) {
      toast.error('Bulk Assign failed: ' + e.message);
    }
  };

  const handleBulkExport = () => {
    const selectedData = outgoingPayments.filter(p => selectedPaymentIds.includes(p.id));
    const headers = ['VendorName', 'InvoiceNumber', 'Category', 'Amount', 'TotalPaid', 'DueDate', 'Risk', 'Priority', 'ApprovalStatus'];
    const rows = selectedData.map(p => [
      p.vendorName,
      p.invoiceNumber || '',
      p.category || 'Other',
      p.amount || 0,
      p.totalPaid || 0,
      p.paymentDueDate ? (p.paymentDueDate.toDate ? p.paymentDueDate.toDate().toLocaleDateString() : new Date(p.paymentDueDate).toLocaleDateString()) : 'N/A',
      p.vendorRisk || 'low_risk',
      p.priority || 'medium',
      p.approvalStatus || 'draft'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `outgoing_payments_bulk_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bulk CSV generated successfully');
    setSelectedPaymentIds([]);
  };

  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Saved views filter triggers
  const setQuickSavedView = (view) => {
    if (view === 'all') {
      setFilterStatus('All');
      setFilterPriority('All');
      setFilterRisk('All');
      setActiveInsightFilter(null);
    } else if (view === 'overdue') {
      setFilterStatus('pending');
      setFilterPriority('All');
      setFilterRisk('All');
      setActiveInsightFilter('critical');
    } else if (view === 'approvals') {
      setFilterStatus('All');
      setFilterPriority('All');
      setFilterRisk('All');
      setActiveInsightFilter('pending_approval');
    } else if (view === 'high_spend') {
      setFilterStatus('All');
      setFilterPriority('high');
      setFilterRisk('All');
      setActiveInsightFilter('spend_inc');
    }
  };

  // Excel/CSV full lists exporter
  const handleFullExport = (type) => {
    const headers = ['VendorName', 'InvoiceNumber', 'Category', 'Amount', 'TotalPaid', 'DueDate', 'Risk', 'Priority', 'ApprovalStatus'];
    const rows = sorted.map(p => [
      p.vendorName,
      p.invoiceNumber || '',
      p.category || 'Other',
      p.amount || 0,
      p.totalPaid || 0,
      p.paymentDueDate ? (p.paymentDueDate.toDate ? p.paymentDueDate.toDate().toLocaleDateString() : new Date(p.paymentDueDate).toLocaleDateString()) : 'N/A',
      p.vendorRisk || 'low_risk',
      p.priority || 'medium',
      p.approvalStatus || 'draft'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `outgoing_payments_${type === 'excel' ? 'excel' : 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report downloaded successfully');
  };

  return (
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-16">
      
      {/* 1. Breadcrumbs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F172A] tracking-[-0.02em] leading-tight">Outgoing Payments</h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1 font-medium">
            {outgoingPayments.length} Payments &nbsp;·&nbsp; Net Cash Flow: <span className="[font-variant-numeric:tabular-nums]">{formatCurrency(metrics.netCashFlow)}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={() => setQuickSavedView('all')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
          </button>

          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 hidden group-hover:block z-10 w-32">
              <button onClick={() => handleFullExport('csv')} className="w-full text-left px-3 py-2 text-xs sm:text-[13px] hover:bg-slate-50 font-medium text-slate-700">CSV</button>
              <button onClick={() => handleFullExport('excel')} className="w-full text-left px-3 py-2 text-xs sm:text-[13px] hover:bg-slate-50 font-medium text-slate-700">Excel</button>
            </div>
          </div>

          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="h-10 px-4 rounded-[12px] bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Payment</span>
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPIs Grid (12-column with Net Cash Flow prioritized) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Total Outgoing */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between gap-2.5 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="w-14 h-7 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(metrics.totalOutgoing)}>
                  <Area type="monotone" dataKey="value" stroke="#EF4444" fill="#FEF2F2" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-semibold text-[#64748B] uppercase tracking-[0.08em]">Total Outgoing</p>
            <p className="text-lg sm:text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] [font-variant-numeric:tabular-nums] mt-1.5 leading-tight truncate">
              <CountUpNumber end={metrics.totalOutgoing} formatter={v => formatCurrency(Math.round(v))} />
            </p>
          </div>
        </div>

        {/* Paid */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between gap-2.5 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="w-14 h-7 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(metrics.totalPaidOut)}>
                  <Area type="monotone" dataKey="value" stroke="#10B981" fill="#ECFDF5" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-semibold text-[#64748B] uppercase tracking-[0.08em]">Total Settled</p>
            <p className="text-lg sm:text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] [font-variant-numeric:tabular-nums] mt-1.5 leading-tight truncate">
              <CountUpNumber end={metrics.totalPaidOut} formatter={v => formatCurrency(Math.round(v))} />
            </p>
          </div>
        </div>

        {/* Pending Outgoing */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between gap-2.5 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="w-14 h-7 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(metrics.pendingOut)}>
                  <Area type="monotone" dataKey="value" stroke="#F59E0B" fill="#FEF3C7" strokeWidth={1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-semibold text-[#64748B] uppercase tracking-[0.08em]">Pending Balance</p>
            <p className="text-lg sm:text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] [font-variant-numeric:tabular-nums] mt-1.5 leading-tight truncate">
              <CountUpNumber end={metrics.pendingOut} formatter={v => formatCurrency(Math.round(v))} />
            </p>
          </div>
        </div>

        {/* Net Cash Flow (Prioritized layout card) */}
        <div className="bg-slate-900 border border-slate-850 rounded-[16px] p-5 shadow-lg col-span-1 md:col-span-4 flex flex-col justify-between gap-2 text-white hover:scale-[1.01] transition-transform duration-350 select-none relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${metrics.netCashFlow >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} shrink-0`}>
                {metrics.netCashFlow >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <span className="text-[10px] sm:text-[12px] uppercase tracking-[0.08em] font-semibold text-slate-400">Company Liquidity</span>
            </div>
            <div className="w-24 h-9 opacity-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getSparklineData(Math.abs(metrics.netCashFlow))}>
                  <Area type="monotone" dataKey="value" stroke={metrics.netCashFlow >= 0 ? '#10B981' : '#EF4444'} fill="transparent" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-semibold text-slate-400 uppercase tracking-[0.08em]">Net Cash Flow (Incoming - Outgoing)</p>
            <h3 className={`text-lg sm:text-[22px] font-bold tracking-[-0.02em] [font-variant-numeric:tabular-nums] mt-1.5 leading-tight truncate ${metrics.netCashFlow >= 0 ? 'text-emerald-450' : 'text-rose-400'}`}>
              <CountUpNumber end={metrics.netCashFlow} formatter={v => formatCurrency(Math.round(v))} />
            </h3>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-between gap-2.5 hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              {metrics.awaitingApprovalCount} Invoices
            </span>
          </div>
          <div>
            <p className="text-[10px] sm:text-[12px] font-semibold text-[#64748B] uppercase tracking-[0.08em]">Awaiting Sign-off</p>
            <p className="text-lg sm:text-[22px] font-bold text-[#0F172A] tracking-[-0.02em] [font-variant-numeric:tabular-nums] mt-1.5 leading-tight truncate">
              <CountUpNumber end={metrics.awaitingApprovalValue} formatter={v => formatCurrency(Math.round(v))} />
            </p>
          </div>
        </div>
      </div>

      {/* 3. Finance Clickable Insights Triage Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: 'critical', title: 'Critical Payments', count: `${insightsMetrics.criticalCount} Overdue`, color: 'border-l-rose-500 hover:bg-rose-50/20', desc: 'Overdue > 15 days or critical level', activeColor: 'ring-2 ring-rose-500/20 bg-rose-50/30 border-rose-200' },
          { id: 'pending_approval', title: 'Awaiting Approvals', count: `${insightsMetrics.pendingCount} Pending`, color: 'border-l-amber-500 hover:bg-amber-50/20', desc: 'Payments in draft or pending review', activeColor: 'ring-2 ring-amber-500/20 bg-amber-50/30 border-amber-200' },
          { id: 'commitments', title: 'Upcoming Commitments', count: `${insightsMetrics.upcomingCount} Due soon`, color: 'border-l-blue-500 hover:bg-blue-50/20', desc: 'Unpaid vendor invoices due in 7 days', activeColor: 'ring-2 ring-blue-500/20 bg-blue-50/30 border-blue-200' },
          { id: 'spend_inc', title: 'High Risk Spend', count: `Priority Level`, color: 'border-l-indigo-500 hover:bg-indigo-50/20', desc: 'Critical Risk or High Priority items', activeColor: 'ring-2 ring-indigo-500/20 bg-indigo-50/30 border-indigo-200' }
        ].map((card) => {
          const isActive = activeInsightFilter === card.id;
          return (
            <div
              key={card.id}
              onClick={() => setActiveInsightFilter(prev => prev === card.id ? null : card.id)}
              className={`bg-white border border-[#E2E8F0] border-l-4 ${card.color} ${isActive ? card.activeColor : ''} rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs sm:text-[13px] font-semibold text-[#0F172A] tracking-[-0.01em]">{card.title}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[#0F172A] bg-slate-100/80 px-2 py-0.5 rounded [font-variant-numeric:tabular-nums]">{card.count}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#64748B] font-medium mt-1">{card.desc}</p>
            </div>
          );
        })}
      </div>

      {/* 4. Expense Breakdown & Cash Burn Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Expense Breakdown table */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-rose-500" />
              <span>Category Expense Allocation</span>
            </h3>
            <div className="space-y-4">
              {expenseBreakdown.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs sm:text-[13px] font-medium">
                    <span className="text-[#0F172A]">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#0F172A] font-semibold [font-variant-numeric:tabular-nums]">{formatCurrency(item.amount)}</span>
                      <span className={`text-[10px] sm:text-[11px] font-semibold ${item.isPositive ? 'text-rose-600' : 'text-emerald-600'}`}>{item.trend}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-medium text-[#64748B] w-7 text-right [font-variant-numeric:tabular-nums]">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Cash Burn Trends chart */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3">
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              <span>Cash Burn Velocity & Forecast</span>
            </h3>
            
            {/* Chart type select tabs */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              {[
                { id: 'daily', label: 'Daily Burn' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'forecast', label: 'Forecast' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setBurnTab(tab.id)}
                  className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase rounded-md transition-all ${
                    burnTab === tab.id ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeBurnChartData}>
                <defs>
                  <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 650 }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B', fontWeight: 650 }} formatter={v => formatCurrency(v)} />
                <Tooltip contentStyle={{ borderRadius: 12 }} formatter={v => formatCurrency(v)} />
                <Area type="monotone" dataKey="amount" stroke="#2563EB" fillOpacity={1} fill="url(#burnGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Approval Dashboard & Vendor Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Approval Dashboard */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-6 space-y-4">
          <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Approval Desk Status</span>
          </h3>
          
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Awaiting</p>
              <p className="text-xl font-bold text-amber-500 mt-1 [font-variant-numeric:tabular-nums]">{approvalSummary.awaiting}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Approved</p>
              <p className="text-xl font-bold text-blue-600 mt-1 [font-variant-numeric:tabular-nums]">{approvalSummary.approved}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Rejected</p>
              <p className="text-xl font-bold text-rose-600 mt-1 [font-variant-numeric:tabular-nums]">{approvalSummary.rejected}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Review</p>
              <p className="text-xl font-bold text-purple-600 mt-1 [font-variant-numeric:tabular-nums]">{approvalSummary.review}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-[0.05em] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Awaiting Sign-off Bottlenecks ({approvalSummary.bottlenecks.length})
            </p>
            {approvalSummary.bottlenecks.length === 0 ? (
              <p className="text-xs text-slate-450 font-medium italic">No active bottlenecks detected.</p>
            ) : (
              <div className="max-h-[120px] overflow-y-auto space-y-2 pr-1">
                {approvalSummary.bottlenecks.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-2 px-3 bg-rose-50/30 border border-rose-100 rounded-lg">
                    <div>
                      <p className="font-semibold text-[#0F172A]">{item.vendorName}</p>
                      <p className="text-[10px] text-[#64748B] font-medium">{item.invoiceNumber || 'INV-N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#0F172A] [font-variant-numeric:tabular-nums]">{formatCurrency(item.amount)}</p>
                      <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded [font-variant-numeric:tabular-nums]">Awaiting {Math.round((new Date().getTime() - (item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt)).getTime()) / (1000 * 60 * 60 * 24))}d</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Vendor Insights */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-6 space-y-4">
          <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Spend Analysis & Risks</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs sm:text-[13px]">
            <div className="border border-slate-100 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-[0.05em]">Highest Spend</span>
              <p className="font-semibold text-[#0F172A] truncate">{vendorInsights.highestSpendInvoice?.vendorName || 'N/A'}</p>
              <p className="font-semibold text-blue-650 [font-variant-numeric:tabular-nums]">{formatCurrency(vendorInsights.highestSpendInvoice?.amount || 0)}</p>
            </div>
            <div className="border border-slate-100 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-[0.05em]">Most Overdue</span>
              <p className="font-semibold text-[#0F172A] truncate">{vendorInsights.mostOverdueInvoice?.vendorName || 'N/A'}</p>
              <p className="font-semibold text-rose-650 [font-variant-numeric:tabular-nums]">{vendorInsights.mostOverdueInvoice?.overdueDays || 0} Days Late</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] mb-2">Top Spend Vendors</p>
            <div className="flex gap-2 flex-wrap">
              {vendorInsights.topVendors.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-[9px] shrink-0">
                    {getInitials(item.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A] text-[10px] sm:text-[11px] truncate max-w-[80px]" title={item.name}>{item.name}</p>
                    <p className="text-[9px] sm:text-[10px] text-[#64748B] font-medium mt-0.5 [font-variant-numeric:tabular-nums]">{formatCurrency(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Sticky Horizontal Filters & Search Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] shadow-sm overflow-hidden z-20 sticky top-16">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-slate-100 px-5 py-3 gap-3">
          {/* Left Saved Views tabs */}
          <div className="flex gap-2.5 overflow-x-auto pr-1">
            {[
              { id: 'all', label: 'All Payments' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'approvals', label: 'Awaiting Approvals' },
              { id: 'high_spend', label: 'High Spend' }
            ].map(tab => {
              const active = 
                (tab.id === 'all' && !activeInsightFilter && filterStatus === 'All' && filterPriority === 'All') ||
                (tab.id === 'overdue' && activeInsightFilter === 'critical' && filterStatus === 'pending') ||
                (tab.id === 'approvals' && activeInsightFilter === 'pending_approval') ||
                (tab.id === 'high_spend' && activeInsightFilter === 'spend_inc');

              return (
                <button
                  key={tab.id}
                  onClick={() => setQuickSavedView(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium transition-all ${
                    active ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right Filters Dropdown toggles */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendor..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/50 font-medium text-[#0F172A]"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Status */}
            <select
              className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>

            {/* Category */}
            <select
              className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="All">All Category</option>
              <option value="Material">Material</option>
              <option value="Salary">Salary</option>
              <option value="Operations">Operations</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other</option>
            </select>

            {/* Priority */}
            <select
              className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
            >
              <option value="All">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            {/* Risk */}
            <select
              className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
            >
              <option value="All">All Risk</option>
              <option value="low_risk">Low Risk</option>
              <option value="medium_risk">Medium Risk</option>
              <option value="high_risk">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>

            {/* Column Selector */}
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-700"
                title="Toggle Columns"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-40 w-44 font-sans text-xs sm:text-[13px]">
                    <p className="px-3 py-1 font-semibold text-[#64748B] uppercase text-[10px] sm:text-[11px] tracking-[0.05em] border-b border-slate-100 mb-1">Toggle Columns</p>
                    {Object.entries(visibleColumns).map(([key, isVisible]) => (
                      <label key={key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer font-medium text-slate-700 select-none text-xs sm:text-[13px]">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }))}
                          className="rounded accent-blue-600"
                        />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions drawer */}
      {selectedPaymentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-slate-100 rounded-[14px] shadow-2xl px-5 py-3 flex items-center gap-4 border border-slate-800 z-40 animate-slideUp font-sans text-xs sm:text-[13px]">
          <span className="font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 [font-variant-numeric:tabular-nums]">
            {selectedPaymentIds.length} Selected
          </span>

          <button onClick={handleBulkApprove} className="font-semibold hover:text-white transition-colors text-slate-300">
            Approve
          </button>
          
          <button onClick={handleBulkReject} className="font-semibold hover:text-white transition-colors text-slate-300">
            Reject
          </button>

          <button onClick={handleBulkMarkPaid} className="font-semibold hover:text-white transition-colors text-slate-300">
            Mark Paid
          </button>

          <button onClick={() => setShowBulkAssign(prev => !prev)} className="font-semibold hover:text-white transition-colors text-slate-300 flex items-center gap-1">
            Assign <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showBulkAssign && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 rounded-xl p-3 w-48 shadow-xl">
              <p className="font-semibold text-slate-400 mb-2 text-[10px] sm:text-[11px] uppercase tracking-[0.05em]">Select Representative</p>
              <select
                className="w-full h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs sm:text-[13px] text-white"
                value={bulkAssignTo}
                onChange={e => setBulkAssignTo(e.target.value)}
              >
                <option value="">Select</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssignTo}
                className="w-full mt-2 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] sm:text-[11px] font-semibold disabled:opacity-50"
              >
                Apply Assignment
              </button>
            </div>
          )}

          <div className="h-4 w-px bg-slate-800" />

          <button onClick={handleBulkExport} className="font-semibold hover:text-white transition-colors text-slate-350">
            Export Selected
          </button>

          <button onClick={() => setSelectedPaymentIds([])} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7. Primary Outgoing Payments Workspace */}
      {loading ? (
        <SkeletonTable rows={6} cols={11} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="noData"
          title="No Outgoing payments found"
          description={search || filterStatus !== 'All' || activeInsightFilter ? 'Try clearing your filters or search query.' : 'Add your first outgoing vendor payment to begin tracking.'}
          actionLabel="New Outgoing Payment"
          onAction={() => { setEditing(null); setShowModal(true); }}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left" data-export-table>
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0] font-sans">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        className="rounded accent-blue-600"
                        title="Select visible"
                      />
                    </th>
                    {visibleColumns.vendor && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('vendorName')}>Vendor</th>}
                    {visibleColumns.category && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('category')}>Category</th>}
                    {visibleColumns.invoice && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('invoiceNumber')}>Invoice</th>}
                    {visibleColumns.amount && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('amount')}>Amount</th>}
                    {visibleColumns.paid && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('totalPaid')}>Paid</th>}
                    {visibleColumns.outstanding && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] select-none">Outstanding</th>}
                    {visibleColumns.dueDate && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('paymentDueDate')}>Due Date</th>}
                    {visibleColumns.daysRemaining && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] select-none">Days Left</th>}
                    {visibleColumns.riskLevel && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('vendorRisk')}>Risk</th>}
                    {visibleColumns.approvalStatus && <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('approvalStatus')}>Approval</th>}
                    <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] font-sans text-xs sm:text-[13px] font-medium text-[#0F172A]">
                  {sorted.map(p => {
                    const pendingAmt = Math.max(0, (p.amount || 0) - (p.totalPaid || 0));
                    
                    // Priority Pill mapping
                    const priorityPillColors = {
                      critical: 'bg-rose-50 text-rose-700 border-rose-200',
                      high: 'bg-amber-50 text-amber-700 border-amber-200',
                      medium: 'bg-blue-50 text-blue-700 border-blue-200',
                      low: 'bg-slate-50 text-slate-700 border-slate-200',
                    };

                    // Risk Pill mapping
                    const riskPillColors = {
                      critical: 'bg-rose-50 text-rose-700 border-rose-200',
                      high_risk: 'bg-orange-50 text-orange-700 border-orange-200',
                      medium_risk: 'bg-amber-50 text-amber-700 border-amber-200',
                      low_risk: 'bg-emerald-50 text-emerald-750 border-emerald-200',
                    };

                    // Approval Colors
                    const approvalBadgeColors = {
                      draft: 'bg-slate-50 text-slate-600 border-slate-200',
                      pending: 'bg-amber-50 text-amber-700 border-amber-200',
                      finance_review: 'bg-purple-50 text-purple-700 border-purple-250',
                      approved: 'bg-blue-50 text-blue-700 border-blue-200',
                      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
                      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    };

                    // WhatsApp link template generator
                    const waRemindUrl = () => {
                      const msg = `Dear ${p.vendorName}, regarding your Invoice ${p.invoiceNumber || ''} for ${formatCurrency(p.amount)}. Outstanding balance is ${formatCurrency(pendingAmt)}. Please provide your settlement timelines. Thanks.`;
                      return `https://wa.me/91?text=${encodeURIComponent(msg)}`;
                    };

                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedPaymentIds.includes(p.id)}
                            onChange={() => toggleSelectPayment(p.id)}
                            className="rounded accent-blue-600"
                          />
                        </td>

                        {/* Vendor Name */}
                        {visibleColumns.vendor && (
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-[10px] shrink-0 border border-slate-200">
                                {getInitials(p.vendorName)}
                              </div>
                              <span className="font-semibold text-[#0F172A] group-hover:text-blue-600 cursor-pointer" onClick={() => setSelectedPayment(p)}>
                                {p.vendorName}
                              </span>
                              {p.priority === 'critical' && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Critical priority item" />
                              )}
                            </div>
                          </td>
                        )}

                        {/* Category */}
                        {visibleColumns.category && (
                          <td className="p-4">
                            <span className="text-slate-655 font-semibold uppercase tracking-[0.05em] text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                              {p.category || 'Other'}
                            </span>
                          </td>
                        )}

                        {/* Invoice Number */}
                        {visibleColumns.invoice && (
                          <td className="p-4 text-[#64748B] font-medium [font-variant-numeric:tabular-nums]">
                            {p.invoiceNumber || '—'}
                          </td>
                        )}

                        {/* Invoice Value */}
                        {visibleColumns.amount && (
                          <td className="p-4 font-semibold text-[#0F172A] [font-variant-numeric:tabular-nums]">
                            {formatCurrency(p.amount)}
                          </td>
                        )}

                        {/* Settled Paid */}
                        {visibleColumns.paid && (
                          <td className="p-4 text-emerald-600 font-semibold [font-variant-numeric:tabular-nums]">
                            {p.totalPaid ? formatCurrency(p.totalPaid) : 'Rs 0'}
                          </td>
                        )}

                        {/* Outstanding Pending */}
                        {visibleColumns.outstanding && (
                          <td className="p-4">
                            <span className={pendingAmt > 0 ? 'text-rose-600 font-semibold [font-variant-numeric:tabular-nums]' : 'text-slate-400 font-medium'}>
                              {pendingAmt > 0 ? formatCurrency(pendingAmt) : 'Settled'}
                            </span>
                          </td>
                        )}

                        {/* Due Date */}
                        {visibleColumns.dueDate && (
                          <td className="p-4 text-[#64748B] font-medium [font-variant-numeric:tabular-nums]">
                            <span>{formatDate(p.paymentDueDate)}</span>
                          </td>
                        )}

                        {/* Overdue Age / Days Left */}
                        {visibleColumns.daysRemaining && (
                          <td className="p-4">
                            {p.paymentStatus === 'paid' ? (
                              <span className="text-slate-400 font-medium italic">Settled</span>
                            ) : p.overdueDays > 0 ? (
                              <span className="text-rose-600 font-semibold text-[10px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100 [font-variant-numeric:tabular-nums] animate-pulse">
                                {p.overdueDays}d overdue
                              </span>
                            ) : (
                              <span className="text-[#64748B] font-medium [font-variant-numeric:tabular-nums]">
                                {p.paymentDueDate ? `${Math.ceil((p.paymentDueDate.toDate ? p.paymentDueDate.toDate().getTime() - new Date().getTime() : new Date(p.paymentDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d left` : '—'}
                              </span>
                            )}
                          </td>
                        )}

                        {/* Vendor Risk */}
                        {visibleColumns.riskLevel && (
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-[0.05em] ${riskPillColors[p.vendorRisk || 'low_risk']}`}>
                              {(p.vendorRisk || 'low_risk').replace('_', ' ')}
                            </span>
                          </td>
                        )}

                        {/* Approval Status */}
                        {visibleColumns.approvalStatus && (
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-[0.05em] ${approvalBadgeColors[p.approvalStatus || 'draft']}`}>
                              {(p.approvalStatus || 'draft').replace('_', ' ')}
                            </span>
                          </td>
                        )}

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedPayment(p)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-450 hover:text-slate-700"
                              title="Quick View Logs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => { setEditing(p); setShowModal(true); }}
                              className="p-1 rounded hover:bg-blue-50 text-blue-600"
                              title="Edit invoice"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={waRemindUrl()}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded hover:bg-emerald-50 text-emerald-600"
                              title="WhatsApp Reminder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>

                            {p.approvalStatus !== 'approved' && p.approvalStatus !== 'paid' && (
                              <button
                                onClick={() => updateOutgoingPayment(p.id, { approvalStatus: 'approved' })}
                                className="p-1 rounded hover:bg-emerald-50 text-emerald-600"
                                title="Approve Payment"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <DeleteButton onClick={() => deleteOutgoing(p.id, p.vendorName)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View: Cards */}
          <div className="md:hidden space-y-3 font-sans">
            {sorted.map(p => {
              const pendingAmt = Math.max(0, (p.amount || 0) - (p.totalPaid || 0));
              return (
                <div key={p.id} className="bg-white border border-[#E2E8F0] rounded-[16px] p-4 space-y-3 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center font-semibold text-[10px]">
                        {getInitials(p.vendorName)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#0F172A] text-xs sm:text-[13px]">{p.vendorName}</h4>
                        <span className="text-[10px] sm:text-[11px] text-[#64748B] font-medium">{p.invoiceNumber || 'INV-N/A'}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-[0.05em] border ${p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-amber-50 text-amber-700 border-amber-250'}`}>
                      {p.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-50 text-[10px] sm:text-[11px] font-semibold text-[#64748B]">
                    <div>
                      <p className="text-[#64748B] uppercase tracking-[0.05em] text-[9px]">Category</p>
                      <p className="text-[#0F172A] font-semibold text-xs sm:text-[13px] mt-0.5 uppercase tracking-[0.05em]">{p.category || 'Other'}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B] uppercase tracking-[0.05em] text-[9px]">Outstanding</p>
                      <p className="text-rose-600 font-semibold text-xs sm:text-[13px] mt-0.5 [font-variant-numeric:tabular-nums]">{formatCurrency(pendingAmt)}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B] uppercase tracking-[0.05em] text-[9px]">Total Invoice</p>
                      <p className="text-[#0F172A] font-semibold text-xs sm:text-[13px] mt-0.5 [font-variant-numeric:tabular-nums]">{formatCurrency(p.amount)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-semibold text-[#64748B]">
                    <span className="text-[#64748B] [font-variant-numeric:tabular-nums]">Due: {formatDate(p.paymentDueDate)}</span>
                    <span className={`px-2 py-0.5 border rounded uppercase text-[9px] tracking-[0.05em] font-semibold ${
                      p.approvalStatus === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-650'
                    }`}>
                      {p.approvalStatus || 'draft'}
                    </span>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
                    <button
                      onClick={() => setSelectedPayment(p)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-650 text-[10px] sm:text-[11px] font-semibold hover:bg-slate-50"
                    >
                      Insights
                    </button>
                    <button
                      onClick={() => { setEditing(p); setShowModal(true); }}
                      className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-[10px] sm:text-[11px] font-semibold hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <a
                      href={`https://wa.me/91?text=Hi, reminding regarding Outstanding invoice balance of ${formatCurrency(pendingAmt)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] sm:text-[11px] font-semibold hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail Slide out Sidebar */}
      {selectedPayment && (
        <OutgoingDetailPanel
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onSaveNotes={async (id, notesText) => {
            await updateOutgoingPayment(id, { remarks: notesText });
            setSelectedPayment(prev => prev && prev.id === id ? { ...prev, remarks: notesText } : prev);
            toast.success('Notes saved successfully');
          }}
          allPayments={outgoingPayments}
        />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <OutgoingModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={editing ? handleEdit : handleAdd}
          members={activeMembers}
          editing={editing}
        />
      )}

      {/* Delete Confirmation */}
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

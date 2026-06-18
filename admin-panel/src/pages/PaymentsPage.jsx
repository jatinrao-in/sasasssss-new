import { useState, useMemo, useEffect } from 'react';
import {
  Plus, X, Search, DollarSign, TrendingUp, Clock, AlertTriangle,
  FileText, Download, Eye, CheckCircle2, BarChart3, Mail,
  MessageSquare, Phone, Check, SlidersHorizontal, ArrowUpRight,
  HelpCircle, FileCheck2, ShieldAlert, ChevronRight, PhoneCall
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, Cell } from 'recharts';
import { usePayments } from '../hooks/usePayments';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatCurrency, formatDate, formatLakhs } from '../lib/formatters';
import { notifyPaymentAssigned } from '../lib/notify';

import { exportCSV, exportExcel, flattenForExport } from '../lib/exportUtils';
import { SkeletonTable, SkeletonStatCards } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const PAYMENT_COLUMNS = [
  { key: 'customerName', label: 'Customer' },
  { key: 'invoiceNumber', label: 'Invoice' },
  { key: 'amount', label: 'Amount' },
  { key: 'totalPaid', label: 'Paid' },
  { key: 'paymentStatus', label: 'Status' },
  { key: 'targetPaymentDate', label: 'Due Date' },
  { key: 'overdueDays', label: 'Overdue' },
];

function PaymentModal({ onClose, onSubmit, members, editing }) {
  const [form, setForm] = useState({
    customerName: editing?.customerName || '',
    invoiceNumber: editing?.invoiceNumber || '',
    amount: editing?.amount || '',
    totalPaid: editing?.totalPaid || 0,
    paymentStatus: editing?.paymentStatus || 'pending',
    targetPaymentDate: editing?.targetPaymentDate
      ? (typeof editing.targetPaymentDate.toDate === 'function' ? editing.targetPaymentDate.toDate().toISOString().split('T')[0] : new Date(editing.targetPaymentDate).toISOString().split('T')[0])
      : '',
    nextFollowupDate: editing?.nextFollowupDate
      ? (typeof editing.nextFollowupDate.toDate === 'function' ? editing.nextFollowupDate.toDate().toISOString().split('T')[0] : new Date(editing.nextFollowupDate).toISOString().split('T')[0])
      : '',
    assignedTo: editing?.assignedTo || '',
    assignedToName: editing?.assignedToName || '',
    remarks: editing?.remarks || '',
    partialPayment: '',
    riskScore: editing?.riskScore !== undefined ? editing.riskScore : (editing?.overdueDays > 60 ? 90 : editing?.overdueDays > 30 ? 65 : editing?.overdueDays > 0 ? 40 : 15),
  });
  const [saving, setSaving] = useState(false);

  const netPending = Number(form.amount || 0) - Number(form.totalPaid || 0);

  const handleSubmit = async () => {
    if (!form.customerName || !form.amount) return;
    setSaving(true);
    try {
      let finalTotalPaid = 0;
      let finalStatus = form.paymentStatus;

      if (editing) {
        const partial = Number(form.partialPayment || 0);
        finalTotalPaid = Number(form.totalPaid || 0) + partial;
      } else {
        if (form.paymentStatus === 'received') {
          finalTotalPaid = Number(form.amount || 0);
        } else if (form.paymentStatus === 'partial') {
          finalTotalPaid = Number(form.totalPaid || 0);
        } else {
          finalTotalPaid = 0;
        }
      }

      if (finalTotalPaid >= Number(form.amount || 0) && Number(form.amount || 0) > 0) {
        finalStatus = 'received';
      } else if (finalTotalPaid > 0) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'pending';
      }

      const netPendingVal = Math.max(0, Number(form.amount || 0) - finalTotalPaid);

      await onSubmit({
        customerName: form.customerName,
        invoiceNumber: form.invoiceNumber,
        amount: Number(form.amount),
        totalPaid: finalTotalPaid,
        paymentStatus: finalStatus,
        targetPaymentDate: form.targetPaymentDate ? Timestamp.fromDate(new Date(form.targetPaymentDate)) : null,
        nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
        assignedTo: form.assignedTo,
        assignedToName: form.assignedToName,
        remarks: form.remarks,
        netPendingAmount: netPendingVal,
        netPending: netPendingVal,
        riskScore: Number(form.riskScore) || 20,
      });
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{editing ? 'Edit' : 'Add'} Payment Record</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto bg-white flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Name *</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Enter client/company name"
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice Number</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="e.g. SAPL/25/001"
                value={form.invoiceNumber}
                onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Value (Rs) *</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.paymentStatus}
                onChange={e => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
              </select>
            </div>
          </div>

          {editing ? (
            <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Total Paid to Date:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(form.totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Outstanding Pending Balance:</span>
                <span className="font-bold text-rose-600">{formatCurrency(netPending)}</span>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Log Partial/Incremental Payment (Rs)</label>
                <input
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-white"
                  type="number"
                  placeholder="Enter paid amount to add"
                  value={form.partialPayment}
                  onChange={e => setForm({ ...form, partialPayment: e.target.value })}
                />
              </div>
            </div>
          ) : (
            form.paymentStatus === 'partial' && (
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Paid Amount (Rs)</label>
                <input
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-sm bg-white"
                  type="number"
                  placeholder="0"
                  value={form.totalPaid}
                  onChange={e => setForm({ ...form, totalPaid: e.target.value })}
                />
              </div>
            )
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Risk Score (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                value={form.riskScore}
                onChange={e => setForm({ ...form, riskScore: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-sm bg-slate-50/30 font-semibold"
                type="date"
                value={form.targetPaymentDate}
                onChange={e => setForm({ ...form, targetPaymentDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign Executive</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.assignedTo}
                onChange={e => {
                  const m = members.find(m => m.id === e.target.value);
                  setForm({ ...form, assignedTo: e.target.value, assignedToName: m?.name || '' });
                }}
              >
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Follow-up Date</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none text-sm bg-slate-50/30 font-semibold"
                type="date"
                value={form.nextFollowupDate}
                onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Internal Remarks</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={2}
              value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100/50 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm font-semibold"
          >
            {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ payment, onClose }) {
  const handleDownload = () => {
    const el = document.getElementById('payment-receipt');
    if (!el) return;
    const pw = window.open('', '_blank');
    pw.document.write(`<html><head><title>Receipt - ${payment.customerName}</title>
    <style>body{font-family:Inter,sans-serif;padding:40px;color:#111}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:10px 14px;border:1px solid #e5e7eb;text-align:left;font-size:13px}th{background:#f9fafb;font-weight:600}.text-right{text-align:right}.total{font-weight:bold;background:#f0fdfa;font-size:16px}</style>
    </head><body>${el.innerHTML}</body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-100 scale-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            <span>Invoice Payment Receipt</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div id="payment-receipt" className="space-y-4">
          <div className="text-center border-b border-slate-100 pb-4">
            <h3 className="text-lg font-extrabold text-slate-900">PAYMENT RECEIPT</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Reference Invoice: {payment.invoiceNumber || 'N/A'}</p>
          </div>
          <table className="w-full text-xs text-slate-700">
            <tbody>
              <tr className="border-b border-slate-100"><td className="py-2.5 font-semibold text-slate-400">Customer</td><td className="py-2.5 font-bold text-right text-slate-800">{payment.customerName}</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2.5 font-semibold text-slate-400">Total Invoice Value</td><td className="py-2.5 font-bold text-right text-slate-800">{formatCurrency(payment.amount)}</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2.5 font-semibold text-slate-400">Amount Received</td><td className="py-2.5 font-bold text-right text-emerald-600">{formatCurrency(payment.totalPaid || 0)}</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2.5 font-semibold text-slate-400">Pending Balance</td><td className="py-2.5 font-bold text-right text-rose-600">{formatCurrency(Math.max(0, (payment.amount || 0) - (payment.totalPaid || 0)))}</td></tr>
              <tr className="border-b border-slate-100"><td className="py-2.5 font-semibold text-slate-400">Due Date</td><td className="py-2.5 font-bold text-right text-slate-800">{formatDate(payment.targetPaymentDate)}</td></tr>
              <tr><td className="py-2.5 font-semibold text-slate-400">Collection Status</td><td className="py-2.5 font-extrabold text-right text-sm text-blue-600 uppercase tracking-wide">{payment.paymentStatus}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PaymentDetailPanel({ payment, onClose, onSaveNotes, allPayments }) {
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

  const getHealthPill = (health) => {
    const map = {
      healthy: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      due_soon: 'bg-blue-50 text-blue-700 border border-blue-200',
      at_risk: 'bg-amber-50 text-amber-700 border border-amber-200',
      critical: 'bg-rose-50 text-rose-700 border border-rose-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${map[health] || 'bg-slate-50 text-slate-600'}`}>
        {health.replace('_', ' ')}
      </span>
    );
  };

  // Customer aggregates
  const customerPayments = allPayments.filter(p => p.customerName === payment.customerName);
  const customerTotalInvoiced = customerPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const customerTotalPaid = customerPayments.reduce((s, p) => s + (p.totalPaid || 0), 0);
  const customerTotalPending = Math.max(0, customerTotalInvoiced - customerTotalPaid);

  const phone = (payment.contactPhone || payment.phone || '').replace(/\D/g, '');
  const waLink = phone ? `https://wa.me/91${phone.length > 10 ? phone.slice(-10) : phone}` : null;
  const telLink = payment.contactPhone || payment.phone ? `tel:${payment.contactPhone || payment.phone}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md h-full shadow-2xl overflow-y-auto border-l border-slate-100 flex flex-col slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Collection Insights</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
            {getInitials(payment.customerName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate text-base">{payment.customerName}</p>
            <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">Invoice: {payment.invoiceNumber || 'N/A'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4 bg-white">
          {[
            { id: 'details', label: 'Details' },
            { id: 'customer', label: 'Customer History' },
            { id: 'notes', label: 'Finance Notes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable container */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Status</p>
                  <span className="text-xs font-bold text-slate-800 uppercase">{payment.paymentStatus}</span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Payment Health</p>
                  <p>{getHealthPill(payment.overdueDays > 60 ? 'critical' : payment.overdueDays > 30 ? 'at_risk' : payment.overdueDays > 0 ? 'at_risk' : 'healthy')}</p>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Risk Score</p>
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {payment.riskScore !== undefined ? payment.riskScore : 25}/100
                  </span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Overdue Age</p>
                  <span className="text-xs font-bold text-slate-800">{payment.overdueDays || 0} Days Overdue</span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Invoiced Value</p>
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(payment.amount)}</p>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Paid</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(payment.totalPaid)}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-[#E2E8F0] rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Assigned Collector:</span>
                  <span className="text-slate-800 font-bold">{payment.assignedToName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Assigned Date:</span>
                  <span className="text-slate-800 font-bold">{formatDate(payment.assignedDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Due Date:</span>
                  <span className="text-blue-600 font-extrabold">{formatDate(payment.targetPaymentDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Next Follow-up Date:</span>
                  <span className="text-slate-800 font-bold">{formatDate(payment.nextFollowupDate)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Customer Portfolio</p>
                <p className="text-3xl font-black">{formatCurrency(customerTotalInvoiced)}</p>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Total Paid</span>
                    <span className="font-bold text-emerald-400 block mt-0.5">{formatCurrency(customerTotalPaid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Outstanding Balance</span>
                    <span className="font-bold text-rose-400 block mt-0.5">{formatCurrency(customerTotalPending)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Invoice History</p>
                {customerPayments.map(p => (
                  <div key={p.id} className="flex justify-between items-center border border-slate-100 p-3 rounded-lg text-xs bg-slate-50/20">
                    <div>
                      <p className="font-bold text-slate-800">{p.invoiceNumber || 'Invoice'}</p>
                      <p className="text-[10px] text-slate-450 mt-0.5 font-semibold">Due {formatDate(p.targetPaymentDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{formatCurrency(p.amount)}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${p.paymentStatus === 'received' ? 'text-emerald-600' : 'text-amber-500'}`}>{p.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Collection Remarks & Follow-up Logs</label>
                <textarea
                  className="w-full h-60 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium bg-slate-50/20 leading-relaxed resize-none"
                  placeholder="Record customer commitment dates, calls feedback, collection status..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full h-10 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-850 disabled:opacity-50 transition-all shadow-sm"
              >
                {savingNotes ? 'Saving Notes...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const toast = useToast();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { payments, loading, addPayment, updatePayment, deletePayment } = usePayments();
  const { members } = useTeam();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showReceipt, setShowReceipt] = useState(null);
  const [showAging, setShowAging] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  
  // Custom states
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [activeInsightFilter, setActiveInsightFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'targetPaymentDate', direction: 'asc' });

  const [visibleColumns, setVisibleColumns] = useState({
    customer: true,
    invoice: true,
    invoiceValue: true,
    received: true,
    pending: true,
    daysOverdue: true,
    paymentHealth: true,
    riskScore: true,
    assignedExecutive: true,
    assignedDate: true,
    status: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isOverdue = (timestamp, status) => {
    if (!timestamp || status === 'received') return false;
    const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    today.setHours(0,0,0,0);
    const dateZero = new Date(date);
    dateZero.setHours(0,0,0,0);
    return dateZero < today;
  };

  const isExpectedThisWeek = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    today.setHours(0,0,0,0);
    nextWeek.setHours(23,59,59,999);
    return date >= today && date <= nextWeek;
  };

  // 1. Filtering Invoices
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = search === '' ||
        (p.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = filterStatus === 'All' || p.paymentStatus === filterStatus;

      let matchInsight = true;
      if (activeInsightFilter === 'overdue') {
        matchInsight = p.paymentStatus !== 'received' && (p.overdueDays || 0) > 0;
      } else if (activeInsightFilter === 'due_today') {
        matchInsight = p.paymentStatus !== 'received' && isToday(p.targetPaymentDate);
      } else if (activeInsightFilter === 'expected_week') {
        matchInsight = p.paymentStatus !== 'received' && isExpectedThisWeek(p.targetPaymentDate);
      } else if (activeInsightFilter === 'risk') {
        const risk = p.riskScore !== undefined ? p.riskScore : (p.overdueDays > 60 ? 90 : p.overdueDays > 30 ? 65 : p.overdueDays > 0 ? 40 : 15);
        matchInsight = p.paymentStatus !== 'received' && risk >= 60;
      }

      return matchSearch && matchStatus && matchInsight;
    });
  }, [payments, search, filterStatus, activeInsightFilter]);

  // 2. Sorting Invoices
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (!sortConfig.key) return list;

    list.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'pending') {
        aVal = Math.max(0, (a.amount || 0) - (a.totalPaid || 0));
        bVal = Math.max(0, (b.amount || 0) - (b.totalPaid || 0));
      }

      if (sortConfig.key === 'riskScore') {
        aVal = aVal !== undefined ? Number(aVal) : (a.overdueDays > 60 ? 90 : a.overdueDays > 30 ? 65 : a.overdueDays > 0 ? 40 : 15);
        bVal = bVal !== undefined ? Number(bVal) : (b.overdueDays > 60 ? 90 : b.overdueDays > 30 ? 65 : b.overdueDays > 0 ? 40 : 15);
      }

      if (sortConfig.key === 'targetPaymentDate' || sortConfig.key === 'assignedDate' || sortConfig.key === 'createdAt') {
        aVal = aVal?.toDate?.() || (aVal ? new Date(aVal) : new Date(0));
        bVal = bVal?.toDate?.() || (bVal ? new Date(bVal) : new Date(0));
      }

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      aVal = aVal === undefined || aVal === null ? 0 : Number(aVal);
      bVal = bVal === undefined || bVal === null ? 0 : Number(bVal);

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [filtered, sortConfig]);

  // 3. Selection
  const selectedPaymentSet = useMemo(() => new Set(selectedPaymentIds), [selectedPaymentIds]);
  const visiblePaymentIds = useMemo(() => sorted.map((payment) => payment.id), [sorted]);
  const allVisibleSelected = visiblePaymentIds.length > 0 && visiblePaymentIds.every((paymentId) => selectedPaymentSet.has(paymentId));

  const togglePaymentSelection = (paymentId) => {
    setSelectedPaymentIds((prev) => (
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]
    ));
  };

  const toggleAllVisiblePayments = () => {
    setSelectedPaymentIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((paymentId) => !visiblePaymentIds.includes(paymentId));
      }
      return Array.from(new Set([...prev, ...visiblePaymentIds]));
    });
  };

  // 4. Financial Calculations
  const metrics = useMemo(() => {
    const totalInvoiced = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalReceived = payments.reduce((s, p) => s + Number(p.totalPaid || 0), 0);
    const totalPending = payments.reduce((s, p) => s + Math.max(0, Number(p.amount || 0) - Number(p.totalPaid || 0)), 0);
    const overdueAmount = payments.filter(p => p.paymentStatus !== 'received' && (p.overdueDays || 0) > 0).reduce((s, p) => s + Math.max(0, Number(p.amount || 0) - Number(p.totalPaid || 0)), 0);
    const overdueCount = payments.filter(p => p.paymentStatus !== 'received' && (p.overdueDays || 0) > 0).length;
    const collectionEff = totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0;

    // Alert centers aggregates
    const dueTodayCount = payments.filter(p => p.paymentStatus !== 'received' && isToday(p.targetPaymentDate)).length;
    const expectedThisWeekCount = payments.filter(p => p.paymentStatus !== 'received' && isExpectedThisWeek(p.targetPaymentDate)).length;
    const collectionRiskCount = payments.filter(p => {
      const score = p.riskScore !== undefined ? p.riskScore : (p.overdueDays > 60 ? 90 : p.overdueDays > 30 ? 65 : p.overdueDays > 0 ? 40 : 15);
      return p.paymentStatus !== 'received' && score >= 60;
    }).length;

    return { totalInvoiced, totalReceived, totalPending, overdueAmount, overdueCount, collectionEff, dueTodayCount, expectedThisWeekCount, collectionRiskCount };
  }, [payments]);

  // Aging Analysis Buckets
  const agingBuckets = useMemo(() => {
    const buckets = { '0-30': [], '31-60': [], '61-90': [], '90+': [] };
    payments.filter(p => p.paymentStatus !== 'received').forEach(p => {
      const days = p.overdueDays || 0;
      if (days <= 30) buckets['0-30'].push(p);
      else if (days <= 60) buckets['31-60'].push(p);
      else if (days <= 90) buckets['61-90'].push(p);
      else buckets['90+'].push(p);
    });
    return buckets;
  }, [payments]);

  const agingChart = Object.entries(agingBuckets).map(([bucket, items]) => ({
    name: bucket,
    count: items.length,
    amount: items.reduce((s, p) => s + Number(p.amount || 0) - Number(p.totalPaid || 0), 0),
  }));

  // Cash Flow grouping by Month
  const cashFlowChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dataMap = {};
    
    // Last 6 months
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mName = months[d.getMonth()];
      dataMap[mName] = { name: mName, Received: 0, Outstanding: 0, Expected: 0, sortKey: d.getTime() };
    }

    payments.forEach(p => {
      const rawDate = p.targetPaymentDate || p.createdAt;
      if (!rawDate) return;
      const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
      const mName = months[date.getMonth()];
      if (dataMap[mName]) {
        const pending = Math.max(0, Number(p.amount || 0) - Number(p.totalPaid || 0));
        const paid = Number(p.totalPaid || 0);
        dataMap[mName].Received += paid;
        dataMap[mName].Outstanding += pending;
        dataMap[mName].Expected += Number(p.amount || 0);
      }
    });

    return Object.values(dataMap).sort((a, b) => a.sortKey - b.sortKey);
  }, [payments]);

  // Invoice Funnel Section Metrics
  const funnelMetrics = useMemo(() => {
    const totalCount = payments.length || 1;
    const totalValue = metrics.totalInvoiced || 1;

    const invoiced = { count: payments.length, amount: metrics.totalInvoiced, pct: 100 };
    
    const partial = payments.filter(p => p.paymentStatus === 'partial');
    const partiallyPaid = {
      count: partial.length,
      amount: partial.reduce((s, p) => s + (p.amount - p.totalPaid), 0),
      pct: Math.round((partial.length / totalCount) * 100)
    };

    const dueSoonList = payments.filter(p => p.paymentStatus !== 'received' && isExpectedThisWeek(p.targetPaymentDate));
    const dueSoon = {
      count: dueSoonList.length,
      amount: dueSoonList.reduce((s, p) => s + (p.amount - p.totalPaid), 0),
      pct: Math.round((dueSoonList.length / totalCount) * 100)
    };

    const overdueList = payments.filter(p => p.paymentStatus !== 'received' && (p.overdueDays || 0) > 0);
    const overdue = {
      count: overdueList.length,
      amount: overdueList.reduce((s, p) => s + (p.amount - p.totalPaid), 0),
      pct: Math.round((overdueList.length / totalCount) * 100)
    };

    const collectedList = payments.filter(p => p.paymentStatus === 'received');
    const collected = {
      count: collectedList.length,
      amount: metrics.totalReceived,
      pct: Math.round((collectedList.length / totalCount) * 100)
    };

    return [
      { label: 'Invoiced', count: invoiced.count, amount: invoiced.amount, pct: invoiced.pct, color: 'border-l-blue-500' },
      { label: 'Partially Paid', count: partiallyPaid.count, amount: partiallyPaid.amount, pct: partiallyPaid.pct, color: 'border-l-indigo-500' },
      { label: 'Due Soon', count: dueSoon.count, amount: dueSoon.amount, pct: dueSoon.pct, color: 'border-l-purple-500' },
      { label: 'Overdue', count: overdue.count, amount: overdue.amount, pct: overdue.pct, color: 'border-l-rose-500' },
      { label: 'Collected', count: collected.count, amount: collected.amount, pct: collected.pct, color: 'border-l-emerald-500' }
    ];
  }, [payments, metrics]);

  // 6. Action Handlers
  const handleAdd = async (data) => {
    try {
      const fullData = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await addPayment(fullData);
      
      if (data.assignedTo) {
        const member = members.find(m => m.id === data.assignedTo);
        if (member?.whatsapp) {
          try { await notifyPaymentAssigned(member, fullData); }
          catch (e) { console.error('Notify error:', e); }
        }
      }
      toast.success('Payment invoice registered successfully!');
    } catch (err) {
      toast.error('Failed: ' + err.message);
      throw err;
    }
  };

  const handleEdit = async (data) => {
    try {
      const fullData = {
        ...data,
        updatedAt: Timestamp.now(),
      };
      await updatePayment(editing.id, fullData);
      toast.success('Payment details updated!');
    } catch (err) {
      toast.error('Update failed: ' + err.message);
      throw err;
    }
  };

  const handleSaveNotes = async (id, notesText) => {
    try {
      await updatePayment(id, { remarks: notesText, updatedAt: Timestamp.now() });
      toast.success('Collection remarks notes saved!');
      setSelectedPayment(prev => prev && prev.id === id ? { ...prev, remarks: notesText } : prev);
    } catch (e) {
      toast.error('Failed to save notes: ' + e.message);
    }
  };

  const handleMarkFullyPaid = async (paymentItem) => {
    try {
      await updatePayment(paymentItem.id, {
        paymentStatus: 'received',
        totalPaid: paymentItem.amount,
        netPending: 0,
        netPendingAmount: 0,
        updatedAt: Timestamp.now(),
      });
      toast.success(`Invoice ${paymentItem.invoiceNumber || 'payment'} marked fully received!`);
    } catch (err) {
      toast.error('Mark paid failed: ' + err.message);
    }
  };

  const deletePaymentRecord = (id, customerName) => {
    confirmDelete({
      title: 'Delete Payment Record',
      description: `Confirm deleting payment collection records for customer "${customerName}"?`,
      onConfirm: async () => {
        await deletePayment(id);
        setSelectedPaymentIds((prev) => prev.filter((pid) => pid !== id));
        if (selectedPayment?.id === id) setSelectedPayment(null);
        toast.success('Collection record deleted');
      },
    });
  };

  const bulkDeletePayments = () => {
    const idsToDelete = selectedPaymentIds.filter((id) => payments.some((payment) => payment.id === id));
    if (idsToDelete.length === 0) return;

    confirmDelete({
      title: `Delete ${idsToDelete.length} Collections`,
      description: `Permanently delete ${idsToDelete.length} selected payment records? This cannot be undone.`,
      onConfirm: async () => {
        await Promise.all(idsToDelete.map((id) => deletePayment(id)));
        setSelectedPaymentIds([]);
        toast.success('Bulk deletion completed');
      },
    });
  };

  const handleExport = (format) => {
    const data = flattenForExport(filtered, PAYMENT_COLUMNS);
    if (format === 'csv') exportCSV(data, 'payments_collections');
    else exportExcel(data, 'payments_collections');
  };

  const handleSortClick = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Custom visual components
  const getHealthBadge = (overdueDays, status) => {
    if (status === 'received') return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">Healthy</span>;
    if (overdueDays > 60) return <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-255">Critical</span>;
    if (overdueDays > 0) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-255">At Risk</span>;
    return <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-255">Due Soon</span>;
  };

  const getRiskIndicator = (riskVal, overdueDays) => {
    const score = riskVal !== undefined ? Number(riskVal) : (overdueDays > 60 ? 90 : overdueDays > 30 ? 65 : overdueDays > 0 ? 40 : 15);
    let color = 'bg-slate-200';
    let text = 'text-slate-600';
    if (score >= 75) {
      color = 'bg-rose-500';
      text = 'text-rose-600 font-extrabold';
    } else if (score >= 40) {
      color = 'bg-amber-500';
      text = 'text-amber-600 font-bold';
    } else {
      color = 'bg-emerald-500';
      text = 'text-emerald-600 font-semibold';
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
          <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-[10px] ${text}`}>{score}%</span>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const statusColors = { pending: 'bg-amber-55 text-amber-700 border-amber-100', partial: 'bg-blue-55 text-blue-700 border-blue-100', received: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusColors[status] || 'bg-slate-50'}`}>{status}</span>;
  };

  const renderExecAvatar = (assignedToId, nameFallback) => {
    const member = members.find(m => m.id === assignedToId);
    const name = member?.name || nameFallback || 'Unassigned';
    const initials = getInitials(name);

    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    const colorClass = colors[sum % colors.length];

    if (member?.avatarUrl) {
      return (
        <img src={member.avatarUrl} alt={name} className="w-7 h-7 rounded-full object-cover border border-slate-100" />
      );
    }
    return (
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${colorClass}`}>
        {initials}
      </div>
    );
  };

  const getExecRole = (assignedToId) => {
    const member = members.find(m => m.id === assignedToId);
    return member?.designation || member?.role || 'Collector';
  };

  // Sparkline data generator
  const getSparklineData = (value) => {
    const seed = value ? Number(value) : 100;
    return [
      { value: seed * 0.7 },
      { value: seed * 0.95 },
      { value: seed * 0.8 },
      { value: seed * 1.1 },
      { value: seed * 1.0 }
    ];
  };

  return (
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-16">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Payment Management</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-semibold">
            {payments.length} Payments &nbsp;·&nbsp; {metrics.collectionEff}% Collection Rate
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showAnalytics ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </button>
          
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 hidden group-hover:block z-10 w-32">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 font-bold text-slate-700">CSV</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 font-bold text-slate-700">Excel</button>
            </div>
          </div>
          
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="h-10 px-4 rounded-[12px] bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Payment</span>
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { id: 'invoiced', label: 'Total Invoiced', value: metrics.totalInvoiced, icon: DollarSign, color: 'bg-blue-50 text-blue-600', isCurrency: true },
          { id: 'received', label: 'Received', value: metrics.totalReceived, icon: FileCheck2, color: 'bg-emerald-50 text-emerald-600', isCurrency: true },
          { id: 'pending', label: 'Pending Collections', value: metrics.totalPending, icon: Clock, color: 'bg-amber-50 text-amber-600', isCurrency: true },
          { id: 'overdue', label: 'Overdue Collections', value: metrics.overdueAmount, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600', isCurrency: true },
          { id: 'collection_rate', label: 'Collection Rate', value: `${metrics.collectionEff}%`, icon: TrendingUp, color: 'bg-teal-50 text-teal-600', isCurrency: false }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-center">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${stat.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="w-16 h-8 opacity-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getSparklineData(stat.value)}>
                      <Area type="monotone" dataKey="value" stroke="#64748B" fill="#F1F5F9" strokeWidth={1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider truncate">{stat.label}</p>
                <p className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight truncate">
                  {stat.isCurrency ? (
                    <CountUpNumber end={stat.value} formatter={v => formatCurrency(Math.round(v))} />
                  ) : stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Collection Funnel Progress */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span>Invoice Collections Funnel</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {funnelMetrics.map((stage, i) => (
            <div
              key={i}
              className={`bg-slate-50/50 border border-[#E2E8F0] border-l-4 ${stage.color} rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow`}
            >
              <div>
                <p className="text-xs font-bold text-slate-500">{stage.label}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{stage.count} Invoices</p>
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold text-slate-700">{formatLakhs(stage.amount)}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{stage.pct}% count ratio</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Finance Alert Center (Clickable Triage) */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>Finance Alert Desk (Click to view filtered invoices)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'overdue', title: '🔴 Overdue Invoices', count: metrics.overdueCount, amount: metrics.overdueAmount, desc: 'Collections past due targets', activeColor: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' },
            { id: 'due_today', title: '⚠ Due Today', count: metrics.dueTodayCount, amount: payments.filter(p => p.paymentStatus !== 'received' && isToday(p.targetPaymentDate)).reduce((s, p) => s + (p.amount - p.totalPaid), 0), desc: 'Payments targets due today', activeColor: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' },
            { id: 'expected_week', title: '💰 Expected This Week', count: metrics.expectedThisWeekCount, amount: payments.filter(p => p.paymentStatus !== 'received' && isExpectedThisWeek(p.targetPaymentDate)).reduce((s, p) => s + (p.amount - p.totalPaid), 0), desc: 'Collections scheduled in 7 days', activeColor: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' },
            { id: 'risk', title: '📉 Collection Risk', count: metrics.collectionRiskCount, amount: payments.filter(p => { const risk = p.riskScore !== undefined ? p.riskScore : (p.overdueDays > 60 ? 90 : p.overdueDays > 30 ? 65 : p.overdueDays > 0 ? 40 : 15); return p.paymentStatus !== 'received' && risk >= 60; }).reduce((s, p) => s + (p.amount - p.totalPaid), 0), desc: 'Risk profile index score >= 60', activeColor: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20' }
          ].map(widget => {
            const isActive = activeInsightFilter === widget.id;
            return (
              <button
                key={widget.id}
                onClick={() => setActiveInsightFilter(isActive ? null : widget.id)}
                className={`text-left border border-slate-200 rounded-xl p-4 transition-all duration-200 bg-slate-50/5 hover:border-slate-400 ${isActive ? widget.activeColor : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">{widget.title}</span>
                  {isActive && <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 uppercase">Filtered</span>}
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-slate-900">{widget.count} Invoices</span>
                </div>
                <p className="text-sm font-bold text-slate-700 mt-1">{formatCurrency(widget.amount)}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">{widget.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Aging buckets & cash flow monthly forecasting */}
      {showAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Aging buckets */}
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Aging Receivables Analysis</span>
            </h3>
            <div className="space-y-3">
              {agingChart.map((bucket, index) => {
                const colorsMap = ['bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500'];
                const textColors = ['text-emerald-600', 'text-amber-600', 'text-orange-600', 'text-rose-600'];
                return (
                  <div key={bucket.name} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/30 text-xs">
                    <div>
                      <p className={`font-bold uppercase tracking-wider ${textColors[index]}`}>{bucket.name} Days</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{bucket.count} outstanding invoices</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-800">{formatCurrency(bucket.amount)}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <div className="w-16 bg-slate-150 h-1.5 rounded-full overflow-hidden shrink-0">
                          <div className={`h-full ${colorsMap[index]}`} style={{ width: `${metrics.totalPending > 0 ? (bucket.amount / metrics.totalPending) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Cash flow forecasting */}
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-650" />
              <span>Monthly Cash Flow Performance (Last 6 Months)</span>
            </h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} formatter={(v) => formatLakhs(v)} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="Received" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outstanding" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded" /><span>Received</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded" /><span>Outstanding</span></div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Sticky Filter Toolbar */}
      <div className="sticky top-16 z-20 bg-white border border-[#E2E8F0] rounded-[16px] min-h-14 py-3 md:py-0 px-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers, invoices..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs bg-slate-50/30 font-medium text-slate-900"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Action controls selectors */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30 cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">All Invoices</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
          </select>

          <button
            onClick={() => setShowAging(!showAging)}
            className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-all ${
              showAging ? 'bg-amber-50 border-amber-250 text-amber-700 font-bold shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Aging Summary
          </button>

          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30 cursor-pointer"
            value={`${sortConfig.key}_${sortConfig.direction}`}
            onChange={e => {
              const val = e.target.value;
              const idx = val.lastIndexOf('_');
              setSortConfig({ key: val.substring(0, idx), direction: val.substring(idx + 1) });
            }}
          >
            <option value="targetPaymentDate_asc">Due Date (Soonest)</option>
            <option value="targetPaymentDate_desc">Due Date (Latest)</option>
            <option value="amount_desc">Invoice Value (High-Low)</option>
            <option value="pending_desc">Outstanding Value (High)</option>
            <option value="riskScore_desc">Risk Score (Highest)</option>
            <option value="customerName_asc">Customer (A-Z)</option>
          </select>

          {/* Visibility toggle */}
          <div className="relative">
            <button
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="h-9 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100/50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>
            {showColumnToggle && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Toggle Columns</p>
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                      className="rounded accent-blue-600"
                    />
                    <span>{col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aging receivables overview */}
      {showAging && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-down">
          {Object.entries(agingBuckets).map(([bucket, items], i) => (
            <div key={bucket} className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: ['#10b981', '#f59e0b', '#f97316', '#ef4444'][i] }}>
                  {bucket} Days Overdue
                </h4>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full">{items.length} Invoices</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900">
                {formatCurrency(items.reduce((s, p) => s + (p.amount || 0) - (p.totalPaid || 0), 0))}
              </p>
              <div className="divide-y divide-slate-50 max-h-24 overflow-y-auto pr-1">
                {items.slice(0, 3).map(p => (
                  <div key={p.id} className="flex justify-between items-center text-[10px] py-1 text-slate-600">
                    <span className="truncate font-semibold max-w-[110px]">{p.customerName}</span>
                    <span className="font-bold">{formatCurrency((p.amount || 0) - (p.totalPaid || 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Bulk Action Drawer */}
      {selectedPaymentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-3 shadow-2xl flex flex-wrap items-center gap-5 transition-all duration-300 max-w-[95vw] sm:max-w-max">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-850">
            <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
              {selectedPaymentIds.length}
            </span>
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Selected</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reassign:</span>
              <select
                className="bg-slate-800 text-xs font-semibold text-white px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer max-w-[110px]"
                value=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const member = members.find(m => m.id === val);
                  if (!member) return;
                  try {
                    await Promise.all(selectedPaymentIds.map(id => updatePayment(id, { assignedTo: val, assignedToName: member.name })));
                    toast.success('Invoices reassigned successfully');
                    setSelectedPaymentIds([]);
                  } catch (err) {
                    toast.error('Reassign failed: ' + err.message);
                  }
                }}
              >
                <option value="">Select...</option>
                {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
              <select
                className="bg-slate-800 text-xs font-semibold text-white px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                value=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  try {
                    await Promise.all(selectedPaymentIds.map(id => {
                      const item = payments.find(p => p.id === id);
                      const paidVal = val === 'received' ? (item?.amount || 0) : (item?.totalPaid || 0);
                      return updatePayment(id, {
                        paymentStatus: val,
                        totalPaid: paidVal,
                        netPending: Math.max(0, (item?.amount || 0) - paidVal)
                      });
                    }));
                    toast.success('Statuses updated');
                    setSelectedPaymentIds([]);
                  } catch (err) {
                    toast.error('Failed: ' + err.message);
                  }
                }}
              >
                <option value="">Select...</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
              </select>
            </div>

            <button
              onClick={async () => {
                try {
                  await Promise.all(selectedPaymentIds.map(id => {
                    const item = payments.find(p => p.id === id);
                    return updatePayment(id, {
                      paymentStatus: 'received',
                      totalPaid: item?.amount || 0,
                      netPending: 0,
                      netPendingAmount: 0
                    });
                  }));
                  toast.success('Selected marked paid');
                  setSelectedPaymentIds([]);
                } catch (e) {
                  toast.error('Failed: ' + e.message);
                }
              }}
              className="font-semibold text-emerald-450 hover:text-emerald-400 transition-colors"
            >
              Mark Paid
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <button
              onClick={() => {
                const selectedData = payments.filter(p => selectedPaymentIds.includes(p.id));
                const headers = ['Customer', 'Invoice', 'Amount', 'Paid', 'Pending', 'Due Date', 'Status'];
                const rows = selectedData.map(p => [
                  p.customerName,
                  p.invoiceNumber || '',
                  p.amount || 0,
                  p.totalPaid || 0,
                  Math.max(0, (p.amount || 0) - (p.totalPaid || 0)),
                  formatDate(p.targetPaymentDate),
                  p.paymentStatus
                ]);
                const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `payments_bulk_export.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Bulk CSV generated');
                setSelectedPaymentIds([]);
              }}
              className="font-semibold text-slate-350 hover:text-white transition-colors"
            >
              Export Selected
            </button>

            <button
              onClick={bulkDeletePayments}
              className="font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>

            <button onClick={() => setSelectedPaymentIds([])} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 7. Primary Invoices Workspace */}
      {loading ? (
        <SkeletonTable rows={7} cols={11} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="noData"
          title="No invoice collections found"
          description={search || filterStatus !== 'All' || activeInsightFilter ? 'Try clearing your active filters or searches.' : 'Add your first CRM payment record to get started.'}
          actionLabel="New Payment"
          onAction={() => { setEditing(null); setShowModal(true); }}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left" data-export-table>
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisiblePayments}
                        className="rounded accent-blue-600"
                        title="Select visible"
                      />
                    </th>
                    {visibleColumns.customer && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('customerName')}>Customer</th>}
                    {visibleColumns.invoice && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('invoiceNumber')}>Invoice</th>}
                    {visibleColumns.invoiceValue && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('amount')}>Invoice Value</th>}
                    {visibleColumns.received && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('totalPaid')}>Received</th>}
                    {visibleColumns.pending && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('pending')}>Pending</th>}
                    {visibleColumns.daysOverdue && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('overdueDays')}>Overdue</th>}
                    {visibleColumns.paymentHealth && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">Health</th>}
                    {visibleColumns.riskScore && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('riskScore')}>Risk Index</th>}
                    {visibleColumns.assignedExecutive && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('assignedToName')}>Executive</th>}
                    {visibleColumns.assignedDate && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('assignedDate')}>Assigned Date</th>}
                    {visibleColumns.status && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('paymentStatus')}>Status</th>}
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {sorted.map(p => {
                    const pending = Math.max(0, (p.amount || 0) - (p.totalPaid || 0));
                    const isOverdueAlert = isOverdue(p.targetPaymentDate, p.paymentStatus);
                    const risk = p.riskScore !== undefined ? p.riskScore : (p.overdueDays > 60 ? 90 : p.overdueDays > 30 ? 65 : p.overdueDays > 0 ? 40 : 15);
                    const phone = (p.contactPhone || p.phone || '').replace(/\D/g, '');
                    const waLink = phone ? `https://wa.me/91${phone.length > 10 ? phone.slice(-10) : phone}` : null;
                    const telLink = p.contactPhone || p.phone ? `tel:${p.contactPhone || p.phone}` : null;
                    
                    // Pre-filled WhatsApp template
                    const waMessage = waLink ? `&text=${encodeURIComponent(`Dear Customer, this is a friendly reminder that Invoice ${p.invoiceNumber || ''} for Rs ${pending.toLocaleString('en-IN')} is outstanding. Kindly clear the dues soon. Thank you!`)}` : '';

                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedPayment(p)}>
                        <td className="p-4 text-center" onClick={ev => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedPaymentSet.has(p.id)}
                            onChange={() => togglePaymentSelection(p.id)}
                            className="rounded accent-blue-600 transition-all"
                            title="Select invoice"
                          />
                        </td>
                        {visibleColumns.customer && (
                          <td className="p-4 min-w-[180px]">
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.customerName}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Reference Portfolio</p>
                            </div>
                          </td>
                        )}
                        {visibleColumns.invoice && <td className="p-4 text-slate-600 font-semibold text-xs">{p.invoiceNumber || '-'}</td>}
                        {visibleColumns.invoiceValue && <td className="p-4 font-bold text-slate-800 text-xs">{formatCurrency(p.amount)}</td>}
                        {visibleColumns.received && <td className="p-4 font-bold text-emerald-600 text-xs">{formatCurrency(p.totalPaid)}</td>}
                        {visibleColumns.pending && <td className="p-4 font-bold text-rose-500 text-xs">{formatCurrency(pending)}</td>}
                        {visibleColumns.daysOverdue && (
                          <td className="p-4">
                            <span className={`text-xs font-semibold ${isOverdueAlert ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                              {p.overdueDays ? `${p.overdueDays}d` : '-'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.paymentHealth && <td className="p-4">{getHealthBadge(p.overdueDays || 0, p.paymentStatus)}</td>}
                        {visibleColumns.riskScore && <td className="p-4">{getRiskIndicator(p.riskScore, p.overdueDays || 0)}</td>}
                        {visibleColumns.assignedExecutive && (
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {renderExecAvatar(p.assignedTo, p.assignedToName)}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate leading-none">{p.assignedToName || 'Unassigned'}</p>
                                <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{getExecRole(p.assignedTo)}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.assignedDate && (
                          <td className="p-4 text-xs font-semibold text-slate-650">
                            {formatDate(p.assignedDate || p.createdAt)}
                          </td>
                        )}
                        {visibleColumns.status && <td className="p-4">{getStatusBadge(p.paymentStatus)}</td>}

                        <td className="p-4 text-right" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Hover Actions */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-lg px-2 py-1 mr-2">
                              {waLink && (
                                <a href={`${waLink}${waMessage}`} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Send WhatsApp Invoice Reminder">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {telLink && (
                                <a href={telLink} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Call client">
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            <button onClick={() => setShowReceipt(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100" title="View Print Receipt">
                              <FileText className="w-4 h-4" />
                            </button>
                            
                            {p.paymentStatus !== 'received' && (
                              <button
                                onClick={() => handleMarkFullyPaid(p)}
                                className="text-xs text-emerald-600 font-bold px-2 py-1 border border-emerald-100 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}

                            <button
                              onClick={() => { setEditing(p); setShowModal(true); }}
                              className="text-xs text-blue-600 font-bold px-2 py-1 border border-blue-100 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <DeleteButton onClick={() => deletePaymentRecord(p.id, p.customerName)} showLabel={false} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Invoices List */}
          <div className="md:hidden space-y-4">
            {sorted.map(p => {
              const pending = Math.max(0, (p.amount || 0) - (p.totalPaid || 0));
              const isOverdueAlert = isOverdue(p.targetPaymentDate, p.paymentStatus);
              const risk = p.riskScore !== undefined ? p.riskScore : (p.overdueDays > 60 ? 90 : p.overdueDays > 30 ? 65 : p.overdueDays > 0 ? 40 : 15);
              const phone = (p.contactPhone || p.phone || '').replace(/\D/g, '');
              const waLink = phone ? `https://wa.me/91${phone.length > 10 ? phone.slice(-10) : phone}` : null;
              const telLink = p.contactPhone || p.phone ? `tel:${p.contactPhone || p.phone}` : null;
              const waMessage = waLink ? `&text=${encodeURIComponent(`Dear Customer, this is a friendly reminder that Invoice ${p.invoiceNumber || ''} is due. Outstanding pending: Rs ${pending.toLocaleString('en-IN')}. Please clear soon. Thanks!`)}` : '';

              return (
                <div
                  key={p.id}
                  className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3 cursor-pointer hover:border-blue-100"
                  onClick={() => setSelectedPayment(p)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="max-w-[70%]">
                      <p className="font-bold text-[14px] text-slate-900 break-words">{p.customerName}</p>
                      <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">Invoice: {p.invoiceNumber || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">Assigned: {p.assignedToName || 'Unassigned'} on {formatDate(p.assignedDate || p.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {getStatusBadge(p.paymentStatus)}
                      {isOverdueAlert && <span className="text-[9px] text-rose-500 font-extrabold bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded-full">Overdue {p.overdueDays}d</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Invoiced</span>
                      <span className="font-bold text-slate-800 block mt-1">{formatCurrency(p.amount)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Paid</span>
                      <span className="font-bold text-emerald-600 block mt-1">{formatCurrency(p.totalPaid)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Pending</span>
                      <span className="font-bold text-rose-600 block mt-1">{formatCurrency(pending)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Risk Index & Health</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {getRiskIndicator(p.riskScore, p.overdueDays || 0)}
                        {getHealthBadge(p.overdueDays || 0, p.paymentStatus)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={ev => ev.stopPropagation()}>
                      {waLink && (
                        <a href={`${waLink}${waMessage}`} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-lg">
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}
                      {telLink && (
                        <a href={telLink} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 rounded-lg">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => setShowReceipt(p)} className="p-2 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50">
                        <FileText className="w-4 h-4" />
                      </button>
                      
                      {p.paymentStatus !== 'received' && (
                        <button onClick={() => handleMarkFullyPaid(p)} className="text-xs text-emerald-650 border border-emerald-100 hover:bg-emerald-50 px-2 py-1.5 rounded-lg font-bold">
                          Paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <PaymentModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={editing ? handleEdit : handleAdd}
          members={activeMembers}
          editing={editing}
        />
      )}

      {showReceipt && (
        <ReceiptModal
          payment={showReceipt}
          onClose={() => setShowReceipt(null)}
        />
      )}

      {selectedPayment && (
        <PaymentDetailPanel
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onSaveNotes={handleSaveNotes}
          allPayments={payments}
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

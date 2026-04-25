import { useState, useMemo } from 'react';
import {
 Plus, X, Search, DollarSign, TrendingUp, Clock, AlertTriangle,
 FileText, Download, Eye, CheckCircle2, BarChart3,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { usePayments } from '../hooks/usePayments';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import { formatDate, formatCurrency } from '../lib/formatters';
import { exportCSV, exportExcel, flattenForExport } from '../lib/exportUtils';
import { SkeletonTable, SkeletonStatCards } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';

const PAYMENT_COLUMNS = [
 { key: 'customerName', label: 'Customer' },
 { key: 'invoiceNumber', label: 'Invoice' },
 { key: 'amount', label: 'Amount' },
 { key: 'totalPaid', label: 'Paid' },
 { key: 'paymentStatus', label: 'Status' },
 { key: 'targetPaymentDate', label: 'Due Date' },
 { key: 'overdueDays', label: 'Overdue' },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

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
 });
 const [saving, setSaving] = useState(false);

 const netPending = Number(form.amount || 0) - Number(form.totalPaid || 0);

 const handleSubmit = async () => {
 if (!form.customerName || !form.amount) return;
 setSaving(true);
 try {
 const partial = Number(form.partialPayment || 0);
 const newTotalPaid = Number(form.totalPaid || 0) + partial;
 const newStatus = newTotalPaid >= Number(form.amount) ? 'received' : form.paymentStatus;

 await onSubmit({
 customerName: form.customerName,
 invoiceNumber: form.invoiceNumber,
 amount: Number(form.amount),
 totalPaid: newTotalPaid,
 paymentStatus: newStatus,
 targetPaymentDate: form.targetPaymentDate ? Timestamp.fromDate(new Date(form.targetPaymentDate)) : null,
 nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
 assignedTo: form.assignedTo,
 assignedToName: form.assignedToName,
 remarks: form.remarks,
 netPendingAmount: Number(form.amount) - newTotalPaid,
 });
 onClose();
 } catch (err) { console.error(err); }
 finally { setSaving(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
 <div className="absolute inset-0 bg-black/40" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 modal-content max-h-[90vh] flex flex-col">
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Payment</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Customer *</label><input className="input-field" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} /></div>
 <div><label className="label">Invoice No.</label><input className="input-field" value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Total Amount (Rs) *</label><input className="input-field" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
 <div><label className="label">Status</label>
 <select className="input-field" value={form.paymentStatus} onChange={e => setForm({...form, paymentStatus: e.target.value})}>
 <option value="pending">Pending</option><option value="partial">Partial</option><option value="received">Received</option>
 </select></div>
 </div>
 {editing && (
 <div className="bg-teal-50 rounded-xl p-4">
 <div className="flex items-center justify-between text-sm mb-2">
 <span className="text-gray-500">Total Paid:</span>
 <span className="font-semibold text-teal-700">{formatCurrency(form.totalPaid)}</span>
 </div>
 <div className="flex items-center justify-between text-sm mb-3">
 <span className="text-gray-500">Pending:</span>
 <span className="font-semibold text-red-500">{formatCurrency(netPending)}</span>
 </div>
 <div><label className="label text-xs">Add Partial Payment (Rs)</label>
 <input className="input-field" type="number" placeholder="0" value={form.partialPayment}
 onChange={e => setForm({...form, partialPayment: e.target.value})} /></div>
 </div>
 )}
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Due Date</label><input className="input-field" type="date" value={form.targetPaymentDate} onChange={e => setForm({...form, targetPaymentDate: e.target.value})} /></div>
 <div><label className="label">Next Follow-up</label><input className="input-field" type="date" value={form.nextFollowupDate} onChange={e => setForm({...form, nextFollowupDate: e.target.value})} /></div>
 </div>
 <div><label className="label">Assign To</label>
 <select className="input-field" value={form.assignedTo}
 onChange={e => { const m = members.find(m => m.id === e.target.value); setForm({...form, assignedTo: e.target.value, assignedToName: m?.name || ''}); }}>
 <option value="">Select member</option>
 {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select></div>
 <div><label className="label">Remarks</label><textarea className="input-field resize-none" rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></div>
 </div>
 <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
 <button onClick={onClose} className="btn-secondary">Cancel</button>
 <button onClick={handleSubmit} disabled={saving} className="btn-primary">
 {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Add'} Payment</>}
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
 <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
 <div className="absolute inset-0 bg-black/40" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 modal-content">
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">Payment Receipt</h2>
 <div className="flex items-center gap-2">
 <button onClick={handleDownload} className="btn-primary text-xs"><Download className="w-3.5 h-3.5" /> Print</button>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
 </div>
 </div>
 <div id="payment-receipt" className="px-6 py-5">
 <div className="text-center border-b border-[var(--border-primary)] pb-4 mb-4">
 <h2 className="text-xl font-bold text-gray-900">PAYMENT RECEIPT</h2>
 <p className="text-xs text-gray-400 mt-1">Invoice: {payment.invoiceNumber || 'N/A'}</p>
 </div>
 <table className="w-full text-sm border-collapse">
 <tbody>
 <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Customer</td><td className="py-2 font-medium text-right">{payment.customerName}</td></tr>
 <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Invoice Amount</td><td className="py-2 font-medium text-right">{formatCurrency(payment.amount)}</td></tr>
 <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Total Paid</td><td className="py-2 font-medium text-right text-green-600">{formatCurrency(payment.totalPaid || 0)}</td></tr>
 <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Pending</td><td className="py-2 font-medium text-right text-red-500">{formatCurrency((payment.amount || 0) - (payment.totalPaid || 0))}</td></tr>
 <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Due Date</td><td className="py-2 font-medium text-right">{formatDate(payment.targetPaymentDate)}</td></tr>
 <tr><td className="py-2 text-gray-500">Status</td><td className="py-2 font-bold text-right text-lg text-teal-700">{payment.paymentStatus?.toUpperCase()}</td></tr>
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}

export default function PaymentsPage() {
 const toast = useToast();
 const { payments, loading, addPayment, updatePayment } = usePayments();
 const { members } = useTeam();
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState(null);
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('All');
 const [showReceipt, setShowReceipt] = useState(null);
 const [showAging, setShowAging] = useState(false);
 const [showAnalytics, setShowAnalytics] = useState(false);

 const activeMembers = members.filter(m => m.role === 'member' && m.status === 'active');

 const filtered = useMemo(() => {
 return payments.filter(p => {
 const matchSearch = search === '' ||
 (p.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
 (p.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
 const matchStatus = filterStatus === 'All' || p.paymentStatus === filterStatus;
 return matchSearch && matchStatus;
 });
 }, [payments, search, filterStatus]);

 // Dashboard metrics
 const metrics = useMemo(() => {
 const totalInvoiced = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
 const totalReceived = payments.filter(p => p.paymentStatus === 'received').reduce((s, p) => s + Number(p.amount || 0), 0);
 const totalPending = payments.filter(p => p.paymentStatus !== 'received').reduce((s, p) => s + Number(p.amount || 0) - Number(p.totalPaid || 0), 0);
 const overdueAmount = payments.filter(p => p.paymentStatus !== 'received' && (p.overdueDays || 0) > 0).reduce((s, p) => s + Number(p.amount || 0) - Number(p.totalPaid || 0), 0);
 const overdueCount = payments.filter(p => p.paymentStatus !== 'received' && (p.overdueDays || 0) > 0).length;
 const collectionEff = totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0;

 return { totalInvoiced, totalReceived, totalPending, overdueAmount, overdueCount, collectionEff };
 }, [payments]);

 // Aging analysis
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

 const handleAdd = async (data) => {
 try { await addPayment(data); toast.success('Payment added!'); }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const handleEdit = async (data) => {
 try { await updatePayment(editing.id, data); toast.success('Payment updated!'); }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const handleExport = (format) => {
 const data = flattenForExport(filtered, PAYMENT_COLUMNS);
 if (format === 'csv') exportCSV(data, 'payments');
 else exportExcel(data, 'payments');
 };

 const statusColors = { pending: 'badge-yellow', partial: 'badge-blue', received: 'badge-green' };

 return (
 <div className="space-y-6 page-transition">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{payments.length} payments | {metrics.collectionEff}% collection rate</p>
 </div>
 <div className="flex items-center gap-3">
 <button onClick={() => setShowAnalytics(!showAnalytics)}
 className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showAnalytics ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'}`}>
 <BarChart3 className="w-3.5 h-3.5" /> Analytics
 </button>
 <div className="relative group">
 <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-gray-100">
 <Download className="w-3.5 h-3.5" /> Export
 </button>
 <div className="absolute right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl shadow-lg py-1 hidden group-hover:block z-10 w-32">
 <button onClick={() => handleExport('csv')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">CSV</button>
 <button onClick={() => handleExport('excel')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Excel</button>
 </div>
 </div>
 <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
 <Plus className="w-4 h-4" /> New Payment
 </button>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-4 gap-4">
 {[
 { label: 'Total Invoiced', value: metrics.totalInvoiced, icon: DollarSign, color: 'bg-blue-50 text-blue-600', isCurrency: true },
 { label: 'Received', value: metrics.totalReceived, icon: CheckCircle2, color: 'bg-green-50 text-green-600', isCurrency: true },
 { label: 'Pending', value: metrics.totalPending, icon: Clock, color: 'bg-amber-50 text-amber-600', isCurrency: true },
 { label: 'Overdue', value: metrics.overdueAmount, icon: AlertTriangle, color: 'bg-red-50 text-red-600', isCurrency: true },
 ].map((s, i) => {
 const Icon = s.icon;
 return (
 <div key={i} className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color.split(' ')[0]}`}>
 <Icon className={`w-5 h-5 ${s.color.split(' ')[1]}`} />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 uppercase font-medium">{s.label}</p>
 <p className="text-lg font-bold text-gray-900">
 <CountUpNumber end={s.value} formatter={v => formatCurrency(Math.round(v))} />
 </p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Analytics */}
 {showAnalytics && (
 <div className="grid grid-cols-2 gap-5">
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Aging Analysis</h3>
 <ResponsiveContainer width="100%" height={200}>
 <BarChart data={agingChart}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
 <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <Tooltip contentStyle={{ borderRadius: 12 }} formatter={(v) => formatCurrency(v)} />
 <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
 {agingChart.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#f97316', '#ef4444'][i]} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Collection Efficiency</h3>
 <div className="flex items-center justify-center h-[200px]">
 <div className="text-center">
 <div className="relative w-32 h-32 mx-auto">
 <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
 <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
 <circle cx="60" cy="60" r="50" fill="none" stroke="#0d9488" strokeWidth="10"
 strokeDasharray={`${metrics.collectionEff * 3.14} 314`} strokeLinecap="round" />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center">
 <span className="text-3xl font-bold text-teal-700">{metrics.collectionEff}%</span>
 </div>
 </div>
 <p className="text-xs text-gray-400 mt-3">Collection Rate</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Filters */}
 <div className="card py-3 px-4">
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative flex-1 max-w-xs">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" placeholder="Search customer, invoice..." className="input-field pl-9 w-full"
 value={search} onChange={e => setSearch(e.target.value)} />
 </div>
 <select className="input-field w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">All Status</option>
 <option value="pending">Pending</option><option value="partial">Partial</option><option value="received">Received</option>
 </select>
 <button onClick={() => setShowAging(!showAging)}
 className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showAging ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-[var(--text-muted)] hover:border-gray-300'}`}>
 Aging View
 </button>
 <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
 </div>
 </div>

 {/* Aging View */}
 {showAging && (
 <div className="grid grid-cols-4 gap-4">
 {Object.entries(agingBuckets).map(([bucket, items], i) => (
 <div key={bucket} className="card">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold" style={{ color: ['#10b981', '#f59e0b', '#f97316', '#ef4444'][i] }}>{bucket} days</h3>
 <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
 </div>
 <p className="text-lg font-bold text-[var(--text-primary)] mb-3">{formatCurrency(items.reduce((s, p) => s + Number(p.amount || 0) - Number(p.totalPaid || 0), 0))}</p>
 <div className="space-y-1.5 max-h-32 overflow-y-auto">
 {items.slice(0, 5).map(p => (
 <div key={p.id} className="flex items-center justify-between text-xs">
 <span className="text-gray-600 truncate max-w-[120px]">{p.customerName}</span>
 <span className="font-medium">{formatCurrency(Number(p.amount || 0) - Number(p.totalPaid || 0))}</span>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Table */}
 {loading ? <SkeletonTable rows={5} cols={8} /> : filtered.length === 0 ? (
 <EmptyState icon="noData" title="No payment records found" actionLabel="New Payment" onAction={() => { setEditing(null); setShowModal(true); }} />
 ) : (
 <div className="card p-0 overflow-hidden">
 <table className="w-full" data-export-table>
 <thead><tr className="bg-gray-50">
 <th className="table-header">Customer</th><th className="table-header">Invoice</th>
 <th className="table-header text-right">Amount</th><th className="table-header text-right">Paid</th>
 <th className="table-header text-right">Pending</th><th className="table-header">Due Date</th>
 <th className="table-header">Status</th><th className="table-header">Actions</th>
 </tr></thead>
 <tbody>
 {filtered.map(p => {
 const pending = Number(p.amount || 0) - Number(p.totalPaid || 0);
 return (
 <tr key={p.id} className="hover:bg-gray-50 transition-colors">
 <td className="table-cell font-medium text-gray-900">{p.customerName}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{p.invoiceNumber || '-'}</td>
 <td className="table-cell text-right font-medium">{formatCurrency(p.amount)}</td>
 <td className="table-cell text-right text-green-600 font-medium">{formatCurrency(p.totalPaid || 0)}</td>
 <td className="table-cell text-right text-red-500 font-medium">{formatCurrency(pending)}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">
 {formatDate(p.targetPaymentDate)}
 {(p.overdueDays || 0) > 0 && <span className="text-red-400 ml-1">({p.overdueDays}d)</span>}
 </td>
 <td className="table-cell"><span className={`badge ${statusColors[p.paymentStatus] || 'badge-gray'}`}>{p.paymentStatus}</span></td>
 <td className="table-cell">
 <div className="flex items-center gap-1">
 <button onClick={() => setShowReceipt(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Receipt">
 <FileText className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => { setEditing(p); setShowModal(true); }} className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded font-medium">Edit</button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {showModal && <PaymentModal onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={editing ? handleEdit : handleAdd} members={activeMembers} editing={editing} />}
 {showReceipt && <ReceiptModal payment={showReceipt} onClose={() => setShowReceipt(null)} />}
 </div>
 );
}


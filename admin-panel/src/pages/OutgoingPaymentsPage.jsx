import { useState, useMemo } from 'react';
import {
 Plus, X, Search, DollarSign, TrendingDown, Clock,
 AlertTriangle, Download, CheckCircle2, BarChart3, Trash2,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useOutgoingPayments } from '../hooks/useOutgoingPayments';
import { usePayments } from '../hooks/usePayments';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import { formatDate, formatCurrency } from '../lib/formatters';
import { exportCSV, exportExcel, flattenForExport } from '../lib/exportUtils';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import ExportButton from '../components/ui/ExportButton';

const APPROVAL_STATUSES = ['draft', 'pending', 'approved', 'paid'];

function OutgoingModal({ onClose, onSubmit, members, editing }) {
 const [form, setForm] = useState({
 vendorName: editing?.vendorName || '',
 invoiceNumber: editing?.invoiceNumber || '',
 amount: editing?.amount || '',
 totalPaid: editing?.totalPaid || 0,
 paymentStatus: editing?.paymentStatus || 'pending',
 approvalStatus: editing?.approvalStatus || 'draft',
 paymentDueDate: editing?.paymentDueDate
 ? (typeof editing.paymentDueDate.toDate === 'function' ? editing.paymentDueDate.toDate().toISOString().split('T')[0] : new Date(editing.paymentDueDate).toISOString().split('T')[0])
 : '',
 nextFollowupDate: editing?.nextFollowupDate
 ? (typeof editing.nextFollowupDate.toDate === 'function' ? editing.nextFollowupDate.toDate().toISOString().split('T')[0] : new Date(editing.nextFollowupDate).toISOString().split('T')[0])
 : '',
 category: editing?.category || '',
 assignedTo: editing?.assignedTo || '',
 assignedToName: editing?.assignedToName || '',
 remarks: editing?.remarks || '',
 partialPayment: '',
 });
 const [saving, setSaving] = useState(false);

 const handleSubmit = async () => {
 if (!form.vendorName || !form.amount) return;
 setSaving(true);
 try {
 const partial = Number(form.partialPayment || 0);
 const newTotalPaid = Number(form.totalPaid || 0) + partial;
 const newStatus = newTotalPaid >= Number(form.amount) ? 'paid' : form.paymentStatus;

 await onSubmit({
 vendorName: form.vendorName,
 invoiceNumber: form.invoiceNumber,
 amount: Number(form.amount),
 totalPaid: newTotalPaid,
 paymentStatus: newStatus,
 approvalStatus: form.approvalStatus,
 paymentDueDate: form.paymentDueDate ? Timestamp.fromDate(new Date(form.paymentDueDate)) : null,
 nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
 category: form.category,
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
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Outgoing Payment</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Vendor Name *</label><input className="input-field" value={form.vendorName} onChange={e => setForm({...form, vendorName: e.target.value})} /></div>
 <div><label className="label">Invoice No.</label><input className="input-field" value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Amount (Rs) *</label><input className="input-field" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
 <div><label className="label">Category</label>
 <select className="input-field" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
 <option value="">Select</option>
 <option>Material</option><option>Labour</option><option>Transport</option><option>Equipment</option>
 <option>Utilities</option><option>Rent</option><option>Other</option>
 </select></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Approval</label>
 <select className="input-field" value={form.approvalStatus} onChange={e => setForm({...form, approvalStatus: e.target.value})}>
 {APPROVAL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
 </select></div>
 <div><label className="label">Payment Status</label>
 <select className="input-field" value={form.paymentStatus} onChange={e => setForm({...form, paymentStatus: e.target.value})}>
 <option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option>
 </select></div>
 </div>
 {editing && Number(form.totalPaid) > 0 && (
 <div className="bg-orange-50 rounded-xl p-3">
 <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Paid:</span><span className="font-semibold text-green-600">{formatCurrency(form.totalPaid)}</span></div>
 <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Pending:</span><span className="font-semibold text-red-500">{formatCurrency(Number(form.amount || 0) - Number(form.totalPaid || 0))}</span></div>
 <label className="label text-xs">Add Partial Payment (Rs)</label>
 <input className="input-field" type="number" placeholder="0" value={form.partialPayment} onChange={e => setForm({...form, partialPayment: e.target.value})} />
 </div>
 )}
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Due Date</label><input className="input-field" type="date" value={form.paymentDueDate} onChange={e => setForm({...form, paymentDueDate: e.target.value})} /></div>
 <div><label className="label">Next Follow-up</label><input className="input-field" type="date" value={form.nextFollowupDate} onChange={e => setForm({...form, nextFollowupDate: e.target.value})} /></div>
 </div>
 <div><label className="label">Assign To</label>
 <select className="input-field" value={form.assignedTo}
 onChange={e => { const m = members.find(m => m.id === e.target.value); setForm({...form, assignedTo: e.target.value, assignedToName: m?.name || ''}); }}>
 <option value="">Select</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select></div>
 <div><label className="label">Remarks</label><textarea className="input-field resize-none" rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></div>
 </div>
 <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
 <button onClick={onClose} className="btn-secondary">Cancel</button>
 <button onClick={handleSubmit} disabled={saving} className="btn-primary">
 {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Add'}</>}
 </button>
 </div>
 </div>
 </div>
 );
}

export default function OutgoingPaymentsPage() {
 const toast = useToast();
 const { outgoingPayments, loading, addOutgoingPayment, updateOutgoingPayment, deleteOutgoingPayment } = useOutgoingPayments();
 const { payments: incomingPayments } = usePayments();
 const { members } = useTeam();
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState(null);
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('All');
 const [showCashFlow, setShowCashFlow] = useState(false);

 const activeMembers = members.filter(m => m.role === 'member' && m.status === 'active');

 const filtered = useMemo(() => {
 return outgoingPayments.filter(p => {
 const matchSearch = search === '' || (p.vendorName || '').toLowerCase().includes(search.toLowerCase()) || (p.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
 const matchStatus = filterStatus === 'All' || p.paymentStatus === filterStatus;
 return matchSearch && matchStatus;
 });
 }, [outgoingPayments, search, filterStatus]);

 const totalOutgoing = outgoingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
 const totalPaidOut = outgoingPayments.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);
 const pendingOut = outgoingPayments.filter(p => p.paymentStatus !== 'paid').reduce((s, p) => s + Number(p.amount || 0) - Number(p.totalPaid || 0), 0);
 const totalIncoming = incomingPayments.reduce((s, p) => s + Number(p.totalPaid || 0), 0);
 const netCashFlow = totalIncoming - totalPaidOut;

 // Cash flow chart - real data from payments
 const cashFlowData = useMemo(() => {
 const months = [];
 for (let i = 5; i >= 0; i--) {
 const d = new Date(); d.setMonth(d.getMonth() - i);
 const label = d.toLocaleDateString('en-IN', { month: 'short' });
 const monthNum = d.getMonth();
 const yearNum = d.getFullYear();

 const incoming = incomingPayments.filter(p => {
 const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
 return pd && pd.getMonth() === monthNum && pd.getFullYear() === yearNum;
 }).reduce((s, p) => s + Number(p.totalPaid || p.amount || 0), 0);

 const outgoing = outgoingPayments.filter(p => {
 const pd = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
 return pd && pd.getMonth() === monthNum && pd.getFullYear() === yearNum;
 }).reduce((s, p) => s + Number(p.totalPaid || p.amount || 0), 0);

 months.push({ name: label, incoming: Math.round(incoming), outgoing: Math.round(outgoing) });
 }
 return months;
 }, [outgoingPayments, incomingPayments]);

 const handleAdd = async (data) => {
 try { await addOutgoingPayment(data); toast.success('Payment added!'); }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };
 const handleEdit = async (data) => {
 try { await updateOutgoingPayment(editing.id, data); toast.success('Updated!'); }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const approvalColors = { draft: 'badge-gray', pending: 'badge-yellow', approved: 'badge-blue', paid: 'badge-green' };

 return (
 <div className="space-y-6 page-transition">
 <div className="flex items-center justify-between">
 <div><h1 className="text-2xl font-bold text-gray-900">Outgoing Payments</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{outgoingPayments.length} payments | Net Cash Flow: {formatCurrency(netCashFlow)}</p></div>
 <div className="flex items-center gap-3">
 <button onClick={() => setShowCashFlow(!showCashFlow)}
 className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showCashFlow ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'}`}>
 <BarChart3 className="w-3.5 h-3.5" /> Cash Flow
 </button>
 <ExportButton
 data={filtered}
 columns={[
 { key: 'vendorName', label: 'Vendor' },
 { key: 'invoiceNumber', label: 'Invoice' },
 { key: 'category', label: 'Category' },
 { key: 'amount', label: 'Amount' },
 { key: 'totalPaid', label: 'Paid' },
 { key: 'paymentStatus', label: 'Status' },
 { key: 'approvalStatus', label: 'Approval' },
 ]}
 filename="outgoing_payments"
 />
 <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="w-4 h-4" /> New Payment</button>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 {[
 { label: 'Total Outgoing', value: totalOutgoing, icon: DollarSign, color: 'bg-red-50 text-red-600' },
 { label: 'Paid', value: totalPaidOut, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
 { label: 'Pending', value: pendingOut, icon: Clock, color: 'bg-amber-50 text-amber-600' },
 { label: 'Net Cash Flow', value: netCashFlow, icon: TrendingDown, color: netCashFlow >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600' },
 ].map((s, i) => {
 const Icon = s.icon;
 return (
 <div key={i} className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color.split(' ')[0]}`}><Icon className={`w-5 h-5 ${s.color.split(' ')[1]}`} /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">{s.label}</p>
 <p className="text-lg font-bold text-gray-900"><CountUpNumber end={s.value} formatter={v => formatCurrency(Math.round(v))} /></p></div>
 </div>
 );
 })}
 </div>

 {showCashFlow && (
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Cash Flow - Incoming vs Outgoing</h3>
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={cashFlowData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
 <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <Tooltip contentStyle={{ borderRadius: 12 }} formatter={v => formatCurrency(v)} />
 <Bar dataKey="incoming" fill="#10b981" radius={[4, 4, 0, 0]} name="Incoming" />
 <Bar dataKey="outgoing" fill="#ef4444" radius={[4, 4, 0, 0]} name="Outgoing" />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}

 <div className="card py-3 px-4">
 <div className="flex items-center gap-3">
 <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" placeholder="Search vendor..." className="input-field pl-9 w-full" value={search} onChange={e => setSearch(e.target.value)} /></div>
 <select className="input-field w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">All Status</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option>
 </select>
 <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
 </div>
 </div>

 {loading ? <SkeletonTable rows={5} cols={8} /> : filtered.length === 0 ? (
 <EmptyState icon="noData" title="No outgoing payments" actionLabel="New Payment" onAction={() => { setEditing(null); setShowModal(true); }} />
 ) : (
 <div className="card p-0 overflow-hidden">
 <table className="w-full" data-export-table>
 <thead><tr className="bg-gray-50">
 <th className="table-header">Vendor</th><th className="table-header">Invoice</th><th className="table-header">Category</th>
 <th className="table-header text-right">Amount</th><th className="table-header text-right">Paid</th>
 <th className="table-header">Due Date</th><th className="table-header">Approval</th><th className="table-header">Status</th>
 <th className="table-header">Actions</th>
 </tr></thead>
 <tbody>
 {filtered.map(p => (
 <tr key={p.id} className="hover:bg-gray-50 transition-colors">
 <td className="table-cell font-medium text-gray-900">{p.vendorName}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{p.invoiceNumber || '-'}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{p.category || '-'}</td>
 <td className="table-cell text-right font-medium">{formatCurrency(p.amount)}</td>
 <td className="table-cell text-right text-green-600 font-medium">{formatCurrency(p.totalPaid || 0)}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{formatDate(p.paymentDueDate)}
 {(p.overdueDays || 0) > 0 && <span className="text-red-400 ml-1">({p.overdueDays}d)</span>}</td>
 <td className="table-cell"><span className={`badge ${approvalColors[p.approvalStatus] || 'badge-gray'}`}>{p.approvalStatus || 'draft'}</span></td>
 <td className="table-cell"><span className={`badge ${p.paymentStatus === 'paid' ? 'badge-green' : 'badge-yellow'}`}>{p.paymentStatus}</span></td>
 <td className="table-cell"><div className="flex items-center gap-1"><button onClick={() => { setEditing(p); setShowModal(true); }} className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded font-medium">Edit</button><button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {showModal && <OutgoingModal onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={editing ? handleEdit : handleAdd} members={activeMembers} editing={editing} />}
 </div>
 );
}



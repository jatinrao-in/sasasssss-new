import { useState, useMemo } from 'react';
import {
 Plus, X, LayoutGrid, Columns3, Search, FileText,
 TrendingUp, Clock, BarChart3, Eye, Calendar,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useEnquiries } from '../hooks/useEnquiries';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatDate, formatCurrency } from '../lib/formatters';
import { notifyEnquiryAssigned } from '../lib/notify';
import { SkeletonTable, SkeletonKanban } from '../components/ui/Skeleton';
import KanbanBoard from '../components/ui/KanbanBoard';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import ExportButton from '../components/ui/ExportButton';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import BulkDeleteBar from '../components/BulkDeleteBar';

const PIPELINE_STAGES = [
 { id: 'new', label: 'New' },
 { id: 'in_progress', label: 'In Progress' },
 { id: 'quoted', label: 'Quoted' },
 { id: 'won', label: 'Won' },
 { id: 'lost', label: 'Lost' },
 { id: 'on_hold', label: 'On Hold' },
];

const ENQUIRY_TYPES = ['Quotation', 'Visit', 'Costing'];
const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function EnquiryModal({ onClose, onSubmit, members, editing }) {
 const [form, setForm] = useState({
 companyName: editing?.companyName || editing?.customerName || '',
 contactPerson: editing?.contactPerson || '',
 contactPhone: editing?.contactPhone || editing?.phone || '',
 description: editing?.description || '',
 taskType: editing?.taskType || '',
 assignedTo: editing?.assignedTo || '',
 assignedToName: editing?.assignedToName || '',
 targetDate: editing?.targetDate
 ? (typeof editing.targetDate.toDate === 'function' ? editing.targetDate.toDate().toISOString().split('T')[0] : new Date(editing.targetDate).toISOString().split('T')[0])
 : '',
 nextFollowupDate: editing?.nextFollowupDate
 ? (typeof editing.nextFollowupDate.toDate === 'function' ? editing.nextFollowupDate.toDate().toISOString().split('T')[0] : new Date(editing.nextFollowupDate).toISOString().split('T')[0])
 : '',
 amount: editing?.amount || '',
 status: editing?.status || 'open',
 pipelineStage: editing?.pipelineStage || 'new',
 priority: editing?.priority || 'medium',
 source: editing?.source || '',
 notes: editing?.notes || '',
 });
 const [saving, setSaving] = useState(false);

 const handleSubmit = async () => {
 if (!form.companyName) return;
 setSaving(true);
 try {
 await onSubmit({
 companyName: form.companyName,
 contactPerson: form.contactPerson,
 contactPhone: form.contactPhone,
 description: form.description,
 taskType: form.taskType,
 assignedTo: form.assignedTo,
 assignedToName: form.assignedToName,
 targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
 nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
 amount: Number(form.amount) || 0,
 status: form.status,
 pipelineStage: form.pipelineStage,
 priority: form.priority,
 source: form.source,
 notes: form.notes,
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
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Enquiry</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Company Name *</label>
 <input className="input-field" placeholder="Company name" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} /></div>
 <div><label className="label">Contact Person</label>
 <input className="input-field" placeholder="Contact person" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Phone Number</label>
 <input className="input-field" placeholder="+91 XXXX XXXXXX" value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} /></div>
 <div><label className="label">Task Type</label>
 <select className="input-field" value={form.taskType} onChange={e => setForm({...form, taskType: e.target.value})}>
 <option value="">Select type</option>
 {ENQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select></div>
 </div>
 <div><label className="label">Description / Activity</label>
 <textarea className="input-field resize-none" rows={2} placeholder="What needs to be done" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Pipeline Stage</label>
 <select className="input-field" value={form.pipelineStage} onChange={e => setForm({...form, pipelineStage: e.target.value})}>
 {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
 </select></div>
 <div><label className="label">Next Followup Date</label>
 <input className="input-field" type="date" value={form.nextFollowupDate} onChange={e => setForm({...form, nextFollowupDate: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Assign To</label>
 <select className="input-field" value={form.assignedTo}
 onChange={e => { const m = members.find(m => m.id === e.target.value); setForm({...form, assignedTo: e.target.value, assignedToName: m?.name || ''}); }}>
 <option value="">Select member</option>
 {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select></div>
 <div><label className="label">Target Date</label>
 <input className="input-field" type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Estimated Value (Rs)</label>
 <input className="input-field" type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
 <div><label className="label">Priority</label>
 <select className="input-field" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
 <option value="low">Low</option><option value="medium">Medium</option>
 <option value="high">High</option><option value="critical">Critical</option>
 </select></div>
 </div>
 <div><label className="label">Source</label>
 <input className="input-field" placeholder="Walk-in, Phone, Email, Website..." value={form.source} onChange={e => setForm({...form, source: e.target.value})} /></div>
 <div><label className="label">Notes</label>
 <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
 </div>
 <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
 <button onClick={onClose} className="btn-secondary">Cancel</button>
 <button onClick={handleSubmit} disabled={saving} className="btn-primary">
 {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Add'} Enquiry</>}
 </button>
 </div>
 </div>
 </div>
 );
}

function EnquiryDetailPanel({ enquiry, onClose }) {
 if (!enquiry) return null;
 const priorityColors = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', critical: 'badge-red' };
 return (
 <div className="fixed inset-0 z-50 flex items-end justify-end">
 <div className="absolute inset-0 bg-black/20" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] w-full max-w-md h-full shadow-2xl overflow-y-auto border-l border-gray-100" style={{ animation: 'slideInRight 0.3s ease-out' }}>
 <div className="sticky top-0 bg-[var(--bg-card)] z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">Enquiry Details</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
 </div>
 <div className="px-6 py-5 space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
 <FileText className="w-5 h-5 text-teal-600" />
 </div>
 <div>
 <p className="font-semibold text-gray-900">{enquiry.companyName || enquiry.customerName}</p>
 <p className="text-xs text-gray-400">{enquiry.contactPerson ? `${enquiry.contactPerson} | ` : ''}{enquiry.contactPhone || enquiry.phone || 'No phone'}</p>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <p className="text-[10px] text-gray-400 mb-1">Activity / Description</p>
 <p className="text-sm font-semibold whitespace-pre-wrap">{enquiry.description || '-'}</p>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Type</p><p className="text-sm font-semibold">{enquiry.taskType || '-'}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Status</p><p className="text-sm font-semibold">{enquiry.status || '-'}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Priority</p><span className={`badge ${priorityColors[enquiry.priority] || 'badge-gray'}`}>{enquiry.priority || 'medium'}</span></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Value</p><p className="text-sm font-semibold">{formatCurrency(enquiry.amount)}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Assigned</p><p className="text-sm font-semibold">{enquiry.assignedToName || '-'}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Target Date</p><p className="text-sm font-semibold">{formatDate(enquiry.targetDate)}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Source</p><p className="text-sm font-semibold">{enquiry.source || '-'}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Overdue</p><p className="text-sm font-semibold">{enquiry.overdueDays || 0} days</p></div>
 </div>
 {enquiry.notes && (
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-600">{enquiry.notes}</p></div>
 )}
 </div>
 </div>
 </div>
 );
}

export default function EnquiryPage() {
 const toast = useToast();
 const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
 const { enquiries, loading, addEnquiry, updateEnquiry, deleteEnquiry } = useEnquiries();
 const { members } = useTeam();
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState(null);
 const [view, setView] = useState('table');
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('All');
 const [filterType, setFilterType] = useState('All');
 const [selectedEnquiry, setSelectedEnquiry] = useState(null);
 const [selectedEnquiryIds, setSelectedEnquiryIds] = useState([]);
 const [showAnalytics, setShowAnalytics] = useState(false);

 const activeMembers = members.filter(m => m.role === 'member' && m.status === 'active');

 const filtered = useMemo(() => {
 return enquiries.filter(e => {
 const matchSearch = search === '' ||
 (e.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
 (e.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
 (e.taskType || '').toLowerCase().includes(search.toLowerCase()) ||
 (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
 (e.contactPhone || '').includes(search);
 const matchStatus = filterStatus === 'All' || e.statusCategory === filterStatus;
 const matchType = filterType === 'All' || e.taskType === filterType;
 return matchSearch && matchStatus && matchType;
 });
 }, [enquiries, search, filterStatus, filterType]);

 const selectedEnquirySet = useMemo(() => new Set(selectedEnquiryIds), [selectedEnquiryIds]);
 const visibleEnquiryIds = useMemo(() => filtered.map((enquiry) => enquiry.id), [filtered]);
 const allVisibleSelected = visibleEnquiryIds.length > 0
 && visibleEnquiryIds.every((enquiryId) => selectedEnquirySet.has(enquiryId));

 const toggleEnquirySelection = (enquiryId) => {
 setSelectedEnquiryIds((prev) => (
 prev.includes(enquiryId)
 ? prev.filter((id) => id !== enquiryId)
 : [...prev, enquiryId]
 ));
 };

 const toggleAllVisibleEnquiries = () => {
 setSelectedEnquiryIds((prev) => {
 if (allVisibleSelected) {
 return prev.filter((enquiryId) => !visibleEnquiryIds.includes(enquiryId));
 }

 return Array.from(new Set([...prev, ...visibleEnquiryIds]));
 });
 };

 // Analytics
 const analytics = useMemo(() => {
 const total = enquiries.length;
 const closed = enquiries.filter(e => e.isClosed).length;
 const won = enquiries.filter(e => e.pipelineStage === 'won').length;
 const lost = enquiries.filter(e => e.pipelineStage === 'lost').length;
 const open = enquiries.filter(e => !e.isClosed).length;
 const overdue = enquiries.filter(e => e.statusCategory === 'overdue').length;
 const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
 const totalValue = enquiries.reduce((s, e) => s + Number(e.amount || 0), 0);
 const wonValue = enquiries.filter(e => e.pipelineStage === 'won').reduce((s, e) => s + Number(e.amount || 0), 0);

 const byType = ENQUIRY_TYPES.map(t => ({
 name: t,
 value: enquiries.filter(e => e.taskType === t).length,
 })).filter(d => d.value > 0);

 const byMember = activeMembers.map(m => ({
 name: m.name.split(' ')[0],
 value: enquiries.filter(e => e.assignedTo === m.id).length,
 })).filter(d => d.value > 0);

 return { total, closed, won, lost, open, overdue, conversionRate, totalValue, wonValue, byType, byMember };
 }, [enquiries, activeMembers]);

 const handleAdd = async (data) => {
  try {
   await addEnquiry(data);
   
   if (data.assignedTo) {
     const member = members.find(m => m.id === data.assignedTo);
     if (member?.whatsapp) {
       try {
         await notifyEnquiryAssigned(member, data);
       } catch (e) {
         console.error('Notify error:', e);
       }
     }
   }
   
   toast.success('Enquiry added!');
  } catch (err) {
   toast.error('Failed: ' + err.message);
   throw err;
  }
 };

 const handleEdit = async (data) => {
 try { await updateEnquiry(editing.id, data); toast.success('Enquiry updated!'); }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const handleKanbanDrop = async (item, newStage) => {
 try {
 const newStatus = ['won', 'lost'].includes(newStage) ? 'closed' : 'open';
 await updateEnquiry(item.id, { pipelineStage: newStage, status: newStatus });
 toast.success(`Moved to ${newStage}`);
 } catch (err) { toast.error('Failed: ' + err.message); }
 };

 const deleteEnquiryRecord = (id, type = 'this') => {
 confirmDelete({
 title: 'Delete Enquiry',
 description: `Delete this ${type} enquiry? Cannot be undone.`,
 onConfirm: async () => {
 await deleteEnquiry(id);
 setSelectedEnquiryIds((prev) => prev.filter((enquiryId) => enquiryId !== id));
 toast.success('Enquiry deleted');
 },
 });
 };

 const bulkDeleteEnquiries = () => {
 const idsToDelete = selectedEnquiryIds.filter((id) => enquiries.some((enquiry) => enquiry.id === id));
 if (idsToDelete.length === 0) return;

 confirmDelete({
 title: `Delete ${idsToDelete.length} Items`,
 description: `Permanently delete ${idsToDelete.length} selected enquiries? This cannot be undone.`,
 onConfirm: async () => {
 await Promise.all(idsToDelete.map((id) => deleteEnquiry(id)));
 setSelectedEnquiryIds([]);
 toast.success(`${idsToDelete.length} items deleted`);
 },
 });
 };

 const statusColors = {
 open: 'badge-blue',
 in_progress: 'badge-yellow',
 quoted: 'badge-blue',
 won: 'badge-green',
 lost: 'badge-red',
 on_hold: 'badge-gray',
 closed: 'badge-green',
 };
 const priorityColors = { low: 'text-gray-400', medium: 'text-blue-500', high: 'text-amber-500', critical: 'text-red-500' };

 return (
 <div className="space-y-6 page-transition">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Enquiry Management</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{enquiries.length} enquiries | {analytics.open} open</p>
 </div>
 <div className="flex items-center gap-3">
 <button onClick={() => setShowAnalytics(!showAnalytics)}
 className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showAnalytics ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'}`}>
 <BarChart3 className="w-3.5 h-3.5" /> Analytics
 </button>
 <ExportButton
 data={filtered}
 columns={[
 { key: 'companyName', label: 'Company' },
 { key: 'contactPerson', label: 'Contact Person' },
 { key: 'contactPhone', label: 'Phone Number' },
 { key: 'description', label: 'Description' },
 { key: 'taskType', label: 'Task Type' },
 { key: 'assignedToName', label: 'Assigned' },
 { key: 'status', label: 'Status' },
 { key: 'targetDate', label: 'Target Date' },
 { key: 'nextFollowupDate', label: 'Next Followup Date' },
 ]}
 filename="enquiries"
 />
 <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
 <Plus className="w-4 h-4" /> New Enquiry
 </button>
 </div>
 </div>

 {/* Stats */}
 <div className="grid grid-cols-5 gap-4">
 {[
 { label: 'Total', value: analytics.total, icon: FileText, color: 'bg-blue-50 text-blue-600' },
 { label: 'Open', value: analytics.open, icon: Clock, color: 'bg-amber-50 text-amber-600' },
 { label: 'Won', value: analytics.won, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
 { label: 'Conversion', value: `${analytics.conversionRate}%`, icon: BarChart3, color: 'bg-teal-50 text-teal-600' },
 { label: 'Pipeline Value', value: formatCurrency(analytics.totalValue), icon: Calendar, color: 'bg-purple-50 text-purple-600' },
 ].map((s, i) => {
 const Icon = s.icon;
 return (
 <div key={i} className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color.split(' ')[0]}`}>
 <Icon className={`w-5 h-5 ${s.color.split(' ')[1]}`} />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 uppercase font-medium">{s.label}</p>
 <p className="text-lg font-bold text-gray-900">{typeof s.value === 'number' ? <CountUpNumber end={s.value} /> : s.value}</p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Analytics Panel */}
 {showAnalytics && (
 <div className="space-y-5">
 {/* Pipeline Funnel */}
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Funnel</h3>
 <div className="flex items-end gap-2 px-4">
 {PIPELINE_STAGES.filter(s => s.id !== 'on_hold').map((stage, i) => {
 const count = enquiries.filter(e => e.pipelineStage === stage.id).length;
 const maxCount = Math.max(1, ...PIPELINE_STAGES.map(s => enquiries.filter(e => e.pipelineStage === s.id).length));
 const height = Math.max(20, (count / maxCount) * 120);
 const funnelColors = ['#3b82f6', '#0d9488', '#f59e0b', '#10b981', '#ef4444'];
 return (
 <div key={stage.id} className="flex-1 text-center group">
 <p className="text-lg font-bold text-[var(--text-primary)] mb-1">{count}</p>
 <div 
 className="mx-auto rounded-t-lg transition-all duration-500 hover:opacity-80"
 style={{ 
 height: `${height}px`, 
 background: `linear-gradient(180deg, ${funnelColors[i]}dd, ${funnelColors[i]}88)`,
 width: `${100 - i * 10}%`,
 }}
 />
 <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">{stage.label}</p>
 </div>
 );
 })}
 </div>
 <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-gray-100">
 <div className="text-center">
 <p className="text-xs text-gray-400">Win Rate</p>
 <p className="text-lg font-bold text-green-600">{analytics.conversionRate}%</p>
 </div>
 <div className="text-center">
 <p className="text-xs text-gray-400">Won Value</p>
 <p className="text-lg font-bold text-teal-600">{formatCurrency(analytics.wonValue)}</p>
 </div>
 <div className="text-center">
 <p className="text-xs text-gray-400">Pipeline</p>
 <p className="text-lg font-bold text-blue-600">{formatCurrency(analytics.totalValue)}</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-5">
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">By Type</h3>
 <ResponsiveContainer width="100%" height={200}>
 <PieChart><Pie data={analytics.byType} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
 {analytics.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
 </Pie><Tooltip contentStyle={{ borderRadius: 12 }} /></PieChart>
 </ResponsiveContainer>
 <div className="flex flex-wrap gap-2 mt-2 justify-center">
 {analytics.byType.map((d, i) => (
 <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
 <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}
 </div>
 ))}
 </div>
 </div>
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">By Member</h3>
 <ResponsiveContainer width="100%" height={200}>
 <BarChart data={analytics.byMember} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
 <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={60} />
 <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
 <Tooltip contentStyle={{ borderRadius: 12 }} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 )}

 {/* Filters + View Toggle */}
 <div className="card py-3 px-4">
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative flex-1 max-w-xs">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" placeholder="Search company, contact, phone..." className="input-field pl-9 w-full"
 value={search} onChange={e => setSearch(e.target.value)} />
 </div>
 <select className="input-field w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">All Status</option>
 <option value="open">Open</option><option value="overdue">Overdue</option><option value="closed">Closed</option>
 </select>
 <select className="input-field w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
 <option value="All">All Types</option>
 {ENQUIRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select>
 <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
 <div className="view-toggle">
 <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}>
 <LayoutGrid className="w-3.5 h-3.5" /> Table
 </button>
 <button onClick={() => setView('kanban')} className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}>
 <Columns3 className="w-3.5 h-3.5" /> Pipeline
 </button>
 </div>
 </div>
 </div>

 <BulkDeleteBar
 selectedCount={selectedEnquiryIds.length}
 onDelete={bulkDeleteEnquiries}
 onClear={() => setSelectedEnquiryIds([])}
 />

 {/* Content */}
 {loading ? (
 view === 'kanban' ? <SkeletonKanban columns={6} /> : <SkeletonTable rows={5} cols={7} />
 ) : filtered.length === 0 ? (
 <EmptyState icon="noData" title="No enquiries found" actionLabel="New Enquiry" onAction={() => { setEditing(null); setShowModal(true); }} />
 ) : view === 'kanban' ? (
 <KanbanBoard
 columns={PIPELINE_STAGES}
 items={filtered.map(e => ({ ...e, column: e.pipelineStage || 'new' }))}
 onDrop={handleKanbanDrop}
 renderCard={(item) => (
 <div onClick={() => setSelectedEnquiry(item)} className="group">
 <div className="mb-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(event) => event.stopPropagation()}>
 <DeleteButton onClick={() => deleteEnquiryRecord(item.id, item.taskType || 'general')} showLabel={false} />
 </div>
 <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{item.companyName || 'Untitled enquiry'}</p>
 <p className="text-[10px] text-gray-400">{item.taskType || 'General'}</p>
 {item.amount > 0 && <p className="text-[10px] font-medium text-teal-600 mt-1">{formatCurrency(item.amount)}</p>}
 <div className="flex items-center justify-between mt-2">
 <span className="text-[10px] text-gray-300">{formatDate(item.targetDate)}</span>
 <span className={`text-[10px] font-medium ${priorityColors[item.priority] || 'text-gray-400'}`}>
 {item.priority || 'medium'}
 </span>
 </div>
 </div>
 )}
 />
 ) : (
 <div className="card p-0 overflow-hidden">
 <table className="w-full" data-export-table>
 <thead><tr className="bg-gray-50">
 <th className="table-header w-10">
 <input
 type="checkbox"
 checked={allVisibleSelected}
 onChange={toggleAllVisibleEnquiries}
 className="rounded accent-teal-600"
 title="Select all enquiries"
 />
 </th>
 <th className="table-header">Company</th><th className="table-header">Task Type</th>
 <th className="table-header">Assigned</th><th className="table-header">Target Date</th>
 <th className="table-header">Next Followup</th><th className="table-header">Status</th><th className="table-header">Actions</th>
 </tr></thead>
 <tbody>
 {filtered.map(e => (
 <tr key={e.id} className="group hover:bg-gray-50 transition-colors">
 <td className="table-cell">
 <input
 type="checkbox"
 checked={selectedEnquirySet.has(e.id)}
 onChange={() => toggleEnquirySelection(e.id)}
 className="rounded accent-teal-600"
 title="Select enquiry"
 />
 </td>
 <td className="table-cell">
 <div><p className="font-medium text-gray-900">{e.companyName || 'Untitled enquiry'}</p>
 <p className="text-[10px] text-gray-400">{e.contactPerson ? `${e.contactPerson} | ` : ''}{e.contactPhone || ''}</p></div>
 </td>
 <td className="table-cell text-gray-600 text-xs">{e.taskType || '-'}</td>
 <td className="table-cell text-gray-600 text-xs">{e.assignedToName || '-'}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{formatDate(e.targetDate)}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{formatDate(e.nextFollowupDate)}</td>
 <td className="table-cell">
 <span className={`badge ${statusColors[e.status] || 'badge-gray'}`}>{e.status}</span>
 {(e.overdueDays || 0) > 0 && <span className="text-[10px] text-red-400 ml-1">{e.overdueDays}d</span>}
 </td>
 <td className="table-cell">
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => setSelectedEnquiry(e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="View">
 <Eye className="w-3.5 h-3.5" />
 </button>
 <button onClick={() => { setEditing(e); setShowModal(true); }} className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded font-medium">Edit</button>
 <DeleteButton onClick={() => deleteEnquiryRecord(e.id, e.taskType || 'general')} />
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {showModal && <EnquiryModal onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={editing ? handleEdit : handleAdd} members={activeMembers} editing={editing} />}
 {selectedEnquiry && <EnquiryDetailPanel enquiry={selectedEnquiry} onClose={() => setSelectedEnquiry(null)} />}
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


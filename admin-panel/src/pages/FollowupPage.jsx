import { useState, useMemo } from 'react';
import {
 Plus, X, Search, Calendar, LayoutGrid, Clock,
 CheckCircle2, XCircle, MinusCircle, MessageSquare,
 TrendingUp, BarChart3,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFollowups } from '../hooks/useFollowUps';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { notifyFollowupAssigned } from '../lib/notify';
import { SkeletonTable, SkeletonCalendar } from '../components/ui/Skeleton';
import CalendarView from '../components/ui/CalendarView';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import ExportButton from '../components/ui/ExportButton';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import BulkDeleteBar from '../components/BulkDeleteBar';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate?.()
    ? timestamp.toDate()
    : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const FOLLOWUP_TYPES = ['Quotation', 'Visit', 'Costing'];
const OUTCOMES = [
 { value: 'positive', label: 'Positive', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
 { value: 'neutral', label: 'Neutral', icon: MinusCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
 { value: 'negative', label: 'Negative', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
];
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

function FollowupModal({ onClose, onSubmit, members, editing }) {
 const [form, setForm] = useState({
 companyName: editing?.companyName || editing?.customerName || '',
 contactPerson: editing?.contactPerson || '',
 contactPhone: editing?.contactPhone || editing?.phone || '',
 description: editing?.description || editing?.notes || '',
 taskType: editing?.taskType || '',
 assignedTo: editing?.assignedTo || '',
 assignedToName: editing?.assignedToName || '',
 targetDate: editing?.targetDate
 ? (typeof editing.targetDate.toDate === 'function' ? editing.targetDate.toDate().toISOString().split('T')[0] : new Date(editing.targetDate).toISOString().split('T')[0])
 : new Date().toISOString().split('T')[0],
 status: editing?.status || 'open',
 outcome: editing?.outcome || '',
 nextFollowupDate: editing?.nextFollowupDate
 ? (typeof editing.nextFollowupDate.toDate === 'function' ? editing.nextFollowupDate.toDate().toISOString().split('T')[0] : new Date(editing.nextFollowupDate).toISOString().split('T')[0])
 : editing?.targetDate
 ? (typeof editing.targetDate.toDate === 'function' ? editing.targetDate.toDate().toISOString().split('T')[0] : new Date(editing.targetDate).toISOString().split('T')[0])
 : '',
 rescheduleCount: editing?.rescheduleCount || 0,
 notes: editing?.notes || '',
 });
 const [saving, setSaving] = useState(false);

 const handleSubmit = async () => {
 if (!form.companyName) return;
 setSaving(true);
 try {
 const data = {
 companyName: form.companyName,
 contactPerson: form.contactPerson,
 contactPhone: form.contactPhone,
 description: form.description,
 taskType: form.taskType,
 assignedTo: form.assignedTo,
 assignedToName: form.assignedToName,
 targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
 status: form.status,
 outcome: form.outcome,
 nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
 rescheduleCount: form.rescheduleCount,
 notes: form.notes,
 };
 await onSubmit(data);
 onClose();
 } catch (err) { console.error(err); }
 finally { setSaving(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
 <div className="absolute inset-0 bg-black/40" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-content max-h-[90vh] flex flex-col">
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Follow-Up</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 <div><label className="label">Company Name *</label>
 <input className="input-field" placeholder="Company name" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} /></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Contact Person</label>
 <input className="input-field" placeholder="Contact person" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} /></div>
 <div><label className="label">Contact Phone</label>
 <input className="input-field" placeholder="+91 XXXXX XXXXX" value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} /></div>
 </div>
 <div><label className="label">Description / Activity</label>
 <textarea className="input-field resize-none" rows={3} placeholder="What needs to be done" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Task Type</label>
 <select className="input-field" value={form.taskType} onChange={e => setForm({...form, taskType: e.target.value})}>
 <option value="">Select type</option>
 {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select></div>
 <div><label className="label">Target Date</label>
 <input className="input-field" type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Assign To</label>
 <select className="input-field" value={form.assignedTo}
 onChange={e => { const m = members.find(m => m.id === e.target.value); setForm({...form, assignedTo: e.target.value, assignedToName: m?.name || ''}); }}>
 <option value="">Select member</option>
 {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select></div>
 <div><label className="label">Next Followup Date</label>
 <input className="input-field" type="date" value={form.nextFollowupDate} onChange={e => setForm({...form, nextFollowupDate: e.target.value})} /></div>
 </div>
 {editing && (
 <>
 <div><label className="label">Outcome</label>
 <div className="flex gap-2">
 {OUTCOMES.map(o => {
 const Icon = o.icon;
 return (
 <button key={o.value} onClick={() => setForm({...form, outcome: o.value, status: o.value ? 'closed' : form.status})}
 className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
 form.outcome === o.value ? o.color : 'border-gray-200 text-gray-400 hover:border-gray-300'
 }`}>
 <Icon className="w-3.5 h-3.5" /> {o.label}
 </button>
 );
 })}
 </div>
 </div>
 <div><label className="label">Status</label>
 <select className="input-field" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
 <option value="open">Open</option><option value="closed">Closed</option>
 </select></div>
 </>
 )}
 <div><label className="label">Notes</label>
 <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
 </div>
 <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
 <button onClick={onClose} className="btn-secondary">Cancel</button>
 <button onClick={handleSubmit} disabled={saving} className="btn-primary">
 {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Add'} Follow-Up</>}
 </button>
 </div>
 </div>
 </div>
  );
}

function FollowupDetailPanel({ followup, onClose }) {
 if (!followup) return null;
 const statusColors = { open: 'badge-blue', overdue: 'badge-red', closed: 'badge-green' };
 
 return (
 <div className="fixed inset-0 z-50 flex items-end justify-end">
 <div className="absolute inset-0 bg-black/20" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] w-full max-w-md h-full shadow-2xl overflow-y-auto border-l border-gray-100" style={{ animation: 'slideInRight 0.3s ease-out' }}>
 <div className="sticky top-0 bg-[var(--bg-card)] z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">Follow-Up Details</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
 </div>
 <div className="px-6 py-5 space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
 <Calendar className="w-5 h-5 text-blue-600" />
 </div>
 <div>
 <p className="font-semibold text-gray-900">{followup.companyName || followup.customerName}</p>
 <p className="text-xs text-gray-400">{followup.contactPerson ? `${followup.contactPerson} | ` : ''}{followup.contactPhone || followup.phone || 'No phone'}</p>
 </div>
 </div>
 <div className="bg-gray-50 rounded-lg p-3">
 <p className="text-[10px] text-gray-400 mb-1">Activity / Description</p>
 <p className="text-sm font-semibold whitespace-pre-wrap">{followup.description || '-'}</p>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Type</p><p className="text-sm font-semibold">{followup.taskType || '-'}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Status</p><p className="text-sm font-semibold"><span className={`badge ${statusColors[followup.status] || 'badge-gray'}`}>{followup.status}</span></p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Assigned To</p><p className="text-sm font-semibold">{followup.assignedToName || '-'}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Target Date</p><p className="text-sm font-semibold">{formatDate(followup.targetDate)}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Next Followup Date</p><p className="text-sm font-semibold text-blue-600">{formatDate(followup.nextFollowupDate || followup.targetDate)}</p></div>
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Reschedule Count</p><p className="text-sm font-semibold text-amber-600">{followup.rescheduleCount || 0}</p></div>
 </div>
 {followup.rescheduleReason && (
 <div className="bg-amber-50 rounded-lg p-3 border border-amber-100"><p className="text-[10px] text-amber-600 mb-1">Last Reschedule Reason</p><p className="text-sm text-amber-900">{followup.rescheduleReason}</p></div>
 )}
 {followup.remarks && (
 <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
 <div className="flex justify-between items-center mb-1">
   <p className="text-[10px] text-teal-600">Last Note</p>
   <p className="text-[10px] text-teal-600">{followup.lastNoteBy || 'Member'} • {formatDate(followup.lastNoteDate)}</p>
 </div>
 <p className="text-sm text-teal-900 whitespace-pre-wrap">{followup.remarks}</p>
 </div>
 )}
 {followup.notes && (
 <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 mb-1">Admin Notes</p><p className="text-sm text-gray-600 whitespace-pre-wrap">{followup.notes}</p></div>
 )}
 </div>
 </div>
 </div>
 );
}

export default function FollowupPage() {
 const toast = useToast();
 const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
 const { followups, loading, addFollowup, updateFollowup, deleteFollowup } = useFollowups();
 const { members } = useTeam();
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState(null);
 const [view, setView] = useState('table');
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('All');
 const [filterType, setFilterType] = useState('All');
 const [filterMember, setFilterMember] = useState('All');
 const [dateRange, setDateRange] = useState({ start: '', end: '' });
 const [selectedFollowup, setSelectedFollowup] = useState(null);
 const [selectedFollowupIds, setSelectedFollowupIds] = useState([]);
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

 const activeMembers = members.filter(m => m.role === 'member' && m.status === 'active');

 const filtered = useMemo(() => {
 return followups.filter(f => {
 const matchSearch = search === '' ||
 (f.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
 (f.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
 (f.contactPhone || '').includes(search) ||
 (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
 (f.taskType || '').toLowerCase().includes(search.toLowerCase());
 const matchStatus = filterStatus === 'All' || f.statusCategory === filterStatus;
 const matchType = filterType === 'All' || f.taskType === filterType;
 const matchMember = filterMember === 'All' || f.assignedTo === filterMember;

 let matchDate = true;
 if (dateRange.start || dateRange.end) {
   const rawDate = f.nextFollowupDate || f.targetDate;
   if (!rawDate) {
     matchDate = false;
   } else {
     const target = typeof rawDate.toDate === 'function' ? rawDate.toDate() : new Date(rawDate);
     if (!Number.isNaN(target.getTime())) {
       const t = target.getTime();
       if (dateRange.start && t < new Date(dateRange.start).getTime()) matchDate = false;
       if (dateRange.end && t > new Date(dateRange.end).getTime() + 86400000) matchDate = false;
     } else {
       matchDate = false;
     }
   }
 }

 return matchSearch && matchStatus && matchType && matchMember && matchDate;
 });
 }, [followups, search, filterStatus, filterType, filterMember, dateRange]);

 const selectedFollowupSet = useMemo(() => new Set(selectedFollowupIds), [selectedFollowupIds]);
 const visibleFollowupIds = useMemo(() => filtered.map((followup) => followup.id), [filtered]);
 const allVisibleSelected = visibleFollowupIds.length > 0
 && visibleFollowupIds.every((followupId) => selectedFollowupSet.has(followupId));

 const toggleFollowupSelection = (followupId) => {
 setSelectedFollowupIds((prev) => (
 prev.includes(followupId)
 ? prev.filter((id) => id !== followupId)
 : [...prev, followupId]
 ));
 };

 const toggleAllVisibleFollowups = () => {
 setSelectedFollowupIds((prev) => {
 if (allVisibleSelected) {
 return prev.filter((followupId) => !visibleFollowupIds.includes(followupId));
 }

 return Array.from(new Set([...prev, ...visibleFollowupIds]));
 });
 };

 // Today's follow-ups
 const todayFollowups = useMemo(() => {
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 return followups.filter(f => {
 if (f.isClosed) return false;
 const rawDate = f.nextFollowupDate || f.targetDate;
 const d = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
 if (isNaN(d?.getTime())) return false;
 d.setHours(0, 0, 0, 0);
 return d.getTime() === today.getTime();
 });
 }, [followups]);

 // Outcome stats
 const outcomeStats = useMemo(() => {
 const positive = followups.filter(f => f.outcome === 'positive').length;
 const neutral = followups.filter(f => f.outcome === 'neutral').length;
 const negative = followups.filter(f => f.outcome === 'negative').length;
 const total = positive + neutral + negative;
 return {
 data: [
 { name: 'Positive', value: positive, color: '#10b981' },
 { name: 'Neutral', value: neutral, color: '#f59e0b' },
 { name: 'Negative', value: negative, color: '#ef4444' },
 ].filter(d => d.value > 0),
 total,
 positive,
 neutral,
 negative,
 };
 }, [followups]);

 const handleAdd = async (data) => {
 try { 
    await addFollowup(data); 
    if (data.assignedTo) {
      const member = members.find(m => m.id === data.assignedTo);
      if (member?.whatsapp) {
        try { await notifyFollowupAssigned(member, data); } catch (e) { console.error('Notify error:', e); }
      }
    }
    toast.success('Followup added!'); 
  }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const handleEdit = async (data) => {
 try { await updateFollowup(editing.id, data); toast.success('Follow-up updated!'); }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const deleteFollowupRecord = (id) => {
 confirmDelete({
 title: 'Delete Follow-up',
 description: 'Delete this follow-up record permanently?',
 onConfirm: async () => {
 await deleteFollowup(id);
 setSelectedFollowupIds((prev) => prev.filter((followupId) => followupId !== id));
 toast.success('Follow-up deleted');
 },
 });
 };

 const bulkDeleteFollowups = () => {
 const idsToDelete = selectedFollowupIds.filter((id) => followups.some((followup) => followup.id === id));
 if (idsToDelete.length === 0) return;

 confirmDelete({
 title: `Delete ${idsToDelete.length} Items`,
 description: `Permanently delete ${idsToDelete.length} selected follow-ups? This cannot be undone.`,
 onConfirm: async () => {
 await Promise.all(idsToDelete.map((id) => deleteFollowup(id)));
 setSelectedFollowupIds([]);
 toast.success(`${idsToDelete.length} items deleted`);
 },
 });
 };

  const openReschedule = (item) => {
  setRescheduleItem(item);
  const rawDate = item.nextFollowupDate || item.targetDate;
  const td = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
  setNewRescheduleDate(!isNaN(td?.getTime()) ? td.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  };

  const handleReschedule = async () => {
  if (!rescheduleItem || !newRescheduleDate) return;
  setRescheduleSaving(true);
  try {
  await updateFollowup(rescheduleItem.id, {
  nextFollowupDate: Timestamp.fromDate(new Date(newRescheduleDate)),
  rescheduleCount: (rescheduleItem.rescheduleCount || 0) + 1,
  });
  toast.success('Rescheduled!');
  setRescheduleItem(null);
  } catch (err) { toast.error('Failed: ' + err.message); }
  finally { setRescheduleSaving(false); }
  };

 const statusColors = { open: 'badge-blue', overdue: 'badge-red', closed: 'badge-green' };
 const open = followups.filter(f => !f.isClosed).length;
 const overdue = followups.filter(f => f.statusCategory === 'overdue').length;

 return (
 <div className="space-y-6 page-transition">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Follow-Up Management</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{followups.length} follow-ups | {open} open | {overdue} overdue</p>
 </div>
 <div className="flex items-center gap-3">
 <ExportButton
 data={filtered}
 columns={[
 { key: 'companyName', label: 'Company' },
 { key: 'contactPerson', label: 'Contact Person' },
 { key: 'contactPhone', label: 'Phone' },
 { key: 'description', label: 'Description' },
 { key: 'taskType', label: 'Task Type' },
 { key: 'assignedToName', label: 'Assigned' },
 { key: 'status', label: 'Status' },
 { key: 'outcome', label: 'Outcome' },
 ]}
 filename="followups"
 />
 <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
 <Plus className="w-4 h-4" /> New Follow-Up
 </button>
 </div>
 </div>

 {/* Stats + Today */}
 <div className="grid grid-cols-4 gap-4">
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-blue-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Total</p><p className="text-lg font-bold text-gray-900"><CountUpNumber end={followups.length} /></p></div>
 </div>
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Today</p><p className="text-lg font-bold text-amber-600"><CountUpNumber end={todayFollowups.length} /></p></div>
 </div>
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Overdue</p><p className="text-lg font-bold text-red-600"><CountUpNumber end={overdue} /></p></div>
 </div>
 <div className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">Positive Rate</p>
 <p className="text-lg font-bold text-green-600">{outcomeStats.total > 0 ? Math.round((outcomeStats.positive / outcomeStats.total) * 100) : 0}%</p></div>
 </div>
 </div>

 {/* Today's Follow-ups Banner */}
 {todayFollowups.length > 0 && (
 <div className="alert-banner alert-banner-orange">
 <Clock className="w-5 h-5" />
 <div className="flex-1">
 <p className="font-semibold">{todayFollowups.length} Follow-up{todayFollowups.length > 1 ? 's' : ''} Due Today</p>
 <p className="text-xs opacity-75 mt-0.5">
 {todayFollowups.slice(0, 3).map(f => f.companyName || 'Untitled').join(', ')}
 {todayFollowups.length > 3 && ` +${todayFollowups.length - 3} more`}
 </p>
 </div>
 </div>
 )}

 {/* Outcome Stats (mini) */}
 {outcomeStats.total > 0 && (
 <div className="card flex items-center gap-6 py-3">
 <div className="w-16 h-16">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart><Pie data={outcomeStats.data} cx="50%" cy="50%" innerRadius={16} outerRadius={28} paddingAngle={3} dataKey="value">
 {outcomeStats.data.map((d, i) => <Cell key={i} fill={d.color} />)}
 </Pie></PieChart>
 </ResponsiveContainer>
 </div>
 <div className="flex gap-6">
 {OUTCOMES.map(o => {
 const count = outcomeStats[o.value] || 0;
 const Icon = o.icon;
 return (
 <div key={o.value} className="flex items-center gap-2">
 <Icon className={`w-4 h-4 ${o.color.split(' ')[0]}`} />
 <span className="text-sm font-semibold text-gray-700">{count}</span>
 <span className="text-xs text-gray-400">{o.label}</span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Filters + View Toggle */}
 <div className="card py-3 px-4">
 <div className="flex flex-col gap-3">
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative flex-1 min-w-[200px] max-w-xs">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" placeholder="Search company, contact..." className="input-field pl-9 w-full"
 value={search} onChange={e => setSearch(e.target.value)} />
 </div>
 <select className="input-field w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">All Status</option>
 <option value="open">Open</option><option value="overdue">Overdue</option><option value="closed">Closed</option>
 </select>
 <select className="input-field w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
 <option value="All">All Types</option>
 {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select>
 <select className="input-field w-36" value={filterMember} onChange={e => setFilterMember(e.target.value)}>
 <option value="All">All Members</option>
 {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select>
 <div className="flex items-center gap-2">
 <input type="date" className="input-field w-32" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} title="Next Followup Start Date" />
 <span className="text-gray-400">-</span>
 <input type="date" className="input-field w-32" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} title="Next Followup End Date" />
 </div>
 <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
 <div className="view-toggle">
 <button onClick={() => setView('table')} className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}>
 <LayoutGrid className="w-3.5 h-3.5" /> Table
 </button>
 <button onClick={() => setView('calendar')} className={`view-toggle-btn ${view === 'calendar' ? 'active' : ''}`}>
 <Calendar className="w-3.5 h-3.5" /> Calendar
 </button>
 </div>
 </div>
 </div>
 </div>

 <BulkDeleteBar
 selectedCount={selectedFollowupIds.length}
 onDelete={bulkDeleteFollowups}
 onClear={() => setSelectedFollowupIds([])}
 />

 {/* Content */}
 {loading ? (
 view === 'calendar' ? <div className="card"><SkeletonCalendar /></div> : <SkeletonTable rows={5} cols={7} />
 ) : filtered.length === 0 ? (
 <EmptyState icon="noData" title="No follow-ups found" actionLabel="New Follow-Up" onAction={() => { setEditing(null); setShowModal(true); }} />
 ) : view === 'calendar' ? (
 <div className="card">
 <CalendarView
 items={filtered}
 dateField="dueDate"
 onDayClick={(day, items) => {
 if (items.length === 1) { setEditing(items[0]); setShowModal(true); }
 }}
 />
 </div>
 ) : (
 <div className="card p-0 overflow-hidden">
 <table className="w-full" data-export-table>
 <thead><tr className="bg-gray-50">
 <th className="table-header w-10">
 <input
 type="checkbox"
 checked={allVisibleSelected}
 onChange={toggleAllVisibleFollowups}
 className="rounded accent-teal-600"
 title="Select all follow-ups"
 />
 </th>
 <th className="table-header">Company</th>
 <th className="table-header">Task Type</th>
 <th className="table-header">Assigned</th>
 <th className="table-header">Assigned Date</th>
 <th className="table-header">Target Date</th>
 <th className="table-header">Next Followup</th>
 <th className="table-header">Reschedules</th>
 <th className="table-header">Last Note</th>
 <th className="table-header">Outcome</th>
 <th className="table-header">Status</th>
 <th className="table-header">Actions</th>
 </tr></thead>
 <tbody>
 {filtered.map(f => (
 <tr key={f.id} className="group hover:bg-gray-50 transition-colors">
 <td className="table-cell">
 <input
 type="checkbox"
 checked={selectedFollowupSet.has(f.id)}
 onChange={() => toggleFollowupSelection(f.id)}
 className="rounded accent-teal-600"
 title="Select follow-up"
 />
 </td>
 <td className="table-cell">
 <div><p className="font-medium text-gray-900">{f.companyName || 'Untitled follow-up'}</p>
 <p className="text-[10px] text-gray-400">{f.contactPerson ? `${f.contactPerson} | ` : ''}{f.contactPhone || ''}</p></div>
 </td>
 <td className="table-cell text-gray-600 text-xs">{f.taskType || '-'}</td>
 <td className="table-cell text-gray-600 text-xs">{f.assignedToName || '-'}</td>
 <td className="table-cell text-gray-600 text-xs">{formatDate(f.assignedDate || f.createdAt)}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{formatDate(f.nextFollowupDate || f.targetDate)}</td>
 <td className="table-cell text-center">
 {(f.rescheduleCount || 0) > 0 ? (
 <span className="text-xs font-medium text-amber-500">x{f.rescheduleCount}</span>
 ) : <span className="text-gray-300">-</span>}
 </td>
 <td className="table-cell">
 {f.outcome ? (
 <span className={`badge ${f.outcome === 'positive' ? 'badge-green' : f.outcome === 'negative' ? 'badge-red' : 'badge-yellow'}`}>
 {f.outcome}
 </span>
 ) : <span className="text-gray-300">-</span>}
 </td>
 <td className="table-cell">
 <span className={`badge ${statusColors[f.status] || 'badge-gray'}`}>{f.status}</span>
 {(f.overdueDays || 0) > 0 && <span className="text-[10px] text-red-400 ml-1">{f.overdueDays}d</span>}
 </td>
 <td className="table-cell">
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => { setEditing(f); setShowModal(true); }} className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded font-medium">Edit</button>
 {!f.isClosed && (
 <button onClick={() => openReschedule(f)} className="text-xs text-amber-600 hover:bg-amber-50 px-2 py-1 rounded font-medium">Reschedule</button>
 )}
 <DeleteButton onClick={() => deleteFollowupRecord(f.id)} />
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {showModal && <FollowupModal onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={editing ? handleEdit : handleAdd} members={activeMembers} editing={editing} />}

  {/* Fix P10: Custom reschedule modal */}
  {rescheduleItem && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/40" onClick={() => setRescheduleItem(null)} />
  <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-1">Reschedule Follow-Up</h2>
  <p className="text-sm text-gray-500 mb-4">{rescheduleItem.companyName || 'Untitled follow-up'}</p>
  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">New Followup Date</label>
  <input type="date" className="input-field mb-5 w-full" value={newRescheduleDate} onChange={e => setNewRescheduleDate(e.target.value)} />
  <div className="flex gap-3">
  <button onClick={() => setRescheduleItem(null)} className="btn-secondary flex-1">Cancel</button>
  <button onClick={handleReschedule} disabled={rescheduleSaving || !newRescheduleDate} className="btn-primary flex-1">{rescheduleSaving ? 'Saving...' : 'Confirm'}</button>
  </div>
  </div>
  </div>
  )}
  <FollowupDetailPanel followup={selectedFollowup} onClose={() => setSelectedFollowup(null)} />
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




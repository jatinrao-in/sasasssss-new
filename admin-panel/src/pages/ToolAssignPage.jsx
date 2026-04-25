import { useState, useMemo } from 'react';
import { Plus, Wrench, X, Search, RotateCcw, Trash2, Edit3, Package, Clock, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useTools } from '../hooks/useTools';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';
import { Timestamp } from 'firebase/firestore';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import ExportButton from '../components/ui/ExportButton';

function AssignToolModal({ onClose, onSubmit, members, editing }) {
 const [form, setForm] = useState({
 toolName: editing?.toolName || '',
 assignedTo: editing?.assignedTo || '',
 assignedToName: editing?.assignedToName || '',
 handedOverDate: editing?.handedOverDate ? (editing.handedOverDate.toDate ? editing.handedOverDate.toDate().toISOString().split('T')[0] : new Date(editing.handedOverDate).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
 returnStatus: editing?.returnStatus || 'pending',
 condition: editing?.condition || 'Good',
 });
 const [saving, setSaving] = useState(false);

 const handleSubmit = async () => {
 if (!form.toolName || !form.assignedTo) return;
 setSaving(true);
 try {
 await onSubmit({
 toolName: form.toolName,
 assignedTo: form.assignedTo,
 assignedToName: form.assignedToName,
 handedOverDate: form.handedOverDate ? Timestamp.fromDate(new Date(form.handedOverDate)) : null,
 returnStatus: form.returnStatus,
 condition: form.condition,
 });
 onClose();
 } catch (err) { console.error(err); }
 finally { setSaving(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
 <div className="absolute inset-0 bg-black/40" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-content">
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Assign'} Tool</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4">
 <div><label className="label">Select Team Member *</label>
 <select className="input-field" value={form.assignedTo}
 onChange={e => { const m = members.find(m => m.id === e.target.value); setForm({...form, assignedTo: e.target.value, assignedToName: m?.name || ''}); }}>
 <option value="">Select member</option>
 {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select></div>
 <div><label className="label">Tool Name *</label>
 <input className="input-field" placeholder="e.g. Laptop, Drill Machine, Meter" value={form.toolName} onChange={e => setForm({...form, toolName: e.target.value})} /></div>
 <div><label className="label">Handed Over Date</label>
 <input className="input-field" type="date" value={form.handedOverDate} onChange={e => setForm({...form, handedOverDate: e.target.value})} /></div>
 <div><label className="label">Return Status</label>
 <select className="input-field" value={form.returnStatus} onChange={e => setForm({...form, returnStatus: e.target.value})}>
 <option value="pending">Pending</option>
 <option value="returned">Returned</option>
 </select></div>
 </div>
 <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
 <button onClick={onClose} className="btn-secondary">Cancel</button>
 <button onClick={handleSubmit} disabled={saving} className="btn-primary">
 {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Assign'} Tool</>}
 </button>
 </div>
 </div>
 </div>
 );
}

export default function ToolAssignPage() {
 const toast = useToast();
 const { tools, loading, assignTool, updateTool, markReturned, deleteTool } = useTools();
 const { members } = useTeam();
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState(null);
 const [filterMember, setFilterMember] = useState('All');
 const [filterReturn, setFilterReturn] = useState('All');
 const [search, setSearch] = useState('');
 const [showAnalytics, setShowAnalytics] = useState(false);

 const analytics = useMemo(() => {
 const condMap = { Good: 0, Fair: 0, Poor: 0, Damaged: 0 };
 tools.forEach(t => {
 const c = t.condition || 'Good';
 if (condMap[c] !== undefined) condMap[c]++;
 else condMap[c] = 1;
 });
 const byCondition = Object.keys(condMap).map(k => ({ name: k, value: condMap[k] })).filter(d => d.value > 0);

 const memMap = {};
 tools.filter(t => t.returnStatus === 'pending').forEach(t => {
 const name = t.assignedToName || 'Unknown';
 if (!memMap[name]) memMap[name] = 0;
 memMap[name]++;
 });
 const byMember = Object.keys(memMap).map(k => ({ name: k.split(' ')[0], count: memMap[k] }))
 .sort((a,b) => b.count - a.count).slice(0, 5);

 return { byCondition, byMember };
 }, [tools]);

 const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

 const activeMembers = members.filter(m => m.role === 'member' && m.status === 'active');

 const filtered = tools.filter(t => {
 const matchMember = filterMember === 'All' || t.assignedTo === filterMember;
 const matchReturn = filterReturn === 'All' || t.returnStatus === filterReturn;
 const matchSearch = search === '' ||
 (t.toolName || '').toLowerCase().includes(search.toLowerCase()) ||
 (t.assignedToName || '').toLowerCase().includes(search.toLowerCase());
 return matchMember && matchReturn && matchSearch;
 });

 const pendingReturn = tools.filter(t => t.returnStatus === 'pending').length;

 const handleAssign = async (data) => {
 try {
 await assignTool(data);
 toast.success('Tool assigned!');
 } catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const handleEdit = async (data) => {
 try {
 await updateTool(editing.id, data);
 toast.success('Tool updated!');
 } catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const handleMarkReturned = async (id) => {
 try {
 await markReturned(id);
 toast.success('Tool marked as returned!');
 } catch (err) { toast.error('Failed: ' + err.message); }
 };

 const handleDelete = async (id) => {
 if (!confirm('Delete this tool record?')) return;
 try {
 await deleteTool(id);
 toast.success('Tool record deleted!');
 } catch (err) { toast.error('Failed: ' + err.message); }
 };

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div><h1 className="text-2xl font-bold text-gray-900">Tool Assignment</h1><p className="text-sm text-[var(--text-muted)] mt-0.5">{tools.length} tools | {pendingReturn} pending return</p></div>
 <div className="flex items-center gap-3">
 <ExportButton
 data={filtered}
 columns={[
 { key: 'toolName', label: 'Tool' },
 { key: 'assignedToName', label: 'Assigned To' },
 { key: 'condition', label: 'Condition' },
 { key: 'returnStatus', label: 'Return Status' },
 ]}
 filename="tool_assignments"
 />
 <button onClick={() => setShowAnalytics(!showAnalytics)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showAnalytics ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'}`}>
 <BarChart3 className="w-3.5 h-3.5" /> Analytics
 </button>
 <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="w-4 h-4" /> Assign Tool</button>
 </div>
 </div>
 <div className="grid grid-cols-4 gap-4">
 {[
 { label: 'Total Assigned', value: tools.length, icon: Package, color: 'bg-blue-50 text-blue-600' },
 { label: 'Pending Return', value: pendingReturn, icon: Clock, color: 'bg-amber-50 text-amber-600' },
 { label: 'Returned', value: tools.filter(t => t.returnStatus === 'returned').length, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
 { label: 'Overdue (30d+)', value: tools.filter(t => t.returnStatus === 'pending' && t.handedOverDate && (new Date() - (t.handedOverDate.toDate ? t.handedOverDate.toDate() : new Date(t.handedOverDate))) > 30 * 24 * 60 * 60 * 1000).length, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
 ].map((s, i) => {
 const Icon = s.icon;
 return (
 <div key={i} className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color.split(' ')[0]}`}><Icon className={`w-5 h-5 ${s.color.split(' ')[1]}`} /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">{s.label}</p><p className="text-lg font-bold text-gray-900"><CountUpNumber end={s.value} /></p></div>
 </div>
 );
 })}
 </div>

 {showAnalytics && (
 <div className="grid grid-cols-2 gap-5">
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Tool Condition Breakdown</h3>
 <ResponsiveContainer width="100%" height={240}>
 <PieChart>
 <Pie data={analytics.byCondition} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
 {analytics.byCondition.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
 </Pie>
 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
 </PieChart>
 </ResponsiveContainer>
 <div className="flex flex-wrap gap-4 mt-2 justify-center">
 {analytics.byCondition.map((d, i) => (
 <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
 <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}
 </div>
 ))}
 </div>
 </div>
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Members Holding Tools (Pending Return)</h3>
 <ResponsiveContainer width="100%" height={240}>
 <BarChart data={analytics.byMember} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
 <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
 <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} axisLine={false} tickLine={false} />
 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
 <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Assigned Tools" />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 )}

 <div className="card py-4">
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" placeholder="Search tool or member..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 w-56" /></div>
 <select className="input-field w-44" value={filterMember} onChange={e => setFilterMember(e.target.value)}>
 <option value="All">All Members</option>
 {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select>
 <select className="input-field w-36" value={filterReturn} onChange={e => setFilterReturn(e.target.value)}>
 <option value="All">All Status</option>
 <option value="pending">Pending</option>
 <option value="returned">Returned</option>
 </select>
 <span className="ml-auto text-sm text-gray-500">{filtered.length} records</span>
 </div>
 </div>
 <div className="card p-0 overflow-hidden">
 {loading ? (
 <SkeletonTable rows={5} cols={7} />
 ) : filtered.length === 0 ? (
 <EmptyState icon="noData" title="No tools assigned yet" actionLabel="Assign Tool" onAction={() => { setEditing(null); setShowModal(true); }} />
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead><tr className="bg-gray-50">
 <th className="table-header">Tool Name</th><th className="table-header">Assigned To</th>
 <th className="table-header">Handed Over</th><th className="table-header">Condition</th>
 <th className="table-header">Return Status</th><th className="table-header">Return Date</th>
 <th className="table-header">Actions</th>
 </tr></thead>
 <tbody>
 {filtered.map(item => {
 const handed = item.handedOverDate?.toDate ? item.handedOverDate.toDate() : new Date(item.handedOverDate);
 const daysSince = handed && !isNaN(handed.getTime()) ? Math.floor((new Date() - handed) / (1000*60*60*24)) : 0;
 return (
 <tr key={item.id} className="hover:bg-gray-50 transition-colors">
 <td className="table-cell font-medium text-gray-900">{item.toolName}</td>
 <td className="table-cell text-gray-600">{item.assignedToName || '-'}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">
 {formatDate(item.handedOverDate)}
 {item.returnStatus === 'pending' && daysSince > 0 && (
 <span className={`ml-1 text-[10px] font-medium ${daysSince > 30 ? 'text-red-400' : daysSince > 15 ? 'text-amber-400' : 'text-gray-400'}`}>({daysSince}d)</span>
 )}
 </td>
 <td className="table-cell">
 <span className={`badge ${
 (item.condition || 'Good') === 'Good' ? 'badge-green' :
 item.condition === 'Fair' ? 'badge-yellow' :
 item.condition === 'Poor' ? 'badge-orange' : 'badge-red'
 }`}>{item.condition || 'Good'}</span>
 </td>
 <td className="table-cell"><span className={`badge ${item.returnStatus === 'returned' ? 'badge-green' : 'badge-yellow'}`}>{item.returnStatus}</span></td>
 <td className="table-cell text-[var(--text-muted)] text-xs">{formatDate(item.returnDate)}</td>
 <td className="table-cell">
 <div className="flex items-center gap-1">
 {item.returnStatus === 'pending' && (
 <button onClick={() => handleMarkReturned(item.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Mark Returned"><RotateCcw className="w-3.5 h-3.5" /></button>
 )}
 <button onClick={() => { setEditing(item); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
 <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 {showModal && <AssignToolModal onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={editing ? handleEdit : handleAssign} members={activeMembers} editing={editing} />}
 </div>
 );
}


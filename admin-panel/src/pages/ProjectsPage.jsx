import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 Plus, FolderOpen, X, Search, LayoutGrid, List, Columns3,
 TrendingUp, Users, DollarSign, CircleDot, Edit3,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useProjects } from '../hooks/useProjects';
import { useToast } from '../hooks/useToast';
import { formatLakhs } from '../lib/formatters';
import { SkeletonCards, SkeletonTable, SkeletonKanban } from '../components/ui/Skeleton';
import KanbanBoard from '../components/ui/KanbanBoard';
import EmptyState from '../components/ui/EmptyState';
import { StatusDot, StatusPill, getProjectHealthMeta } from '../components/ui/TextIndicators';

const PROJECT_STATUSES = ['planning', 'in_progress', 'review', 'completed', 'on_hold'];

function AddProjectModal({ onClose, onSubmit, editing }) {
 const [form, setForm] = useState({
 name: editing?.name || '',
 client: editing?.client || '',
 poNumber: editing?.poNumber || '',
 poValue: editing?.poValue || '',
 status: editing?.status || 'planning',
 startDate: editing?.startDate
 ? (typeof editing.startDate.toDate === 'function' ? editing.startDate.toDate().toISOString().split('T')[0] : new Date(editing.startDate).toISOString().split('T')[0])
 : new Date().toISOString().split('T')[0],
 deadline: editing?.deadline
 ? (typeof editing.deadline.toDate === 'function' ? editing.deadline.toDate().toISOString().split('T')[0] : new Date(editing.deadline).toISOString().split('T')[0])
 : '',
 projectManager: editing?.projectManager || '',
 description: editing?.description || '',
 });
 const [saving, setSaving] = useState(false);

 const handleSubmit = async () => {
 if (!form.name) return;
 setSaving(true);
 try {
 await onSubmit({
 name: form.name,
 client: form.client,
 poNumber: form.poNumber,
 poValue: Number(form.poValue) || 0,
 status: form.status,
 startDate: form.startDate ? Timestamp.fromDate(new Date(form.startDate)) : null,
 deadline: form.deadline ? Timestamp.fromDate(new Date(form.deadline)) : null,
 projectManager: form.projectManager,
 description: form.description,
 });
 onClose();
 } catch (err) {
 console.error(err);
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
 <div className="absolute inset-0 bg-black/40" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 modal-content max-h-[90vh] flex flex-col">
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Project</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 <div><label className="label">Project Name *</label>
 <input className="input-field" placeholder="Enter project name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Client</label>
 <input className="input-field" placeholder="Client name" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></div>
 <div><label className="label">PO Number</label>
 <input className="input-field" placeholder="PO-001" value={form.poNumber} onChange={e => setForm({ ...form, poNumber: e.target.value })} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">PO Value (Rs)</label>
 <input className="input-field" type="number" placeholder="0" value={form.poValue} onChange={e => setForm({ ...form, poValue: e.target.value })} /></div>
 <div><label className="label">Status</label>
 <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
 {PROJECT_STATUSES.map(status => <option key={status} value={status}>{status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
 </select></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Start Date</label>
 <input className="input-field" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
 <div><label className="label">Deadline</label>
 <input className="input-field" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
 </div>
 <div><label className="label">Description</label>
 <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
 </div>
 <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
 <button onClick={onClose} className="btn-secondary">Cancel</button>
 <button onClick={handleSubmit} disabled={saving} className="btn-primary">
 {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Project</>}
 </button>
 </div>
 </div>
 </div>
 );
}

function getHealthIndicator(project) {
 const completion = project.completionPercent || 0;
 const expense = project.totalExpense || 0;
 const poValue = project.poValue || 1;
 const utilization = (expense / poValue) * 100;

 if (completion >= 80 && utilization < 80) return getProjectHealthMeta('on-track');
 if (utilization > 90 || (completion < 30 && project.status === 'in_progress')) return getProjectHealthMeta('critical');
 return getProjectHealthMeta('at-risk');
}

export default function ProjectsPage() {
 const navigate = useNavigate();
 const toast = useToast();
 const { projects, loading, addProject, updateProject } = useProjects();
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState(null);
 const [view, setView] = useState('grid');
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('All');
 const [filterHealth, setFilterHealth] = useState('All');

 const filtered = useMemo(() => {
 return projects.filter(project => {
 const matchSearch = search === '' ||
 (project.name || '').toLowerCase().includes(search.toLowerCase()) ||
 (project.client || '').toLowerCase().includes(search.toLowerCase()) ||
 (project.poNumber || '').toLowerCase().includes(search.toLowerCase());
 const matchStatus = filterStatus === 'All' || project.status === filterStatus;
 const health = getHealthIndicator(project);
 const matchHealth = filterHealth === 'All' || health.label === filterHealth;
 return matchSearch && matchStatus && matchHealth;
 });
 }, [projects, search, filterStatus, filterHealth]);

 const handleAdd = async (data) => {
 try {
 await addProject(data);
 toast.success('Project created!');
 } catch (err) {
 toast.error('Failed: ' + err.message);
 throw err;
 }
 };

 const handleEdit = async (data) => {
 try {
 await updateProject(editing.id, data);
 toast.success('Project updated!');
 } catch (err) {
 toast.error('Failed: ' + err.message);
 throw err;
 }
 };

 const handleKanbanDrop = async (item, newStatus) => {
 try {
 await updateProject(item.id, { status: newStatus });
 toast.success(`${item.name} -> ${newStatus.replace('_', ' ')}`);
 } catch (err) {
 toast.error('Failed: ' + err.message);
 }
 };

 const statusColors = {
 planning: 'badge-blue',
 in_progress: 'badge-teal',
 review: 'badge-yellow',
 completed: 'badge-green',
 on_hold: 'badge-gray',
 };

 const totalPO = projects.reduce((sum, project) => sum + Number(project.poValue || 0), 0);
 const totalExpense = projects.reduce((sum, project) => sum + Number(project.totalExpense || 0), 0);
 const avgCompletion = projects.length > 0 ? Math.round(projects.reduce((sum, project) => sum + (project.completionPercent || 0), 0) / projects.length) : 0;

 const kanbanColumns = PROJECT_STATUSES.map(status => ({
 id: status,
 label: status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
 }));

 const kanbanItems = filtered.map(project => ({
 ...project,
 column: project.status,
 title: project.name,
 subtitle: project.client,
 }));

 return (
 <div className="space-y-6 page-transition">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{projects.length} projects | {formatLakhs(totalPO)} total PO value</p>
 </div>
 <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary">
 <Plus className="w-4 h-4" /> New Project
 </button>
 </div>

 <div className="grid grid-cols-4 gap-4">
 {[
 { label: 'Total Projects', value: projects.length, icon: FolderOpen, color: 'bg-blue-50 text-blue-600' },
 { label: 'Total PO Value', value: formatLakhs(totalPO), icon: DollarSign, color: 'bg-green-50 text-green-600' },
 { label: 'Total Expense', value: formatLakhs(totalExpense), icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
 { label: 'Avg Completion', value: `${avgCompletion}%`, icon: CircleDot, color: 'bg-teal-50 text-teal-600' },
 ].map((stat, index) => {
 const Icon = stat.icon;
 return (
 <div key={index} className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color.split(' ')[0]}`}>
 <Icon className={`w-5 h-5 ${stat.color.split(' ')[1]}`} />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 uppercase font-medium">{stat.label}</p>
 <p className="text-lg font-bold text-gray-900">{stat.value}</p>
 </div>
 </div>
 );
 })}
 </div>

 <div className="card py-3 px-4">
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative flex-1 max-w-xs">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" placeholder="Search projects..." className="input-field pl-9 w-full"
 value={search} onChange={e => setSearch(e.target.value)} />
 </div>
 <select className="input-field w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">All Status</option>
 {PROJECT_STATUSES.map(status => <option key={status} value={status}>{status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
 </select>
 <select className="input-field w-32" value={filterHealth} onChange={e => setFilterHealth(e.target.value)}>
 <option value="All">All Health</option>
 <option value="On Track">On Track</option>
 <option value="At Risk">At Risk</option>
 <option value="Critical">Critical</option>
 </select>
 <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
 <div className="view-toggle">
 {[
 { id: 'grid', icon: LayoutGrid, label: 'Grid' },
 { id: 'list', icon: List, label: 'List' },
 { id: 'kanban', icon: Columns3, label: 'Kanban' },
 ].map(option => {
 const Icon = option.icon;
 return (
 <button key={option.id} onClick={() => setView(option.id)}
 className={`view-toggle-btn ${view === option.id ? 'active' : ''}`}>
 <Icon className="w-3.5 h-3.5" /> {option.label}
 </button>
 );
 })}
 </div>
 </div>
 </div>

 {loading ? (
 view === 'kanban' ? <SkeletonKanban columns={5} /> :
 view === 'list' ? <SkeletonTable rows={5} cols={7} /> :
 <SkeletonCards count={8} />
 ) : filtered.length === 0 ? (
 <EmptyState
 icon="noData"
 title="No projects found"
 description={search || filterStatus !== 'All' ? 'Try adjusting your filters' : 'Create your first project to get started'}
 actionLabel="New Project"
 onAction={() => { setEditing(null); setShowModal(true); }}
 />
 ) : view === 'kanban' ? (
 <KanbanBoard
 columns={kanbanColumns}
 items={kanbanItems}
 onDrop={handleKanbanDrop}
 renderCard={(item) => {
 const health = getHealthIndicator(item);
 return (
 <div onClick={() => navigate(`/projects/${item.id}`)}>
 <div className="flex items-center justify-between mb-1.5 gap-2">
 <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.name}</span>
 <StatusDot label={health.label} color={health.color} style={{ fontSize: '10px', fontWeight: 600 }} />
 </div>
 <p className="text-[10px] text-gray-400 mb-2">{item.client || 'No client'}</p>
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-medium text-teal-600">{formatLakhs(item.poValue)}</span>
 <div className="flex items-center gap-1">
 <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
 <div className="h-full bg-teal-500 rounded-full" style={{ width: `${item.completionPercent || 0}%` }} />
 </div>
 <span className="text-[9px] text-gray-400">{item.completionPercent || 0}%</span>
 </div>
 </div>
 </div>
 );
 }}
 />
 ) : view === 'list' ? (
 <div className="card p-0 overflow-hidden">
 <table className="w-full" data-export-table>
 <thead><tr className="bg-gray-50">
 <th className="table-header">Project</th><th className="table-header">Client</th>
 <th className="table-header">PO Value</th><th className="table-header">Expense</th>
 <th className="table-header">Completion</th><th className="table-header">Health</th>
 <th className="table-header">Status</th>
 </tr></thead>
 <tbody>
 {filtered.map(project => {
 const health = getHealthIndicator(project);
 return (
 <tr key={project.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/projects/${project.id}`)}>
 <td className="table-cell font-medium text-gray-900">{project.name}</td>
 <td className="table-cell text-gray-500">{project.client || '-'}</td>
 <td className="table-cell font-medium">{formatLakhs(project.poValue)}</td>
 <td className="table-cell text-gray-500">{formatLakhs(project.totalExpense)}</td>
 <td className="table-cell">
 <div className="flex items-center gap-2">
 <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
 <div className="h-full bg-teal-500 rounded-full" style={{ width: `${project.completionPercent || 0}%` }} />
 </div>
 <span className="text-xs font-semibold w-8">{project.completionPercent || 0}%</span>
 </div>
 </td>
 <td className="table-cell">
 <StatusDot label={health.label} color={health.color} style={{ fontSize: '12px', fontWeight: 600 }} />
 </td>
 <td className="table-cell"><span className={`badge ${statusColors[project.status] || 'badge-gray'}`}>{(project.status || '').replace('_', ' ')}</span></td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="grid grid-cols-4 gap-5">
 {filtered.map(project => {
 const health = getHealthIndicator(project);
 return (
 <div key={project.id} onClick={() => navigate(`/projects/${project.id}`)}
 className="relative bg-[var(--bg-card)] border border-gray-100 rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:border-teal-200 hover:-translate-y-1 transition-all duration-300 group stagger-item overflow-hidden mt-1">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-2">
 <StatusPill
 label={health.label}
 color={health.color}
 background={health.background}
 borderColor={health.border}
 className={health.label === 'Critical' ? 'animate-pulse' : ''}
 />
 <span className={`badge ${statusColors[project.status] || 'badge-gray'} text-[10px] uppercase font-bold tracking-wider px-2 py-0.5`}>
 {(project.status || '').replace('_', ' ')}
 </span>
 </div>
 <button
 onClick={e => { e.stopPropagation(); setEditing(project); setShowModal(true); }}
 className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
 >
 <Edit3 className="w-4 h-4" />
 </button>
 </div>
 <h3 className="font-bold text-[var(--text-primary)] text-[15px] mb-1 truncate group-hover:text-teal-700 transition-colors">{project.name}</h3>
 <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
 <Users className="w-3.5 h-3.5" />
 <span className="truncate font-medium">{project.client || 'No client assigned'}</span>
 </div>
 <div className="space-y-2 mb-5">
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-gray-700">Progress</span>
 <span className="font-bold text-teal-600">{project.completionPercent || 0}%</span>
 </div>
 <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
 <div className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500 relative" style={{ width: `${project.completionPercent || 0}%` }}>
 <div className="absolute inset-0 bg-white/20" style={{ animation: 'shimmer 2s infinite' }} />
 </div>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
 <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">PO Value</p>
 <p className="text-xs font-bold text-teal-700">{formatLakhs(project.poValue)}</p>
 </div>
 <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-100">
 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">Expense</p>
 <p className={`text-xs font-bold ${project.totalExpense > project.poValue ? 'text-red-600' : 'text-gray-700'}`}>{formatLakhs(project.totalExpense)}</p>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {showModal && (
 <AddProjectModal
 onClose={() => { setShowModal(false); setEditing(null); }}
 onSubmit={editing ? handleEdit : handleAdd}
 editing={editing}
 />
 )}
 </div>
 );
}

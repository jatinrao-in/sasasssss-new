import { useState, useMemo } from 'react';
import { Plus, Users, Mail, Phone, X, Shield, Search, Award, BarChart3, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createTeamMember as createMemberApi } from '../lib/backendApi';
import useAuditLog from '../hooks/useAuditLog';
import { useTeam } from '../hooks/useTeam';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { COLLECTIONS } from '../lib/firestore-helpers';
import { getInitials } from '../lib/formatters';
import { SkeletonCards } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';

const ALL_PAGE_KEYS = [
 { key: 'dashboard', label: 'Dashboard' },
 { key: 'projects', label: 'Projects' },
 { key: 'enquiry', label: 'Enquiry' },
 { key: 'followups', label: 'Follow-Ups' },
 { key: 'payments', label: 'Payments' },
 { key: 'outgoing_payments', label: 'Outgoing Payments' },
 { key: 'rgp', label: 'RGP / Challan' },
 { key: 'salary', label: 'Salary' },
 { key: 'tools', label: 'Tools' },
 { key: 'team', label: 'Team' },
 { key: 'settings', label: 'Settings' },
 { key: 'whatsapp', label: 'WhatsApp' },
];

function AddMemberModal({ onClose, onAdd, editing }) {
 const [form, setForm] = useState({
 name: editing?.name || '',
 email: editing?.email || '',
 password: '',
 phone: editing?.phone || '',
 whatsapp: editing?.whatsapp || '',
 designation: editing?.designation || '',
 permissions: editing?.permissions || ['dashboard', 'projects', 'enquiry', 'followups', 'payments'],
 });
 const [saving, setSaving] = useState(false);

 const togglePermission = (key) => {
 const next = form.permissions.includes(key)
 ? form.permissions.filter(k => k !== key)
 : [...form.permissions, key];
 setForm({ ...form, permissions: next });
 };

 const handleSubmit = async () => {
 if (!form.name || !form.email || (!editing && !form.password)) return;
 setSaving(true);
 try {
 await onAdd(form);
 onClose();
 } catch (error) { console.error(error); }
 finally { setSaving(false); }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
 <div className="absolute inset-0 bg-black/40" onClick={onClose} />
 <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-content max-h-[90vh] flex flex-col">
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} Team Member</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 <div><label className="label">Full Name</label>
 <input className="input-field" placeholder="Enter full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
 {!editing && (
 <>
 <div><label className="label">Email</label>
 <input className="input-field" type="email" placeholder="email@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
 <div><label className="label">Password</label>
 <input className="input-field" type="password" placeholder="Set login password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
 </>
 )}
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Phone</label>
 <input className="input-field" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
 <div><label className="label">WhatsApp</label>
 <input className="input-field" placeholder="+91 XXXXX XXXXX" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
 </div>
 <div><label className="label">Designation</label>
 <select className="input-field" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}>
 <option value="">Select role</option>
 <option>Senior Developer</option><option>Frontend Developer</option>
 <option>Backend Developer</option><option>UI/UX Designer</option>
 <option>Project Manager</option><option>QA Engineer</option>
 <option>Business Analyst</option><option>DevOps Engineer</option>
 <option>Field Engineer</option><option>Technician</option>
 </select></div>

 {/* Page Access Permissions */}
 <div>
 <label className="label flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-teal-600" /> Page Access</label>
 <div className="mt-2 border border-[var(--border-primary)] rounded-xl p-3 grid grid-cols-2 gap-2">
 {ALL_PAGE_KEYS.map(({ key, label }) => (
 <label key={key} className="flex items-center gap-2 cursor-pointer group">
 <input type="checkbox" checked={form.permissions.includes(key)} onChange={() => togglePermission(key)}
 className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
 <span className="text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
 </label>
 ))}
 </div>
 <p className="text-xs text-gray-400 mt-1">Select pages this member can access in their PWA</p>
 </div>

 {!editing && (
 <div className="bg-teal-50 border border-teal-200 text-teal-700 text-xs px-3 py-2 rounded-lg">
 The member will be created in Firebase Auth and Firestore together.
 </div>
 )}
 </div>
 <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
 <button onClick={onClose} className="btn-secondary">Cancel</button>
 <button onClick={handleSubmit} disabled={saving} className="btn-primary">
 {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Add'} Member</>}
 </button>
 </div>
 </div>
 </div>
 );
}

export default function TeamPage() {
 const toast = useToast();
 const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
 const { log } = useAuditLog();
 const { members, loading, toggleStatus, updateMember, deleteMember } = useTeam();
 const [showModal, setShowModal] = useState(false);
 const [editingMember, setEditingMember] = useState(null);
 const [filterStatus, setFilterStatus] = useState('All');
 const [showAnalytics, setShowAnalytics] = useState(false);
 const { tasks } = useTasks();

 const teamMembers = members.filter((member) => member.role === 'member');
 
 const performanceData = useMemo(() => {
 const memMap = {};
 teamMembers.forEach(m => memMap[m.name] = { completed: 0, pending: 0 });
 tasks.forEach(t => {
 const name = t.assignedToName;
 if (name && memMap[name]) {
 if (t.status === 'done') memMap[name].completed++;
 else memMap[name].pending++;
 }
 });
 return Object.keys(memMap)
 .map(k => ({ name: k.split(' ')[0], Completed: memMap[k].completed, Pending: memMap[k].pending, total: memMap[k].completed + memMap[k].pending }))
 .filter(d => d.total > 0)
 .sort((a, b) => b.total - a.total)
 .slice(0, 6);
 }, [teamMembers, tasks]);
 const filteredMembers = filterStatus === 'All'
 ? teamMembers
 : teamMembers.filter((member) => member.status === filterStatus.toLowerCase());

 const avatarColors = [
 'bg-blue-500', 'bg-purple-500', 'bg-teal-500', 'bg-pink-500',
 'bg-orange-500', 'bg-green-500', 'bg-indigo-500', 'bg-red-500',
 ];

 const handleDeactivate = async (uid, currentStatus) => {
 try {
 await toggleStatus(uid, currentStatus);
 toast.success(`Member ${currentStatus === 'active' ? 'deactivated' : 'activated'}!`);
 } catch (error) { toast.error(`Failed: ${error.message}`); }
 };

 const handleEditPermissions = (member) => {
 setEditingMember(member);
 setShowModal(true);
 };

 const handleDeleteMember = (uid, name) => {
 confirmDelete({
 title: 'Delete Team Member',
 description: `Delete "${name}" permanently? Their tasks will remain but become unassigned. This cannot be undone.`,
 onConfirm: async () => {
 const taskSnapshot = await getDocs(
 query(collection(db, COLLECTIONS.tasks), where('assignedTo', '==', uid)),
 );
 await Promise.all(taskSnapshot.docs.map((taskDoc) => updateDoc(taskDoc.ref, {
 assignedTo: '',
 assignedToName: '',
 })));
 await deleteMember(uid);
 await log('member_unassigned_from_tasks', { memberUid: uid, reassignedTaskCount: taskSnapshot.docs.length });
 toast.success(`${name} removed from team`);
 },
 });
 };

 const handleAddMember = async (form) => {
 try {
 if (editingMember) {
 // Update existing member
 await updateMember(editingMember.id, {
 name: form.name,
 phone: form.phone,
 whatsapp: form.whatsapp,
 designation: form.designation,
 permissions: form.permissions,
 });
 toast.success(`${form.name} updated!`);
 setEditingMember(null);
 return;
 }

 await createMemberApi(form);
 await log('member_created', {
  memberEmail: form.email,
  memberName: form.name,
  designation: form.designation || '',
  permissions: form.permissions || [],
 });
 toast.success(`${form.name} added! They can now log in to the Team Member PWA.`);
 } catch (error) {
 const message = error.message || error.details || '';
 

 if (message.toLowerCase().includes('already')) {
 toast.error('This email is already registered.');
 } else { toast.error(`Failed: ${message}`); }
 throw error;
 }
 };

 return (
 <div className="space-y-6 page-transition">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{teamMembers.filter(m => m.status === 'active').length} active members</p>
 </div>
 <button onClick={() => { setEditingMember(null); setShowModal(true); }} className="btn-primary"><Plus className="w-4 h-4" /> Add Member</button>
 </div>

 <div className="flex items-center justify-between">
 <div className="flex gap-4">
 <div className="card flex items-center gap-3 py-3">
 <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-teal-600" /></div>
 <div><p className="text-xs text-gray-400">Total</p><p className="text-xl font-bold text-gray-900">{teamMembers.length}</p></div>
 </div>
 <div className="card flex items-center gap-3 py-3">
 <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><div className="w-3 h-3 bg-green-500 rounded-full" /></div>
 <div><p className="text-xs text-gray-400">Active</p><p className="text-xl font-bold text-gray-900">{teamMembers.filter(m => m.status === 'active').length}</p></div>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <button onClick={() => setShowAnalytics(!showAnalytics)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showAnalytics ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
 <BarChart3 className="w-4 h-4" /> Performance
 </button>
 <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
 {['All', 'Active', 'Inactive'].map((status) => (
 <button key={status} onClick={() => setFilterStatus(status)}
 className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${filterStatus === status ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
 {status}</button>
 ))}
 </div>
 </div>
 </div>

 {showAnalytics && performanceData.length > 0 && (
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Performance (Top Members)</h3>
 <ResponsiveContainer width="100%" height={240}>
 <BarChart data={performanceData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
 <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
 <Legend iconType="circle" cursor="pointer" wrapperStyle={{ fontSize: '12px' }} />
 <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
 <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}

 {loading ? (
 <SkeletonCards count={4} />
 ) : filteredMembers.length === 0 ? (
 <EmptyState icon="noData" title="No team members added yet" description="Add members from Team page." actionLabel="Add Member" onAction={() => { setEditingMember(null); setShowModal(true); }} />
 ) : (
 <div className="grid grid-cols-4 gap-5">
 {filteredMembers.map((member, index) => (
 <div key={member.id} className={`card stat-card group transition-all duration-200 hover:shadow-md stagger-item ${member.status === 'inactive' ? 'opacity-60' : ''}`}>
 <div className="flex items-start justify-between mb-4">
 <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg ${avatarColors[index % avatarColors.length]}`}>
 {getInitials(member.name)}
 </div>
 <span className={`badge ${member.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{member.status}</span>
 </div>
 <h3 className="font-semibold text-gray-900">{member.name}</h3>
 <p className="text-xs text-teal-600 font-medium mt-0.5">{member.designation || member.role}</p>
 <div className="mt-3 space-y-1.5">
 <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="w-3.5 h-3.5 text-gray-300" /><span className="truncate">{member.email}</span></div>
 <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="w-3.5 h-3.5 text-gray-300" /><span>{member.phone || '-'}</span></div>
 </div>
 {/* Permissions indicator */}
 <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
 <Shield className="w-3 h-3" />{(member.permissions || []).length} pages access
 </div>
 <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
 <button onClick={() => handleEditPermissions(member)}
 className="flex-1 text-xs font-medium py-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors">Edit Access</button>
 <button onClick={() => handleDeactivate(member.id, member.status)}
 className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${member.status === 'active' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
 {member.status === 'active' ? 'Deactivate' : 'Activate'}
 </button>
 </div>
 <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <DeleteButton onClick={() => handleDeleteMember(member.id, member.name)} />
 </div>
 </div>
 ))}
 </div>
 )}

 {showModal && <AddMemberModal onClose={() => { setShowModal(false); setEditingMember(null); }} onAdd={handleAddMember} editing={editingMember} />}
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

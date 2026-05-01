import { useState, useMemo } from 'react';
import {
 Plus, X, Search, Package, Clock, AlertTriangle,
 FileText, BarChart3, Building2, CheckCircle2, Image as ImageIcon
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useRgpChallans } from '../hooks/useRgpChallans';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatDate, formatCurrency } from '../lib/formatters';
import { notifyRgpAssigned } from '../lib/notify';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import ExportButton from '../components/ui/ExportButton';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import BulkDeleteBar from '../components/BulkDeleteBar';
import { compressImage, uploadToImgbb } from '../lib/imageUtils';

const RGP_TYPES = ['RGP', 'Challan'];
const RGP_STATUSES = ['open', 'in_transit', 'delivered', 'returned', 'closed'];
const DOC_STEPS = ['Sent', 'Acknowledged', 'Return Initiated', 'Closed'];

function RgpModal({ onClose, onSubmit, members, editing }) {
 const [form, setForm] = useState({
 type: editing?.type || 'RGP',
 companyName: editing?.companyName || '',
 challanNumber: editing?.challanNumber || '',
 description: editing?.description || '',
 quantity: editing?.quantity || '',
 value: editing?.value || '',
 status: editing?.status || 'open',
 sentDate: editing?.sentDate
 ? (typeof editing.sentDate.toDate === 'function' ? editing.sentDate.toDate().toISOString().split('T')[0] : new Date(editing.sentDate).toISOString().split('T')[0])
 : new Date().toISOString().split('T')[0],
 expectedReturnDate: editing?.expectedReturnDate
 ? (typeof editing.expectedReturnDate.toDate === 'function' ? editing.expectedReturnDate.toDate().toISOString().split('T')[0] : new Date(editing.expectedReturnDate).toISOString().split('T')[0])
 : '',
 assignedTo: editing?.assignedTo || '',
 assignedToName: editing?.assignedToName || '',
 docStep: editing?.docStep || 0,
 remarks: editing?.remarks || '',
 challanImageUrl: editing?.challanImageUrl || '',
 });
 const [saving, setSaving] = useState(false);
 const [uploadingImage, setUploadingImage] = useState(false);

 const handleImageUpload = async (e) => {
   const file = e.target.files?.[0];
   if (!file) return;
   setUploadingImage(true);
   try {
     const compressed = await compressImage(file);
     const url = await uploadToImgbb(compressed);
     setForm({ ...form, challanImageUrl: url });
   } catch (err) {
     console.error(err);
     alert('Failed to upload image');
   } finally {
     setUploadingImage(false);
     e.target.value = '';
   }
 };

 const handleSubmit = async () => {
 if (!form.companyName) return;
 setSaving(true);
 try {
 await onSubmit({
 type: form.type,
 companyName: form.companyName,
 challanNumber: form.challanNumber,
 description: form.description,
 quantity: Number(form.quantity) || 0,
 value: Number(form.value) || 0,
 status: form.status,
 sentDate: form.sentDate ? Timestamp.fromDate(new Date(form.sentDate)) : null,
 expectedReturnDate: form.expectedReturnDate ? Timestamp.fromDate(new Date(form.expectedReturnDate)) : null,
 assignedTo: form.assignedTo,
 assignedToName: form.assignedToName,
 docStep: form.docStep,
 remarks: form.remarks,
 challanImageUrl: form.challanImageUrl,
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
 <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit' : 'Add'} RGP/Challan</h2>
 <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
 </div>
 <div className="px-6 py-5 space-y-4 overflow-y-auto">
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Type</label>
 <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
 {RGP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select></div>
 <div><label className="label">Company *</label><input className="input-field" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Challan No.</label><input className="input-field" value={form.challanNumber} onChange={e => setForm({...form, challanNumber: e.target.value})} /></div>
 <div><label className="label">Status</label>
 <select className="input-field" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
 {RGP_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
 </select></div>
 </div>
 <div><label className="label">Description</label><textarea className="input-field resize-none" rows={3} placeholder="What needs to be done, purpose of RGP/Challan..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Quantity</label><input className="input-field" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
 <div><label className="label">Value (Rs)</label><input className="input-field" type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div><label className="label">Sent Date</label><input className="input-field" type="date" value={form.sentDate} onChange={e => setForm({...form, sentDate: e.target.value})} /></div>
 <div><label className="label">Expected Return</label><input className="input-field" type="date" value={form.expectedReturnDate} onChange={e => setForm({...form, expectedReturnDate: e.target.value})} /></div>
 </div>
 {editing && (
 <div>
 <label className="label">Document Stage</label>
 <div className="flex gap-1.5 mt-1">
 {DOC_STEPS.map((step, i) => (
 <button key={step} onClick={() => setForm({...form, docStep: i})}
 className={`flex-1 py-2 px-2 rounded-lg text-[10px] font-medium border transition-all text-center ${
 form.docStep >= i ? 'bg-teal-50 border-teal-200 text-teal-700' : 'border-gray-200 text-gray-400'
 }`}>
 {step}
 </button>
 ))}
 </div>
 </div>
 )}
 <div><label className="label">Assign To</label>
 <select className="input-field" value={form.assignedTo}
 onChange={e => { const m = members.find(m => m.id === e.target.value); setForm({...form, assignedTo: e.target.value, assignedToName: m?.name || ''}); }}>
 <option value="">Select</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
 </select></div>
 <div><label className="label">Remarks</label><input className="input-field" type="text" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></div>
 <div>
   <label className="label">Attachment / Photo</label>
   <div className="flex items-center gap-3 mt-1">
     {form.challanImageUrl && (
       <a href={form.challanImageUrl} target="_blank" rel="noreferrer" className="block relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
         <img src={form.challanImageUrl} alt="Attachment" className="w-full h-full object-cover" />
       </a>
     )}
     <label className="cursor-pointer text-sm font-medium text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 transition-colors">
       {uploadingImage ? 'Uploading...' : 'Upload Image'}
       <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
     </label>
     {form.challanImageUrl && (
       <button onClick={() => setForm({...form, challanImageUrl: ''})} className="text-xs text-red-500 hover:underline">Remove</button>
     )}
   </div>
 </div>
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

export default function RgpChallanPage() {
 const toast = useToast();
 const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
 const { rgpChallans, loading, addRgpChallan, updateRgpChallan, deleteRgpChallan } = useRgpChallans();
 const { members } = useTeam();
 const [showModal, setShowModal] = useState(false);
 const [editing, setEditing] = useState(null);
 const [search, setSearch] = useState('');
 const [filterStatus, setFilterStatus] = useState('All');
 const [filterType, setFilterType] = useState('All');
 const [showCharts, setShowCharts] = useState(false);
 const [selectedRgpIds, setSelectedRgpIds] = useState([]);

 const activeMembers = members.filter(m => m.role === 'member' && m.status === 'active');

 const filtered = useMemo(() => {
 return rgpChallans.filter(r => {
 const matchSearch = search === '' || (r.companyName || '').toLowerCase().includes(search.toLowerCase()) || (r.challanNumber || '').toLowerCase().includes(search.toLowerCase());
 const matchStatus = filterStatus === 'All' || r.status === filterStatus;
 const matchType = filterType === 'All' || r.type === filterType;
 return matchSearch && matchStatus && matchType;
 });
 }, [rgpChallans, search, filterStatus, filterType]);

 const selectedRgpSet = useMemo(() => new Set(selectedRgpIds), [selectedRgpIds]);
 const visibleRgpIds = useMemo(() => filtered.map((record) => record.id), [filtered]);
 const allVisibleSelected = visibleRgpIds.length > 0
 && visibleRgpIds.every((recordId) => selectedRgpSet.has(recordId));

 const toggleRgpSelection = (recordId) => {
 setSelectedRgpIds((prev) => (
 prev.includes(recordId)
 ? prev.filter((id) => id !== recordId)
 : [...prev, recordId]
 ));
 };

 const toggleAllVisibleRgp = () => {
 setSelectedRgpIds((prev) => {
 if (allVisibleSelected) {
 return prev.filter((recordId) => !visibleRgpIds.includes(recordId));
 }

 return Array.from(new Set([...prev, ...visibleRgpIds]));
 });
 };

 const openCount = rgpChallans.filter(r => r.status === 'open' || r.status === 'in_transit').length;
 const totalValue = rgpChallans.reduce((s, r) => s + Number(r.value || 0), 0);
 const rgpCount = rgpChallans.filter(r => r.type === 'RGP').length;
 const challanCount = rgpChallans.filter(r => r.type === 'Challan').length;

 const agingData = useMemo(() => {
 return filtered.filter(r => r.status !== 'closed' && r.status !== 'returned').map(r => {
 const sent = r.sentDate?.toDate ? r.sentDate.toDate() : new Date(r.sentDate);
 const days = sent ? Math.max(0, Math.floor((new Date() - sent) / (1000 * 60 * 60 * 24))) : 0;
 return { ...r, agingDays: days };
 }).sort((a, b) => b.agingDays - a.agingDays);
 }, [filtered]);

 // Company-wise summary
 const companySummary = useMemo(() => {
 const map = {};
 rgpChallans.forEach(r => {
 const company = r.companyName || 'Unknown';
 if (!map[company]) map[company] = { name: company, rgp: 0, challan: 0, value: 0, open: 0 };
 if (r.type === 'RGP') map[company].rgp++;
 else map[company].challan++;
 map[company].value += Number(r.value || 0);
 if (r.status !== 'closed' && r.status !== 'returned') map[company].open++;
 });
 return Object.values(map).sort((a, b) => b.value - a.value);
 }, [rgpChallans]);

 const handleAdd = async (data) => {
  try {
   await addRgpChallan(data);
   
   if (data.assignedTo) {
     const member = members.find(m => m.id === data.assignedTo);
     if (member?.whatsapp) {
       try {
         await notifyRgpAssigned(member, data);
       } catch (e) {
         console.error('Notify error:', e);
       }
     }
   }
   
   toast.success('Record added!');
  } catch (err) {
   toast.error('Failed: ' + err.message);
   throw err;
  }
 };
 const handleEdit = async (data) => {
 try { await updateRgpChallan(editing.id, data); toast.success('Updated!'); }
 catch (err) { toast.error('Failed: ' + err.message); throw err; }
 };

 const deleteRgp = (id, docNumber) => {
 confirmDelete({
 title: 'Delete RGP/Challan',
 description: `Delete document #${docNumber || id}?`,
 onConfirm: async () => {
 await deleteRgpChallan(id);
 setSelectedRgpIds((prev) => prev.filter((recordId) => recordId !== id));
 toast.success('Entry deleted');
 },
 });
 };

 const bulkDeleteRgp = () => {
 const idsToDelete = selectedRgpIds.filter((id) => rgpChallans.some((record) => record.id === id));
 if (idsToDelete.length === 0) return;

 confirmDelete({
 title: `Delete ${idsToDelete.length} Items`,
 description: `Permanently delete ${idsToDelete.length} selected RGP/Challan records? This cannot be undone.`,
 onConfirm: async () => {
 await Promise.all(idsToDelete.map((id) => deleteRgpChallan(id)));
 setSelectedRgpIds([]);
 toast.success(`${idsToDelete.length} items deleted`);
 },
 });
 };

 const statusColors = { open: 'badge-blue', in_transit: 'badge-yellow', delivered: 'badge-teal', returned: 'badge-green', closed: 'badge-gray' };

 return (
 <div className="space-y-6 page-transition">
 <div className="flex items-center justify-between">
 <div><h1 className="text-2xl font-bold text-gray-900">RGP & Challan</h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{rgpChallans.length} records | {openCount} open</p></div>
 <div className="flex items-center gap-3">
 <button onClick={() => setShowCharts(!showCharts)}
 className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showCharts ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'}`}>
 <BarChart3 className="w-3.5 h-3.5" /> Analytics
 </button>
 <ExportButton
 data={filtered}
 columns={[
 { key: 'type', label: 'Type' },
 { key: 'companyName', label: 'Company' },
 { key: 'challanNumber', label: 'Challan No.' },
 { key: 'description', label: 'Description' },
 { key: 'quantity', label: 'Qty' },
 { key: 'value', label: 'Value' },
 { key: 'status', label: 'Status' },
 ]}
 filename="rgp_challan"
 />
 <button onClick={() => { setEditing(null); setShowModal(true); }} className="btn-primary"><Plus className="w-4 h-4" /> Add Record</button>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 {[
 { label: 'Total Records', value: rgpChallans.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
 { label: 'Open/In Transit', value: openCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
 { label: 'Total Value', value: formatCurrency(totalValue), icon: Package, color: 'bg-teal-50 text-teal-600' },
 { label: 'RGP / Challan', value: `${rgpCount} / ${challanCount}`, icon: Building2, color: 'bg-purple-50 text-purple-600' },
 ].map((s, i) => {
 const Icon = s.icon;
 return (
 <div key={i} className="card stat-card flex items-center gap-3 py-3 stagger-item">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color.split(' ')[0]}`}><Icon className={`w-5 h-5 ${s.color.split(' ')[1]}`} /></div>
 <div><p className="text-[10px] text-gray-400 uppercase font-medium">{s.label}</p><p className="text-lg font-bold text-gray-900">{s.value}</p></div>
 </div>
 );
 })}
 </div>

 {showCharts && (
 <div className="grid grid-cols-2 gap-5">
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Company-wise Summary</h3>
 <ResponsiveContainer width="100%" height={200}>
 <BarChart data={companySummary.slice(0, 8)} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
 <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
 <Tooltip contentStyle={{ borderRadius: 12 }} />
 <Bar dataKey="rgp" stackId="a" fill="#3b82f6" name="RGP" />
 <Bar dataKey="challan" stackId="a" fill="#f59e0b" name="Challan" radius={[0, 4, 4, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 <div className="card">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Aging Tracker (Open Items)</h3>
 <div className="space-y-2 max-h-[200px] overflow-y-auto">
 {agingData.slice(0, 10).map(r => (
 <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-700 truncate">{r.companyName} - {r.challanNumber || r.type}</p>
 <p className="text-[10px] text-gray-400">{r.description || 'No description'}</p>
 </div>
 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
 r.agingDays > 30 ? 'bg-red-100 text-red-600' : r.agingDays > 15 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
 }`}>{r.agingDays}d</span>
 </div>
 ))}
 {agingData.length === 0 && <p className="text-center text-gray-300 text-sm py-4">All items returned/closed!</p>}
 </div>
 </div>
 </div>
 )}

 <div className="card py-3 px-4">
 <div className="flex items-center gap-3">
 <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" placeholder="Search company, challan..." className="input-field pl-9 w-full" value={search} onChange={e => setSearch(e.target.value)} /></div>
 <select className="input-field w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
 <option value="All">All Types</option>{RGP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
 </select>
 <select className="input-field w-32" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
 <option value="All">All Status</option>
 {RGP_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
 </select>
 <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
 </div>
 </div>

 <BulkDeleteBar
 selectedCount={selectedRgpIds.length}
 onDelete={bulkDeleteRgp}
 onClear={() => setSelectedRgpIds([])}
 />

 {loading ? <SkeletonTable rows={5} cols={8} /> : filtered.length === 0 ? (
 <EmptyState icon="noData" title="No RGP/Challan entries found" actionLabel="Add Record" onAction={() => { setEditing(null); setShowModal(true); }} />
 ) : (
 <div className="card p-0 overflow-hidden">
 <table className="w-full" data-export-table>
 <thead><tr className="bg-gray-50">
 <th className="table-header w-10">
 <input
 type="checkbox"
 checked={allVisibleSelected}
 onChange={toggleAllVisibleRgp}
 className="rounded accent-teal-600"
 title="Select all records"
 />
 </th>
 <th className="table-header">Type</th><th className="table-header">Company</th><th className="table-header">Challan No.</th>
 <th className="table-header">Description</th><th className="table-header">Sent Date</th>
 <th className="table-header">Doc Stage</th><th className="table-header">Status</th><th className="table-header">Actions</th>
 </tr></thead>
 <tbody>
 {filtered.map(r => {
 const sent = r.sentDate?.toDate ? r.sentDate.toDate() : new Date(r.sentDate);
 const aging = sent && !isNaN(sent.getTime()) ? Math.max(0, Math.floor((new Date() - sent) / (1000 * 60 * 60 * 24))) : 0;
 return (
 <tr key={r.id} className="group hover:bg-gray-50 transition-colors">
 <td className="table-cell">
 <input
 type="checkbox"
 checked={selectedRgpSet.has(r.id)}
 onChange={() => toggleRgpSelection(r.id)}
 className="rounded accent-teal-600"
 title="Select record"
 />
 </td>
 <td className="table-cell"><span className={`badge ${r.type === 'RGP' ? 'badge-blue' : 'badge-yellow'}`}>{r.type}</span></td>
 <td className="table-cell font-medium text-gray-900">{r.companyName}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">
   <div className="flex items-center gap-2">
     {r.challanNumber || '-'}
     {r.challanImageUrl && (
       <a href={r.challanImageUrl} target="_blank" rel="noreferrer" title="View Attachment" className="text-teal-500 hover:text-teal-700 bg-teal-50 p-1 rounded">
         <ImageIcon className="w-3.5 h-3.5" />
       </a>
     )}
   </div>
 </td>
 <td className="table-cell text-[var(--text-muted)] text-xs max-w-[200px] truncate">{r.description || '-'}</td>
 <td className="table-cell text-[var(--text-muted)] text-xs">
 {formatDate(r.sentDate)}
 {aging > 0 && r.status !== 'closed' && r.status !== 'returned' && (
 <span className={`ml-1 text-[10px] font-medium ${aging > 30 ? 'text-red-400' : aging > 15 ? 'text-amber-400' : 'text-green-400'}`}>({aging}d)</span>
 )}
 </td>
 <td className="table-cell">
 <div className="flex gap-0.5">
 {DOC_STEPS.map((_, i) => (
 <div key={i} className={`w-4 h-1.5 rounded-full ${(r.docStep || 0) >= i ? 'bg-teal-500' : 'bg-gray-200'}`} />
 ))}
 </div>
 </td>
 <td className="table-cell"><span className={`badge ${statusColors[r.status] || 'badge-gray'}`}>{(r.status || '').replace('_', ' ')}</span></td>
 <td className="table-cell">
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => { setEditing(r); setShowModal(true); }} className="text-xs text-teal-600 hover:bg-teal-50 px-2 py-1 rounded font-medium">Edit</button>
 <DeleteButton onClick={() => deleteRgp(r.id, r.challanNumber || r.type)} />
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}

 {showModal && <RgpModal onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={editing ? handleEdit : handleAdd} members={activeMembers} editing={editing} />}
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


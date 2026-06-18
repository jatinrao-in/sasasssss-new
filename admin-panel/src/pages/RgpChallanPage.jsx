import { useState, useMemo, useCallback } from 'react';
import {
  Plus, X, Search, Package, Clock, AlertTriangle,
  FileText, BarChart3, Building2, CheckCircle2, Eye, Download
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useRgpChallans } from '../hooks/useRgpChallans';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { formatCurrency } from '../lib/formatters';
import { notifyRgpAssigned } from '../lib/notify';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import ExportButton from '../components/ui/ExportButton';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import BulkDeleteBar from '../components/BulkDeleteBar';
import { compressImage, uploadToImgbb } from '../lib/imageUtils';

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
    challanImageUrls: editing?.challanImageUrls || [],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const uploadedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file);
        const url = await uploadToImgbb(compressed);
        if (url) {
          const sizeMB = (compressed.size / (1024 * 1024)).toFixed(2);
          uploadedFiles.push({ url, size: sizeMB + ' MB', name: file.name });
        }
      }
      const existingUrls = form.challanImageUrls || (form.challanImageUrl ? [{ url: form.challanImageUrl, size: 'Unknown', name: 'Attachment' }] : []);
      const newUrls = [...existingUrls, ...uploadedFiles];
      setForm({ ...form, challanImageUrls: newUrls, challanImageUrl: newUrls[0]?.url || newUrls[0] || '' });
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
        challanImageUrls: form.challanImageUrls || (form.challanImageUrl ? [form.challanImageUrl] : []),
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
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-[-0.01em]">
              {editing ? 'Edit RGP/Challan' : 'Add RGP/Challan'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="px-6 py-5 space-y-4 font-sans text-xs sm:text-[13px] font-medium text-slate-750 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Type *</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
              >
                {RGP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Company *</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.companyName}
                onChange={e => setForm({...form, companyName: e.target.value})}
                placeholder="e.g. Acme Corp"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Challan No.</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.challanNumber}
                onChange={e => setForm({...form, challanNumber: e.target.value})}
                placeholder="e.g. CH-2026-001"
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Status</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value})}
              >
                {RGP_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#64748B] mb-1.5 font-sans">Description</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A] resize-none font-sans"
              rows={2}
              placeholder="What needs to be done, purpose of RGP/Challan..."
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Quantity</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="number"
                value={form.quantity}
                onChange={e => setForm({...form, quantity: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Value (Rs)</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="number"
                value={form.value}
                onChange={e => setForm({...form, value: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Sent Date</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="date"
                value={form.sentDate}
                onChange={e => setForm({...form, sentDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Expected Return</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="date"
                value={form.expectedReturnDate}
                onChange={e => setForm({...form, expectedReturnDate: e.target.value})}
              />
            </div>
          </div>

          {editing && (
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Document Stage</label>
              <div className="flex gap-2 mt-1">
                {DOC_STEPS.map((step, i) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setForm({...form, docStep: i})}
                    className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold border transition-all text-center ${
                      form.docStep >= i 
                        ? 'bg-teal-50 border-teal-200 text-teal-700 font-semibold' 
                        : 'bg-white border-slate-200 text-slate-405 hover:bg-slate-50'
                    }`}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Assign To</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.assignedTo}
                onChange={e => { 
                  const m = members.find(m => m.id === e.target.value); 
                  setForm({...form, assignedTo: e.target.value, assignedToName: m?.name || ''}); 
                }}
              >
                <option value="">Select member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Remarks</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-655 focus:ring-1 focus:ring-teal-655 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="text"
                value={form.remarks}
                onChange={e => setForm({...form, remarks: e.target.value})}
                placeholder="Add notes..."
              />
            </div>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-[#64748B]">Attachments / Photos</span>
              <label className="cursor-pointer text-[11px] font-semibold text-teal-650 hover:text-teal-700 bg-teal-50 hover:bg-teal-100/70 px-2.5 py-1.5 rounded-lg border border-teal-100 transition-colors">
                {uploadingImage ? 'Uploading...' : 'Upload Images'}
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
              </label>
            </div>
            
            <div className="flex flex-col gap-2">
              {(form.challanImageUrls || (form.challanImageUrl ? [{ url: form.challanImageUrl, size: 'Unknown', name: 'Attachment' }] : [])).filter(Boolean).map((img, i) => {
                 const imgObj = typeof img === 'string' ? { url: img, size: 'Unknown', name: `Attachment ${i + 1}` } : img;
                 return (
                   <div key={i} className="flex items-center gap-3 p-2.5 border border-slate-100 rounded-lg bg-white shadow-sm">
                     <div className="w-10 h-10 rounded overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                       <img src={imgObj.url} alt={imgObj.name} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 flex gap-2 items-center min-w-0">
                       <div className="min-w-0 flex-1">
                         <p className="text-xs font-semibold text-[#0F172A] truncate">{imgObj.name}</p>
                         <p className="text-[10px] text-slate-400 font-medium mt-0.5">{imgObj.size}</p>
                       </div>
                       <div className="flex gap-1.5 shrink-0">
                         <a href={imgObj.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg hover:bg-teal-100 transition-colors">
                           <Eye className="w-3.5 h-3.5" /> View
                         </a>
                         <button type="button" onClick={() => {
                           const toastId = Math.random().toString();
                           const event = new CustomEvent('toast', { detail: { id: toastId, type: 'info', message: 'Download started...' } });
                           window.dispatchEvent(event);
                           fetch(imgObj.url).then(res => res.blob()).then(blob => {
                             const a = document.createElement('a');
                             a.href = URL.createObjectURL(blob);
                             a.download = imgObj.name || `Challan_Image_${i + 1}.jpg`;
                             a.click();
                             window.dispatchEvent(new CustomEvent('toast', { detail: { id: toastId, type: 'success', message: 'Download complete!' } }));
                           }).catch(() => {
                             window.open(imgObj.url, '_blank');
                           });
                         }} className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors">
                           <Download className="w-3.5 h-3.5" /> Save
                         </button>
                       </div>
                     </div>
                     <button type="button" onClick={() => {
                       const newUrls = (form.challanImageUrls || (form.challanImageUrl ? [form.challanImageUrl] : [])).filter((_, idx) => idx !== i);
                       setForm({ ...form, challanImageUrls: newUrls, challanImageUrl: newUrls[0]?.url || newUrls[0] || '' });
                     }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100">
                       <X className="w-4 h-4" />
                     </button>
                   </div>
                 );
              })}
              {!(form.challanImageUrls || []).length && !form.challanImageUrl && (
                <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-semibold">
                  No images attached.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-teal-650 hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
          >
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
      const matchSearch = search === '' || 
        (r.companyName || '').toLowerCase().includes(search.toLowerCase()) || 
        (r.challanNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.assignedToName || '').toLowerCase().includes(search.toLowerCase());
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
    try { 
      await updateRgpChallan(editing.id, data); 
      toast.success('Updated!'); 
    } catch (err) { 
      toast.error('Failed: ' + err.message); 
      throw err; 
    }
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

  const bulkDeleteRgp = useCallback(() => {
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
  }, [selectedRgpIds, rgpChallans, confirmDelete, deleteRgpChallan, toast]);

  const statusColors = { open: 'badge-blue', in_transit: 'badge-yellow', delivered: 'badge-teal', returned: 'badge-green', closed: 'badge-gray' };

  return (
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F172A] tracking-[-0.02em] leading-tight">RGP &amp; Challan</h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1 font-medium">
            {rgpChallans.length} records | {openCount} open
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            type="button"
            onClick={() => setShowCharts(!showCharts)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              showCharts 
                ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm' 
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
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
          <button 
            type="button"
            onClick={() => { setEditing(null); setShowModal(true); }} 
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      </div>

      {/* Row 1: KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: rgpChallans.length, icon: FileText, iconBg: 'bg-blue-50/70', iconColor: 'text-blue-600', border: 'border-l-blue-400' },
          { label: 'Open/In Transit', value: openCount, icon: Clock, iconBg: 'bg-amber-50/70', iconColor: 'text-amber-600', border: 'border-l-amber-400' },
          { label: 'Total Value', value: formatCurrency(totalValue), icon: Package, iconBg: 'bg-teal-50/70', iconColor: 'text-teal-600', border: 'border-l-teal-400' },
          { label: 'RGP / Challan', value: `${rgpCount} / ${challanCount}`, icon: Building2, iconBg: 'bg-purple-50/70', iconColor: 'text-purple-600', border: 'border-l-purple-400' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm flex items-center gap-3 border-l-4 ${s.border}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.iconBg}`}>
                <Icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[12px] font-semibold text-[#64748B] uppercase tracking-[0.08em] truncate">{s.label}</p>
                <p className="text-xl sm:text-[22px] font-bold text-[#0F172A] mt-0.5 [font-variant-numeric:tabular-nums]">
                  <CountUpNumber end={s.value} />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Analytics Panels */}
      {showCharts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 border border-slate-100 rounded-[16px] bg-slate-50/20">
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm">
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Company-wise Summary</span>
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companySummary.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="rgp" stackId="a" fill="#3b82f6" name="RGP" />
                  <Bar dataKey="challan" stackId="a" fill="#f59e0b" name="Challan" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm">
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Aging Tracker (Open Items)</span>
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {agingData.slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0F172A] truncate">{r.companyName} - {r.challanNumber || r.type}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{r.description || 'No description'}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.agingDays > 30 
                      ? 'bg-red-50 text-red-655 border border-red-100' 
                      : r.agingDays > 15 
                      ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                      : 'bg-green-50 text-green-600 border border-green-100'
                  }`}>{r.agingDays}d</span>
                </div>
              ))}
              {agingData.length === 0 && <p className="text-center text-slate-400 text-xs py-8 font-medium">All items returned/closed!</p>}
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Toolbar / Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] shadow-sm overflow-hidden z-20">
        <div className="flex flex-col sm:flex-row sm:items-center px-5 py-3 gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search company, challan..." 
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-650 text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <select 
              className="h-9 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-655 focus:ring-1 focus:ring-teal-655 text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50 cursor-pointer" 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              {RGP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select 
              className="h-9 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-655 focus:ring-1 focus:ring-teal-655 text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50 cursor-pointer" 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              {RGP_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <span className="text-xs font-semibold text-[#64748B] sm:ml-auto whitespace-nowrap">{filtered.length} results</span>
        </div>
      </div>

      <BulkDeleteBar
        selectedCount={selectedRgpIds.length}
        onDelete={bulkDeleteRgp}
        onClear={() => setSelectedRgpIds([])}
      />

      {/* Directory Table Workspace */}
      {loading ? (
        <SkeletonTable rows={5} cols={10} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="noData" title="No RGP/Challan entries found" actionLabel="Add Record" onAction={() => { setEditing(null); setShowModal(true); }} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left font-sans" data-export-table>
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisibleRgp}
                        className="rounded accent-teal-600 cursor-pointer"
                        title="Select all records"
                      />
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned Date</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Challan No.</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Attachments</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sent Date</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Doc Stage</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map(r => {
                    const sent = r.sentDate?.toDate ? r.sentDate.toDate() : new Date(r.sentDate);
                    const aging = sent && !isNaN(sent.getTime()) ? Math.max(0, Math.floor((new Date() - sent) / (1000 * 60 * 60 * 24))) : 0;
                    return (
                      <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors border-b border-[#E2E8F0] last:border-0">
                        <td className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRgpSet.has(r.id)}
                            onChange={() => toggleRgpSelection(r.id)}
                            className="rounded accent-teal-600 cursor-pointer"
                            title="Select record"
                          />
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`badge ${r.type === 'RGP' ? 'badge-blue' : 'badge-yellow'}`}>{r.type}</span>
                        </td>
                        <td className="p-4 text-xs font-semibold text-[#0F172A]">{r.companyName}</td>
                        <td className="p-4 text-xs font-medium text-slate-500">{formatDate(r.assignedDate || r.createdAt)}</td>
                        <td className="p-4 text-xs font-medium text-[#64748B]">{r.challanNumber || '-'}</td>
                        <td className="p-4 text-xs font-medium text-slate-500 max-w-[200px] truncate" title={r.description || ''}>{r.description || '-'}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2 min-w-[150px]">
                            {(r.challanImageUrls || (r.challanImageUrl ? [{ url: r.challanImageUrl, size: 'Unknown', name: 'Attachment' }] : [])).filter(Boolean).map((img, i) => {
                              const imgObj = typeof img === 'string' ? { url: img, size: 'Unknown', name: `Attachment ${i + 1}` } : img;
                              return (
                                <div key={i} className="flex flex-col gap-1 p-1.5 border border-slate-100 rounded bg-slate-50/50">
                                  <div className="flex items-center gap-1.5">
                                    <img src={imgObj.url} alt={imgObj.name} className="w-8 h-8 object-cover rounded border border-slate-200 shadow-sm" />
                                    <div className="flex flex-col">
                                      <span className="text-[9px] font-semibold text-slate-700 truncate w-16" title={imgObj.name}>{imgObj.name}</span>
                                      <span className="text-[8px] font-medium text-slate-400">{imgObj.size}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 mt-0.5">
                                    <a href={imgObj.url} target="_blank" rel="noreferrer" className="flex-1 text-center py-0.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded text-[9px] font-semibold transition-colors border border-teal-100">View</a>
                                    <button type="button" onClick={() => {
                                      const toastId = Math.random().toString();
                                      const event = new CustomEvent('toast', { detail: { id: toastId, type: 'info', message: 'Download started...' } });
                                      window.dispatchEvent(event);
                                      fetch(imgObj.url).then(res => res.blob()).then(blob => {
                                        const a = document.createElement('a');
                                        a.href = URL.createObjectURL(blob);
                                        a.download = imgObj.name || `Challan_Image_${i + 1}.jpg`;
                                        a.click();
                                        window.dispatchEvent(new CustomEvent('toast', { detail: { id: toastId, type: 'success', message: 'Download complete!' } }));
                                      }).catch(() => {
                                        window.open(imgObj.url, '_blank');
                                      });
                                    }} className="flex-1 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[9px] font-semibold transition-colors border border-blue-100">
                                      Save
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {/* Member remark image */}
                            {r.imageUrl && (
                              <div className="flex flex-col gap-1 p-1.5 border border-purple-100 rounded bg-purple-50/50">
                                <div className="flex items-center gap-1.5">
                                  <img src={r.imageUrl} alt="Member Remark" className="w-8 h-8 object-cover rounded border border-purple-200 shadow-sm" />
                                  <span className="text-[9px] font-semibold text-purple-750 truncate w-16">Member Remark</span>
                                </div>
                                <a href={r.imageUrl} target="_blank" rel="noreferrer"
                                  className="text-center py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[9px] font-semibold transition-colors border border-purple-100">
                                  View
                                </a>
                              </div>
                            )}
                            {!(r.challanImageUrls?.length > 0 || r.challanImageUrl || r.imageUrl) && (
                              <span className="text-xs text-slate-405 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-500">
                          {formatDate(r.sentDate)}
                          {aging > 0 && r.status !== 'closed' && r.status !== 'returned' && (
                            <span className={`ml-1 text-[10px] font-bold ${aging > 30 ? 'text-red-500' : aging > 15 ? 'text-amber-500' : 'text-green-500'}`}>({aging}d)</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-0.5">
                            {DOC_STEPS.map((_, i) => (
                              <div key={i} className={`w-3.5 h-1.5 rounded-full ${(r.docStep || 0) >= i ? 'bg-teal-500' : 'bg-slate-200'}`} />
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`badge ${statusColors[r.status] || 'badge-gray'}`}>{(r.status || '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditing(r); setShowModal(true); }} className="text-xs text-teal-655 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg font-semibold transition-colors">Edit</button>
                            <DeleteButton onClick={() => deleteRgp(r.id, r.challanNumber || r.type)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filtered.map(r => {
              const sent = r.sentDate?.toDate ? r.sentDate.toDate() : new Date(r.sentDate);
              const aging = sent && !isNaN(sent.getTime()) ? Math.max(0, Math.floor((new Date() - sent) / (1000 * 60 * 60 * 24))) : 0;
              return (
                <div key={r.id} className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedRgpSet.has(r.id)}
                        onChange={() => toggleRgpSelection(r.id)}
                        className="rounded accent-teal-600 cursor-pointer"
                        title="Select record"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{r.companyName}</h4>
                        <p className="text-xs text-slate-400">Challan: {r.challanNumber || '-'}</p>
                      </div>
                    </div>
                    <span className={`badge ${r.type === 'RGP' ? 'badge-blue' : 'badge-yellow'}`}>{r.type}</span>
                  </div>

                  <div className="text-xs text-slate-650 bg-slate-50 p-2.5 border border-slate-100 rounded-lg">
                    {r.description || 'No description provided.'}
                  </div>

                  {/* Attachments list on mobile */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-[0.02em]">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {(r.challanImageUrls || (r.challanImageUrl ? [{ url: r.challanImageUrl, size: 'Unknown', name: 'Attachment' }] : [])).filter(Boolean).map((img, i) => {
                        const imgObj = typeof img === 'string' ? { url: img, size: 'Unknown', name: `Attachment ${i + 1}` } : img;
                        return (
                          <div key={i} className="flex items-center gap-2 p-1.5 border border-slate-100 rounded-lg bg-slate-50/50">
                            <img src={imgObj.url} alt={imgObj.name} className="w-8 h-8 object-cover rounded shadow-sm" />
                            <a href={imgObj.url} target="_blank" rel="noreferrer" className="text-[10px] text-teal-600 font-semibold px-1.5 py-0.5 hover:underline">View</a>
                          </div>
                        );
                      })}
                      {r.imageUrl && (
                        <div className="flex items-center gap-2 p-1.5 border border-purple-100 rounded bg-purple-50/50">
                          <img src={r.imageUrl} alt="Member remark" className="w-8 h-8 object-cover rounded shadow-sm" />
                          <a href={r.imageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-purple-600 font-semibold px-1.5 py-0.5 hover:underline">View</a>
                        </div>
                      )}
                      {!(r.challanImageUrls?.length > 0 || r.challanImageUrl || r.imageUrl) && (
                        <span className="text-xs text-slate-400 italic font-medium">None</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <div>
                      <p className="font-medium">Assigned: {formatDate(r.assignedDate || r.createdAt)}</p>
                      <p className="mt-0.5 font-medium">
                        Sent Date: {formatDate(r.sentDate)}
                        {aging > 0 && r.status !== 'closed' && r.status !== 'returned' && (
                          <span className={`ml-1 text-[10px] font-bold ${aging > 30 ? 'text-red-500' : aging > 15 ? 'text-amber-500' : 'text-green-500'}`}>({aging}d)</span>
                        )}
                      </p>
                    </div>
                    <span className={`badge ${statusColors[r.status] || 'badge-gray'}`}>{(r.status || '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div className="flex gap-0.5 items-center">
                      <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-[0.02em] mr-1.5">Doc Stage:</span>
                      {DOC_STEPS.map((_, i) => (
                        <div key={i} className={`w-3.5 h-1.5 rounded-full ${(r.docStep || 0) >= i ? 'bg-teal-500' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => { setEditing(r); setShowModal(true); }} 
                        className="text-xs text-teal-650 bg-teal-50 hover:bg-teal-100/70 border border-teal-100 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <DeleteButton onClick={() => deleteRgp(r.id, r.challanNumber || r.type)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
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

import { useState, useMemo, useCallback } from 'react';
import { Plus, Wrench, X, Search, RotateCcw, Edit3, Package, Clock, CheckCircle2, AlertTriangle, BarChart3, Lock } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useTools } from '../hooks/useTools';
import { useTeam } from '../hooks/useTeam';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';

import { notifyToolAssigned } from '../lib/notify';
import { SkeletonTable } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import CountUpNumber from '../components/ui/CountUpNumber';
import ExportButton from '../components/ui/ExportButton';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import BulkDeleteBar from '../components/BulkDeleteBar';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  // Check if it's a Firestore Server Timestamp placeholder (local cache before server sync)
  if (typeof timestamp === 'object' && !timestamp.toDate && !timestamp.seconds) {
    return 'Pending...';
  }
  const date = timestamp?.toDate?.()
    ? timestamp.toDate()
    : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Pending...';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const conditionBadge = (cond) => {
  const map = { Good: 'badge-green', Fair: 'badge-yellow', Poor: 'badge-orange', Damaged: 'badge-red' };
  return map[cond] || 'badge-gray';
};

const CONDITIONS = ['Good', 'Fair', 'Poor', 'Damaged'];

function AssignToolModal({ onClose, onSubmit, members, editing }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    toolName: editing?.toolName || '',
    assignedTo: editing?.assignedTo || '',
    assignedToName: editing?.assignedToName || '',
    handedOverDate: editing?.handedOverDate
      ? (editing.handedOverDate.toDate
          ? editing.handedOverDate.toDate().toISOString().split('T')[0]
          : new Date(editing.handedOverDate).toISOString().split('T')[0])
      : today,
    condition: editing?.condition || 'Good',
    notes: editing?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.toolName.trim()) return;
    if (!editing && !form.assignedTo) return; // assignedTo required for new, locked for edit
    setSaving(true);
    try {
      await onSubmit({
        toolName: form.toolName.trim(),
        ...(editing ? {} : {
          assignedTo: form.assignedTo,
          assignedToName: form.assignedToName,
        }),
        handedOverDate: form.handedOverDate
          ? Timestamp.fromDate(new Date(form.handedOverDate))
          : Timestamp.now(),
        condition: form.condition,
        notes: form.notes.trim(),
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
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-[-0.01em]">
              {editing ? 'Edit Tool assignment' : 'Assign Tool'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="px-6 py-5 space-y-4 font-sans text-xs sm:text-[13px] font-medium text-slate-750 overflow-y-auto">
          {/* Assigned To — locked on edit */}
          {editing ? (
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans flex items-center gap-1.5">
                Assigned To <Lock className="w-3 h-3 text-slate-400" />
              </label>
              <div className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-550 flex items-center justify-between font-semibold">
                <span>{editing.assignedToName || 'Unknown'}</span>
                <span className="text-[10px] text-slate-400 font-medium">(Delete &amp; reassign to change)</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Select Team Member *</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
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
          )}

          <div>
            <label className="block text-[#64748B] mb-1.5 font-sans">Tool Name *</label>
            <input
              className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
              placeholder="e.g. Laptop, Drill Machine, Multimeter"
              value={form.toolName}
              onChange={e => setForm({ ...form, toolName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Handed Over Date</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                type="date"
                value={form.handedOverDate}
                onChange={e => setForm({ ...form, handedOverDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1.5 font-sans">Condition</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A]"
                value={form.condition}
                onChange={e => setForm({ ...form, condition: e.target.value })}
              >
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#64748B] mb-1.5 font-sans">Notes (optional)</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-xs sm:text-[13px] bg-slate-50/30 font-medium text-[#0F172A] resize-none font-sans"
              rows={2}
              placeholder="Any notes about this tool..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
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
            disabled={saving || !form.toolName.trim() || (!editing && !form.assignedTo)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-teal-650 hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update Tool' : 'Assign Tool'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ToolAssignPage() {
  const toast = useToast();
  const { currentUser } = useAuth();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { tools, loading, assignTool, updateTool, markReturned, deleteTool } = useTools();
  const { members, loading: teamLoading } = useTeam();
  const pageLoading = loading || teamLoading;
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterMember, setFilterMember] = useState('All');
  const [filterReturn, setFilterReturn] = useState('All');
  const [filterCondition, setFilterCondition] = useState('All');
  const [search, setSearch] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedToolIds, setSelectedToolIds] = useState([]);

  const activeMembers = useMemo(
    () => members.filter(m => m.status === 'active'),
    [members]
  );

  const analytics = useMemo(() => {
    const condMap = { Good: 0, Fair: 0, Poor: 0, Damaged: 0 };
    tools.forEach(t => {
      const c = t.condition || 'Good';
      condMap[c] = (condMap[c] || 0) + 1;
    });
    const byCondition = Object.keys(condMap)
      .map(k => ({ name: k, value: condMap[k] }))
      .filter(d => d.value > 0);

    const memMap = {};
    tools.filter(t => t.returnStatus === 'pending').forEach(t => {
      const name = t.assignedToName || 'Unknown';
      memMap[name] = (memMap[name] || 0) + 1;
    });
    const byMember = Object.keys(memMap)
      .map(k => ({ name: k.split(' ')[0], count: memMap[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { byCondition, byMember };
  }, [tools]);

  const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

  const filtered = useMemo(() => tools.filter(t => {
    const matchMember = filterMember === 'All' || t.assignedTo === filterMember;
    const matchReturn = filterReturn === 'All' || t.returnStatus === filterReturn;
    const matchCond = filterCondition === 'All' || t.condition === filterCondition;
    const matchSearch = search === '' ||
      (t.toolName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.assignedToName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(search.toLowerCase());
    return matchMember && matchReturn && matchCond && matchSearch;
  }), [tools, filterMember, filterReturn, filterCondition, search]);

  const selectedToolSet = useMemo(() => new Set(selectedToolIds), [selectedToolIds]);
  const visibleToolIds = useMemo(() => filtered.map(t => t.id), [filtered]);
  const allVisibleSelected = visibleToolIds.length > 0 && visibleToolIds.every(id => selectedToolSet.has(id));

  const toggleToolSelection = id =>
    setSelectedToolIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const toggleAllVisibleTools = () =>
    setSelectedToolIds(prev =>
      allVisibleSelected
        ? prev.filter(id => !visibleToolIds.includes(id))
        : Array.from(new Set([...prev, ...visibleToolIds]))
    );

  const pendingReturn = tools.filter(t => t.returnStatus === 'pending').length;
  const returnedCount = tools.filter(t => t.returnStatus === 'returned').length;
  const overdueCount = tools.filter(t => {
    if (t.returnStatus !== 'pending') return false;
    if (t.handedOverDate && typeof t.handedOverDate === 'object' && !t.handedOverDate.toDate && !t.handedOverDate.seconds) {
      return false; // ignore serverTimestamp placeholder for overdue calculation until it resolves
    }
    const d = t.handedOverDate?.toDate ? t.handedOverDate.toDate() : new Date(t.handedOverDate);
    return d && !isNaN(d.getTime()) && (new Date() - d) > 30 * 864e5;
  }).length;

  // ─── Assign new tool ──────────────────────────────────────────────────────────
  const handleAssign = useCallback(async (formData) => {
    if (!formData.toolName?.trim()) { toast.error('Tool name required'); return; }
    if (!formData.assignedTo) { toast.error('Select a team member'); return; }

    try {
      // Use the hook which handles audit logging
      await assignTool({
        toolName: formData.toolName.trim(),
        assignedTo: formData.assignedTo,
        assignedToName: formData.assignedToName || '',
        handedOverDate: formData.handedOverDate || Timestamp.now(),
        condition: formData.condition || 'Good',
        notes: formData.notes || '',
        returnStatus: 'pending',
        returnDate: null,
        createdBy: currentUser?.uid || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // WhatsApp — silent fail
      try {
        const member = activeMembers.find(m => m.id === formData.assignedTo);
        if (member?.whatsapp) {
          await notifyToolAssigned(member, {
            toolName: formData.toolName.trim(),
            handedOverDate: formData.handedOverDate?.toDate ? formData.handedOverDate.toDate() : new Date(),
          });
        }
      } catch (notifErr) {
        console.warn('WhatsApp notify failed (non-fatal):', notifErr.message);
      }

      toast.success('Tool assigned successfully!');
    } catch (err) {
      console.error('Tool assign error:', err);
      toast.error('Failed to assign: ' + err.message);
      throw err;
    }
  }, [assignTool, activeMembers, currentUser?.uid, toast]);

  // ─── Edit tool ────────────────────────────────────────────────────────────────
  const handleEdit = useCallback(async (formData) => {
    if (!editing?.id) return;
    try {
      await updateTool(editing.id, {
        toolName: formData.toolName.trim(),
        handedOverDate: formData.handedOverDate,
        condition: formData.condition,
        notes: formData.notes,
        updatedAt: serverTimestamp(),
      });
      toast.success('Tool record updated!');
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
      throw err;
    }
  }, [editing, updateTool, toast]);

  // ─── Mark returned (with confirm) ────────────────────────────────────────────
  const handleMarkReturned = useCallback((item) => {
    confirmDelete({
      title: 'Mark as Returned',
      description: `Mark "${item.toolName}" as returned from ${item.assignedToName || 'member'}?`,
      onConfirm: async () => {
        try {
          await markReturned(item.id);
          toast.success('Tool marked as returned!');
        } catch (err) {
          toast.error('Failed: ' + err.message);
        }
      },
    });
  }, [confirmDelete, markReturned, toast]);

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id, toolName) => {
    confirmDelete({
      title: 'Delete Tool Record',
      description: `Permanently delete "${toolName}" assignment record? This cannot be undone.`,
      onConfirm: async () => {
        await deleteTool(id);
        setSelectedToolIds(prev => prev.filter(i => i !== id));
        toast.success('Tool record deleted');
      },
    });
  }, [confirmDelete, deleteTool, toast]);

  const bulkDeleteTools = useCallback(() => {
    const idsToDelete = selectedToolIds.filter(id => tools.some(t => t.id === id));
    if (!idsToDelete.length) return;
    confirmDelete({
      title: `Delete ${idsToDelete.length} Tool Records`,
      description: `Permanently delete ${idsToDelete.length} selected tool records? This cannot be undone.`,
      onConfirm: async () => {
        await Promise.all(idsToDelete.map(id => deleteTool(id)));
        setSelectedToolIds([]);
        toast.success(`${idsToDelete.length} records deleted`);
      },
    });
  }, [selectedToolIds, tools, confirmDelete, deleteTool, toast]);

  return (
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F172A] tracking-[-0.02em] leading-tight">Tool Assignment</h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1 font-medium">{tools.length} tools | {pendingReturn} pending return</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <ExportButton
            data={filtered}
            columns={[
              { key: 'toolName', label: 'Tool' },
              { key: 'assignedToName', label: 'Assigned To' },
              { key: 'assignedDate', label: 'Assigned Date' },
              { key: 'handedOverDate', label: 'Handed Over Date' },
              { key: 'condition', label: 'Condition' },
              { key: 'returnStatus', label: 'Return Status' },
              { key: 'returnDate', label: 'Return Date' },
              { key: 'notes', label: 'Notes' },
            ]}
            filename="tool_assignments"
          />
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              showAnalytics 
                ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm' 
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </button>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowModal(true); }}
            disabled={pageLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Assign Tool
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Assigned', value: tools.length, icon: Package, iconBg: 'bg-blue-50/70', iconColor: 'text-blue-600', border: 'border-l-blue-400' },
          { label: 'Pending Return', value: pendingReturn, icon: Clock, iconBg: 'bg-amber-50/70', iconColor: 'text-amber-600', border: 'border-l-amber-400' },
          { label: 'Returned', value: returnedCount, icon: CheckCircle2, iconBg: 'bg-emerald-50/70', iconColor: 'text-emerald-600', border: 'border-l-emerald-400' },
          { label: 'Overdue (30d+)', value: overdueCount, icon: AlertTriangle, iconBg: 'bg-red-50/70', iconColor: 'text-red-600', border: 'border-l-red-400' },
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

      {/* Analytics Breakdown */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 border border-slate-100 rounded-[16px] bg-slate-50/20">
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm">
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Tool Condition Breakdown</span>
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.byCondition} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                    {analytics.byCondition.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {analytics.byCondition.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm">
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>Members Holding Tools (Pending)</span>
            </h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byMember} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="Pending Tools" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Filters Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] shadow-sm overflow-hidden z-20">
        <div className="flex flex-col sm:flex-row sm:items-center px-5 py-3 gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tool or member..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-655 text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
            />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <select className="h-9 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-655 text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50 cursor-pointer" value={filterMember} onChange={e => setFilterMember(e.target.value)}>
              <option value="All">All Members</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select className="h-9 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-655 text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50 cursor-pointer" value={filterReturn} onChange={e => setFilterReturn(e.target.value)}>
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="returned">Returned</option>
            </select>
            <select className="h-9 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-650 focus:ring-1 focus:ring-teal-655 text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50 cursor-pointer" value={filterCondition} onChange={e => setFilterCondition(e.target.value)}>
              <option value="All">All Condition</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <span className="text-xs font-semibold text-[#64748B] sm:ml-auto whitespace-nowrap">{filtered.length} results</span>
        </div>
      </div>

      <BulkDeleteBar
        selectedCount={selectedToolIds.length}
        onDelete={bulkDeleteTools}
        onClear={() => setSelectedToolIds([])}
      />

      {/* Directory Table Workspace */}
      {pageLoading ? (
        <SkeletonTable rows={5} cols={10} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="noData" title="No tools assigned yet" actionLabel="Assign Tool" onAction={() => { setEditing(null); setShowModal(true); }} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left font-sans">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisibleTools} className="rounded accent-teal-600 cursor-pointer" title="Select all" />
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tool Name</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Assigned Date</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Handed Over</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Days Issued</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Return Status</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map(item => {
                    const handed = item.handedOverDate?.toDate
                      ? item.handedOverDate.toDate()
                      : (item.handedOverDate ? new Date(item.handedOverDate) : null);
                    const returnD = item.returnStatus === 'returned' && item.returnDate
                      ? (item.returnDate.toDate ? item.returnDate.toDate() : new Date(item.returnDate))
                      : new Date();
                    const daysSince = handed && !isNaN(handed.getTime()) && returnD && !isNaN(returnD.getTime())
                      ? Math.floor((returnD - handed) / (1000 * 60 * 60 * 24))
                      : 0;
                    const isOverdue = item.returnStatus === 'pending' && daysSince > 30;
                    return (
                      <tr
                        key={item.id}
                        className={`group hover:bg-slate-50/50 transition-colors border-b border-[#E2E8F0] last:border-0 ${isOverdue ? 'bg-red-50/30' : ''}`}
                      >
                        <td className="p-4 w-10 text-center">
                          <input type="checkbox" checked={selectedToolSet.has(item.id)} onChange={() => toggleToolSelection(item.id)} className="rounded accent-teal-600 cursor-pointer" />
                        </td>
                        <td className="p-4 text-xs font-semibold text-[#0F172A]">{item.toolName}</td>
                        <td className="p-4 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
                              {(item.assignedToName || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-700">{item.assignedToName || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 text-xs font-medium">{formatDate(item.assignedDate || item.createdAt)}</td>
                        <td className="p-4 text-[#64748B] text-xs font-medium">{formatDate(item.handedOverDate)}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            daysSince > 30 ? 'bg-red-50 text-red-650 border border-red-100' :
                            daysSince > 15 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {daysSince}d
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`badge ${conditionBadge(item.condition || 'Good')}`}>{item.condition || 'Good'}</span>
                        </td>
                        <td className="p-4 text-xs">
                          <div>
                            <span className={`badge ${item.returnStatus === 'returned' ? 'badge-green' : 'badge-yellow'}`}>
                              {item.returnStatus === 'returned' ? 'Returned' : 'Pending'}
                            </span>
                            {isOverdue && <AlertTriangle className="inline w-3.5 h-3.5 text-red-500 ml-1.5" title="Overdue 30+ days" />}
                            {item.returnStatus === 'returned' && item.returnDate && (
                              <p className="text-[10px] text-slate-450 mt-1 font-medium">{formatDate(item.returnDate)}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-[#64748B] text-xs font-medium max-w-[160px]" title={item.notes || ''}>
                          <span className="truncate block">{item.notes || '-'}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.returnStatus === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleMarkReturned(item)}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors border border-transparent hover:border-green-150"
                                title="Mark as Returned"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setEditing(item); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors border border-transparent hover:border-blue-150"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <DeleteButton onClick={() => handleDelete(item.id, item.toolName)} />
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
            {filtered.map(item => {
              const handed = item.handedOverDate?.toDate
                ? item.handedOverDate.toDate()
                : (item.handedOverDate ? new Date(item.handedOverDate) : null);
              const returnD = item.returnStatus === 'returned' && item.returnDate
                ? (item.returnDate.toDate ? item.returnDate.toDate() : new Date(item.returnDate))
                : new Date();
              const daysSince = handed && !isNaN(handed.getTime()) && returnD && !isNaN(returnD.getTime())
                ? Math.floor((returnD - handed) / (1000 * 60 * 60 * 24))
                : 0;
              const isOverdue = item.returnStatus === 'pending' && daysSince > 30;
              return (
                <div key={item.id} className={`bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3 ${isOverdue ? 'border-l-4 border-red-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedToolSet.has(item.id)} onChange={() => toggleToolSelection(item.id)} className="rounded accent-teal-600 cursor-pointer" />
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{item.toolName}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Issued to: {item.assignedToName || 'Unknown'}</p>
                      </div>
                    </div>
                    <span className={`badge ${conditionBadge(item.condition || 'Good')}`}>{item.condition || 'Good'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 text-slate-600 font-medium font-sans">
                    <div>
                      <p className="text-slate-400 font-sans">Assigned Date</p>
                      <p className="font-semibold text-[#0F172A] mt-0.5">{formatDate(item.assignedDate || item.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-sans">Handed Over</p>
                      <p className="font-semibold text-[#0F172A] mt-0.5">{formatDate(item.handedOverDate)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-sans">Days Issued</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        daysSince > 30 ? 'bg-red-50 text-red-600 border border-red-100' :
                        daysSince > 15 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-slate-100 text-slate-650'
                      }`}>
                        {daysSince}d
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400 font-sans">Status</p>
                      <div className="flex flex-col items-start gap-1 mt-0.5">
                        <div className="flex items-center gap-1">
                          <span className={`badge ${item.returnStatus === 'returned' ? 'badge-green' : 'badge-yellow'}`}>
                            {item.returnStatus === 'returned' ? 'Returned' : 'Pending'}
                          </span>
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500" title="Overdue 30+ days" />}
                        </div>
                        {item.returnStatus === 'returned' && item.returnDate && (
                          <p className="text-[10px] text-slate-400 font-medium">{formatDate(item.returnDate)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 border border-slate-100 rounded-lg">
                      <strong>Notes:</strong> {item.notes}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    {item.returnStatus === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleMarkReturned(item)}
                        className="text-xs text-green-600 bg-green-50 hover:bg-green-100/70 border border-green-100 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Return
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setEditing(item); setShowModal(true); }}
                      className="text-xs text-blue-650 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <DeleteButton onClick={() => handleDelete(item.id, item.toolName)} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <AssignToolModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={editing ? handleEdit : handleAssign}
          members={activeMembers}
          editing={editing}
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

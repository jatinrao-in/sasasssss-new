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
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-content max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Tool' : 'Assign Tool'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Assigned To — locked on edit */}
          {editing ? (
            <div>
              <label className="label flex items-center gap-1.5">
                Assigned To <Lock className="w-3 h-3 text-gray-400" />
              </label>
              <div className="input-field bg-gray-50 text-gray-500 flex items-center gap-2">
                <span>{editing.assignedToName || 'Unknown'}</span>
                <span className="text-xs text-gray-400 ml-auto">(Delete &amp; reassign to change)</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="label">Select Team Member *</label>
              <select
                className="input-field"
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
            <label className="label">Tool Name *</label>
            <input
              className="input-field"
              placeholder="e.g. Laptop, Drill Machine, Multimeter"
              value={form.toolName}
              onChange={e => setForm({ ...form, toolName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Handed Over Date</label>
              <input
                className="input-field"
                type="date"
                value={form.handedOverDate}
                onChange={e => setForm({ ...form, handedOverDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Condition</label>
              <select
                className="input-field"
                value={form.condition}
                onChange={e => setForm({ ...form, condition: e.target.value })}
              >
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Any notes about this tool..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.toolName.trim() || (!editing && !form.assignedTo)}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

  const conditionBadge = (cond) => {
    const map = { Good: 'badge-green', Fair: 'badge-yellow', Poor: 'badge-orange', Damaged: 'badge-red' };
    return map[cond] || 'badge-gray';
  };

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tool Assignment</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{tools.length} tools | {pendingReturn} pending return</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showAnalytics ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            disabled={pageLoading}
            className="btn-primary disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> Assign Tool
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assigned', value: tools.length, icon: Package, color: 'bg-blue-50 text-blue-600' },
          { label: 'Pending Return', value: pendingReturn, icon: Clock, color: 'bg-amber-50 text-amber-600' },
          { label: 'Returned', value: returnedCount, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
          { label: 'Overdue (30d+)', value: overdueCount, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card stat-card flex items-center gap-3 py-3 stagger-item">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color.split(' ')[0]}`}>
                <Icon className={`w-5 h-5 ${s.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium">{s.label}</p>
                <p className="text-lg font-bold text-gray-900"><CountUpNumber end={s.value} /></p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tool Condition Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={analytics.byCondition} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value">
                  {analytics.byCondition.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {analytics.byCondition.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}: {d.value}
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Members Holding Tools (Pending)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.byMember} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Pending Tools" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tool or member..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 w-full"
            />
          </div>
          <select className="input-field w-full sm:w-44" value={filterMember} onChange={e => setFilterMember(e.target.value)}>
            <option value="All">All Members</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="input-field w-full sm:w-36" value={filterReturn} onChange={e => setFilterReturn(e.target.value)}>
            <option value="All">All Status</option>
            <option value="pending">Pending</option>
            <option value="returned">Returned</option>
          </select>
          <select className="input-field w-full sm:w-32" value={filterCondition} onChange={e => setFilterCondition(e.target.value)}>
            <option value="All">All Condition</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-xs text-gray-400 sm:ml-auto text-center sm:text-right w-full sm:w-auto">{filtered.length} records</span>
        </div>
      </div>

      <BulkDeleteBar
        selectedCount={selectedToolIds.length}
        onDelete={bulkDeleteTools}
        onClear={() => setSelectedToolIds([])}
      />

      {/* Table */}
      {pageLoading ? (
        <SkeletonTable rows={5} cols={10} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="noData" title="No tools assigned yet" actionLabel="Assign Tool" onAction={() => { setEditing(null); setShowModal(true); }} />
      ) : (
        <>
          {/* Desktop View */}
          <div className="card p-0 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="table-header w-10">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisibleTools} className="rounded accent-teal-600" title="Select all" />
                    </th>
                    <th className="table-header">Tool Name</th>
                    <th className="table-header">Assigned To</th>
                    <th className="table-header">Assigned Date</th>
                    <th className="table-header">Handed Over</th>
                    <th className="table-header">Days Since Issue</th>
                    <th className="table-header">Condition</th>
                    <th className="table-header">Return Status</th>
                    <th className="table-header">Notes</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
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
                        className={`group hover:bg-gray-50/60 transition-colors border-b border-[var(--border-primary)] last:border-0 ${isOverdue ? 'bg-red-50/30' : ''}`}
                      >
                        <td className="table-cell">
                          <input type="checkbox" checked={selectedToolSet.has(item.id)} onChange={() => toggleToolSelection(item.id)} className="rounded accent-teal-600" />
                        </td>
                        <td className="table-cell font-semibold text-gray-900">{item.toolName}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {(item.assignedToName || 'U').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-700">{item.assignedToName || '-'}</span>
                          </div>
                        </td>
                        <td className="table-cell text-gray-600 text-xs">{formatDate(item.assignedDate || item.createdAt)}</td>
                        <td className="table-cell text-[var(--text-muted)] text-xs">{formatDate(item.handedOverDate)}</td>
                        <td className="table-cell text-center">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            daysSince > 30 ? 'bg-red-100 text-red-600' :
                            daysSince > 15 ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {daysSince}d
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${conditionBadge(item.condition || 'Good')}`}>{item.condition || 'Good'}</span>
                        </td>
                        <td className="table-cell">
                          <div>
                            <span className={`badge ${item.returnStatus === 'returned' ? 'badge-green' : 'badge-yellow'}`}>
                              {item.returnStatus === 'returned' ? 'Returned' : 'Pending'}
                            </span>
                            {isOverdue && <AlertTriangle className="inline w-3.5 h-3.5 text-red-500 ml-1" title="Overdue 30+ days" />}
                            {item.returnStatus === 'returned' && item.returnDate && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(item.returnDate)}</p>
                            )}
                          </div>
                        </td>
                        <td className="table-cell text-[var(--text-muted)] text-xs max-w-[160px]">
                          <span className="truncate block" title={item.notes || ''}>{item.notes ? item.notes.slice(0, 35) + (item.notes.length > 35 ? '...' : '') : '-'}</span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.returnStatus === 'pending' && (
                              <button
                                onClick={() => handleMarkReturned(item)}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                title="Mark as Returned"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => { setEditing(item); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
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
                <div key={item.id} className={`card p-4 space-y-3 ${isOverdue ? 'border-l-4 border-red-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedToolSet.has(item.id)} onChange={() => toggleToolSelection(item.id)} className="rounded accent-teal-600" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.toolName}</h4>
                        <p className="text-xs text-gray-400">Issued to: {item.assignedToName || 'Unknown'}</p>
                      </div>
                    </div>
                    <span className={`badge ${conditionBadge(item.condition || 'Good')}`}>{item.condition || 'Good'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-50 text-gray-600">
                    <div>
                      <p className="text-gray-400">Assigned Date</p>
                      <p className="font-medium">{formatDate(item.assignedDate || item.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Handed Over</p>
                      <p className="font-medium">{formatDate(item.handedOverDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Days Issued</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        daysSince > 30 ? 'bg-red-100 text-red-600' :
                        daysSince > 15 ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {daysSince}d
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-1">
                          <span className={`badge ${item.returnStatus === 'returned' ? 'badge-green' : 'badge-yellow'}`}>
                            {item.returnStatus === 'returned' ? 'Returned' : 'Pending'}
                          </span>
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500" title="Overdue 30+ days" />}
                        </div>
                        {item.returnStatus === 'returned' && item.returnDate && (
                          <p className="text-[10px] text-gray-400">{formatDate(item.returnDate)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                      <strong>Notes:</strong> {item.notes}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    {item.returnStatus === 'pending' && (
                      <button
                        onClick={() => handleMarkReturned(item)}
                        className="text-xs text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Return
                      </button>
                    )}
                    <button
                      onClick={() => { setEditing(item); setShowModal(true); }}
                      className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
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

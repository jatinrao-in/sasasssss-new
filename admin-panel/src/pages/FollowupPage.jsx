import { useState, useMemo, useEffect } from 'react';
import {
  Plus, X, Search, Calendar, LayoutGrid, Clock,
  CheckCircle2, XCircle, MinusCircle, MessageSquare,
  TrendingUp, BarChart3, ChevronRight, Eye, Users,
  Phone, Mail, Trash2, MoreHorizontal, Flame,
  ArrowUpRight, Check, ChevronDown, SlidersHorizontal,
  AlertCircle, Filter, Sparkles, AlertTriangle, Activity,
  PhoneCall, Play
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
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

// Formatting helpers
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getInitials = (name) => {
  if (!name) return 'UN';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Rs 0';
  return `Rs ${Number(amount).toLocaleString('en-IN')}`;
};

const formatLakhs = (amount) => {
  if (!amount) return 'Rs 0L';
  return `Rs ${(amount / 100000).toFixed(1)}L`;
};

const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Visit', 'Quotation', 'Costing'];

const OUTCOMES = [
  { value: 'positive', label: 'Positive', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'neutral', label: 'Neutral', icon: MinusCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'negative', label: 'Negative', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
];

function FollowupModal({ onClose, onSubmit, members, editing }) {
  const [form, setForm] = useState({
    companyName: editing?.companyName || editing?.customerName || '',
    contactPerson: editing?.contactPerson || '',
    contactPhone: editing?.contactPhone || editing?.phone || '',
    contactEmail: editing?.contactEmail || editing?.email || '',
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
    dealValue: editing?.dealValue || editing?.amount || '',
    priority: editing?.priority || 'medium',
    leadScore: editing?.leadScore !== undefined ? editing.leadScore : (editing?.priority === 'critical' || editing?.priority === 'high' ? 85 : 55),
    leadTemperature: editing?.leadTemperature || (editing?.priority === 'critical' || editing?.priority === 'high' ? 'hot' : 'warm'),
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
        contactEmail: form.contactEmail,
        description: form.description,
        taskType: form.taskType,
        assignedTo: form.assignedTo,
        assignedToName: form.assignedToName,
        targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
        status: form.status,
        outcome: form.outcome,
        nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
        rescheduleCount: Number(form.rescheduleCount) || 0,
        notes: form.notes,
        dealValue: Number(form.dealValue) || 0,
        priority: form.priority,
        leadScore: Number(form.leadScore) || 50,
        leadTemperature: form.leadTemperature,
      };
      await onSubmit(data);
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{editing ? 'Edit' : 'Add'} Follow-Up Activity</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto bg-white flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name *</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Company name"
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Person</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Contact person"
                value={form.contactPerson}
                onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="+91 XXXX XXXXXX"
                value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="email@company.com"
                value={form.contactEmail}
                onChange={e => setForm({ ...form, contactEmail: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Activity Description *</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={3}
              placeholder="Record details of followup needed or actions taken..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Activity Type</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.taskType}
                onChange={e => setForm({ ...form, taskType: e.target.value })}
              >
                <option value="">Select type</option>
                {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Date</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                type="date"
                value={form.targetDate}
                onChange={e => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign To</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Follow-up Date</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                type="date"
                value={form.nextFollowupDate}
                onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deal Value (Rs)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="0"
                value={form.dealValue}
                onChange={e => setForm({ ...form, dealValue: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Enquiry Score (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                value={form.leadScore}
                onChange={e => setForm({ ...form, leadScore: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Enquiry Temperature</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.leadTemperature}
                onChange={e => setForm({ ...form, leadTemperature: e.target.value })}
              >
                <option value="hot">🔥 Hot</option>
                <option value="warm">🟡 Warm</option>
                <option value="cold">⚪ Cold</option>
              </select>
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Outcome</label>
                <select
                  className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                  value={form.outcome}
                  onChange={e => setForm({ ...form, outcome: e.target.value, status: e.target.value ? 'closed' : form.status })}
                >
                  <option value="">No Outcome</option>
                  {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Internal Remarks</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100/50 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm font-semibold"
          >
            {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Follow-Up</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function FollowupDetailPanel({ followup, onClose, onSaveNotes }) {
  const [activeTab, setActiveTab] = useState('details');
  const [notes, setNotes] = useState(followup?.notes || followup?.remarks || '');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(followup?.notes || followup?.remarks || '');
  }, [followup]);

  if (!followup) return null;

  const statusColors = { open: 'bg-blue-50 text-blue-700 border-blue-200', overdue: 'bg-red-50 text-red-700 border-red-200', closed: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'critical' || p === 'high') return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 uppercase">High</span>;
    if (p === 'medium') return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200 uppercase">Medium</span>;
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200 uppercase">Low</span>;
  };

  const getTempDisplay = (temp) => {
    const t = (temp || 'warm').toLowerCase();
    if (t === 'hot') return '🔥 Hot';
    if (t === 'warm') return '🟡 Warm';
    return '⚪ Cold';
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onSaveNotes(followup.id, notes);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNotes(false);
    }
  };

  const cleanedPhone = (followup.contactPhone || followup.phone || '').replace(/\D/g, '');
  const waLink = cleanedPhone ? `https://wa.me/91${cleanedPhone.length > 10 ? cleanedPhone.slice(-10) : cleanedPhone}` : null;
  const telLink = followup.contactPhone || followup.phone ? `tel:${followup.contactPhone || followup.phone}` : null;
  const mailLink = followup.contactEmail || followup.email ? `mailto:${followup.contactEmail || followup.email}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md h-full shadow-2xl overflow-y-auto border-l border-slate-100 flex flex-col slide-in-right">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Activity Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Enquiry Profile Banner */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg">
            {getInitials(followup.companyName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate text-base">{followup.companyName}</p>
            <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
              {followup.contactPerson ? `${followup.contactPerson} | ` : ''}
              {followup.contactPhone || 'No phone'}
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-100 px-4 bg-white">
          {[
            { id: 'details', label: 'Details' },
            { id: 'timeline', label: 'Timeline & Communication' },
            { id: 'notes', label: 'Internal Notes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Tabs */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Follow-up description</p>
                <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                  {followup.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Status</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColors[followup.status] || 'bg-slate-50'}`}>
                    {followup.status}
                  </span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Priority</p>
                  <span>{getPriorityBadge(followup.priority)}</span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Enquiry Score</p>
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {followup.leadScore !== undefined ? followup.leadScore : 55}/100
                  </span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Temperature</p>
                  <span className="text-xs font-bold text-slate-850">{getTempDisplay(followup.leadTemperature)}</span>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Deal Value</p>
                  <p className="text-xs font-extrabold text-emerald-600">{formatCurrency(followup.dealValue || followup.amount || 0)}</p>
                </div>
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Activity Type</p>
                  <p className="text-xs font-semibold text-slate-700">{followup.taskType || '-'}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Assigned Rep:</span>
                  <span className="text-slate-800 font-bold">{followup.assignedToName || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Target Date:</span>
                  <span className="text-slate-800 font-bold">{formatDate(followup.targetDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Next Followup Date:</span>
                  <span className="text-blue-600 font-extrabold">{formatDate(followup.nextFollowupDate || followup.targetDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Reschedule Counts:</span>
                  <span className="text-amber-600 font-bold">{followup.rescheduleCount || 0} times</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Quick Triggers */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Channels</p>
                <div className="grid grid-cols-3 gap-3">
                  {waLink ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-14 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-xl flex flex-col items-center justify-center gap-1 text-emerald-700 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-[10px] font-bold">WhatsApp</span>
                    </a>
                  ) : (
                    <button disabled className="h-14 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 cursor-not-allowed">
                      <MessageSquare className="w-5 h-5" />
                      <span className="text-[10px] font-bold">WhatsApp</span>
                    </button>
                  )}

                  {telLink ? (
                    <a
                      href={telLink}
                      className="h-14 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl flex flex-col items-center justify-center gap-1 text-blue-700 transition-colors"
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Call Rep</span>
                    </a>
                  ) : (
                    <button disabled className="h-14 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 cursor-not-allowed">
                      <PhoneCall className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Call Rep</span>
                    </button>
                  )}

                  {mailLink ? (
                    <a
                      href={mailLink}
                      className="h-14 bg-purple-50 border border-purple-100 hover:bg-purple-100 rounded-xl flex flex-col items-center justify-center gap-1 text-purple-700 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Send Mail</span>
                    </a>
                  ) : (
                    <button disabled className="h-14 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 cursor-not-allowed">
                      <Mail className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Send Mail</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Timeline feed */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Activity History</p>
                <div className="relative pl-6 border-l border-slate-100 space-y-6 text-xs">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 bg-blue-600 border-4 border-white rounded-full" />
                    <div>
                      <p className="font-bold text-slate-800">Follow-up Registered</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Assigned to {followup.assignedToName || 'Representative'}</p>
                    </div>
                  </div>

                  {followup.rescheduleCount > 0 && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 bg-amber-500 border-4 border-white rounded-full" />
                      <div>
                        <p className="font-bold text-slate-800">Rescheduled Activity</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Moved {followup.rescheduleCount} times. Status currently: {followup.status}</p>
                      </div>
                    </div>
                  )}

                  {followup.status === 'closed' && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 bg-emerald-500 border-4 border-white rounded-full" />
                      <div>
                        <p className="font-bold text-slate-800">Activity Completed</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Closed with {followup.outcome || 'neutral'} outcome</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Remarks & Follow-up Logs</label>
                <textarea
                  className="w-full h-60 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm font-medium bg-slate-50/20 leading-relaxed resize-none"
                  placeholder="Record discussions, outcome details, client responses..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full h-10 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-850 disabled:opacity-50 transition-all shadow-sm"
              >
                {savingNotes ? 'Saving Notes...' : 'Save Notes'}
              </button>
            </div>
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
  const [filterPriority, setFilterPriority] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [selectedFollowupIds, setSelectedFollowupIds] = useState([]);
  
  // Custom reschedule & closing outcomes
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);
  const [closingFollowup, setClosingFollowup] = useState(null);

  // Column Customizer & Filters Toggles
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    leadScore: true,
    priority: true,
    lastContact: true,
    nextAction: true,
    dealValue: true,
    followupAge: true,
    healthStatus: true,
    status: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'nextFollowupDate', direction: 'asc' });

  // Triage state filters (click widgets)
  const [activeInsightFilter, setActiveInsightFilter] = useState(null);

  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  const isToday = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isOverdue = (timestamp, status) => {
    if (!timestamp || status === 'closed') return false;
    const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    today.setHours(0,0,0,0);
    const dateZero = new Date(date);
    dateZero.setHours(0,0,0,0);
    return dateZero < today;
  };

  const isUpcomingThisWeek = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    today.setHours(0,0,0,0);
    nextWeek.setHours(23,59,59,999);
    return date >= today && date <= nextWeek;
  };

  const getFollowupAge = (createdAtTs) => {
    if (!createdAtTs) return 0;
    const created = createdAtTs?.toDate?.() ? createdAtTs.toDate() : new Date(createdAtTs);
    const diff = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diff < 0 ? 0 : diff;
  };

  // Triage conditions
  const isHot = (f) => {
    const score = f.leadScore !== undefined ? Number(f.leadScore) : (f.priority === 'critical' || f.priority === 'high' ? 85 : 50);
    const temp = f.leadTemperature || (f.priority === 'critical' || f.priority === 'high' ? 'hot' : 'warm');
    return score >= 80 || temp.toLowerCase() === 'hot';
  };

  const isHighValue = (f) => {
    const value = f.dealValue || f.amount || 0;
    return value >= 50000;
  };

  const isStuck = (f) => {
    const reschedules = f.rescheduleCount || 0;
    const age = getFollowupAge(f.createdAt);
    return reschedules >= 3 || age >= 30;
  };

  // 1. Filter Engine
  const filtered = useMemo(() => {
    return followups.filter(f => {
      const matchSearch = search === '' ||
        (f.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.contactPhone || '').includes(search) ||
        (f.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.taskType || '').toLowerCase().includes(search.toLowerCase());

      const matchStatus = filterStatus === 'All' || 
        (filterStatus === 'open' && f.status !== 'closed') || 
        (filterStatus === 'closed' && f.status === 'closed');
        
      const matchType = filterType === 'All' || f.taskType === filterType;
      const matchMember = filterMember === 'All' || f.assignedTo === filterMember;
      const matchPriority = filterPriority === 'All' || f.priority === filterPriority;

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

      // Action Center interactive clicks
      let matchInsight = true;
      if (activeInsightFilter === 'today') {
        matchInsight = !f.isClosed && isToday(f.dueDate);
      } else if (activeInsightFilter === 'overdue') {
        matchInsight = f.statusCategory === 'overdue';
      } else if (activeInsightFilter === 'hot') {
        matchInsight = isHot(f);
      } else if (activeInsightFilter === 'high_value') {
        matchInsight = isHighValue(f);
      } else if (activeInsightFilter === 'stuck') {
        matchInsight = isStuck(f);
      } else if (activeInsightFilter === 'completed_today') {
        matchInsight = f.isClosed && isToday(f.closedAt || f.updatedAt);
      } else if (activeInsightFilter === 'upcoming_week') {
        matchInsight = !f.isClosed && isUpcomingThisWeek(f.dueDate);
      }

      return matchSearch && matchStatus && matchType && matchMember && matchPriority && matchDate && matchInsight;
    });
  }, [followups, search, filterStatus, filterType, filterMember, filterPriority, dateRange, activeInsightFilter]);

  // 2. Sorting
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (!sortConfig.key) return list;

    list.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'leadScore') {
        aVal = aVal !== undefined ? Number(aVal) : (a.priority === 'critical' || a.priority === 'high' ? 85 : 55);
        bVal = bVal !== undefined ? Number(bVal) : (b.priority === 'critical' || b.priority === 'high' ? 85 : 55);
      }

      if (sortConfig.key === 'dealValue') {
        aVal = Number(aVal || a.amount || 0);
        bVal = Number(bVal || b.amount || 0);
      }

      if (sortConfig.key === 'followupAge') {
        aVal = getFollowupAge(a.createdAt);
        bVal = getFollowupAge(b.createdAt);
      }

      if (sortConfig.key === 'nextFollowupDate' || sortConfig.key === 'targetDate' || sortConfig.key === 'createdAt') {
        aVal = aVal?.toDate?.() || (aVal ? new Date(aVal) : new Date(0));
        bVal = bVal?.toDate?.() || (bVal ? new Date(bVal) : new Date(0));
      }

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      aVal = aVal === undefined || aVal === null ? 0 : Number(aVal);
      bVal = bVal === undefined || bVal === null ? 0 : Number(bVal);

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [filtered, sortConfig]);

  // 3. Selection
  const selectedFollowupSet = useMemo(() => new Set(selectedFollowupIds), [selectedFollowupIds]);
  const visibleFollowupIds = useMemo(() => sorted.map(f => f.id), [sorted]);
  const allVisibleSelected = visibleFollowupIds.length > 0 && visibleFollowupIds.every(id => selectedFollowupSet.has(id));

  const toggleFollowupSelection = (followupId) => {
    setSelectedFollowupIds(prev => (
      prev.includes(followupId) ? prev.filter(id => id !== followupId) : [...prev, followupId]
    ));
  };

  const toggleAllVisibleFollowups = () => {
    setSelectedFollowupIds(prev => {
      if (allVisibleSelected) {
        return prev.filter(id => !visibleFollowupIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleFollowupIds]));
    });
  };

  // 4. Activity Calculations
  const stats = useMemo(() => {
    const total = followups.length;
    const open = followups.filter(f => !f.isClosed).length;
    const overdue = followups.filter(f => f.statusCategory === 'overdue').length;
    const todayOpen = followups.filter(f => !f.isClosed && isToday(f.dueDate)).length;
    const completedToday = followups.filter(f => f.isClosed && isToday(f.closedAt || f.updatedAt)).length;
    const upcomingWeek = followups.filter(f => !f.isClosed && isUpcomingThisWeek(f.dueDate)).length;

    // Positive outcome rate
    const closed = followups.filter(f => f.isClosed);
    const positive = closed.filter(f => f.outcome === 'positive').length;
    const successRate = closed.length > 0 ? Math.round((positive / closed.length) * 100) : 0;

    // Action center triage count metrics
    const hotCount = followups.filter(f => isHot(f)).length;
    const overdueCount = overdue;
    const highValueCount = followups.filter(f => isHighValue(f)).length;
    const stuckCount = followups.filter(f => isStuck(f)).length;

    return {
      total, open, overdue, todayOpen, completedToday, upcomingWeek, successRate,
      hotCount, overdueCount, highValueCount, stuckCount
    };
  }, [followups]);

  // Team Workload Summary
  const workloadStats = useMemo(() => {
    const mIds = new Set(followups.map(f => f.assignedTo).filter(Boolean));
    activeMembers.forEach(m => mIds.add(m.id));

    return Array.from(mIds).map(mId => {
      const member = members.find(m => m.id === mId);
      const name = member?.name || 'Unassigned';
      const role = member?.designation || member?.role || 'Sales Representative';
      const avatar = member?.avatarUrl || null;
      const initials = getInitials(name);

      const mFollowups = followups.filter(f => f.assignedTo === mId);
      const pending = mFollowups.filter(f => !f.isClosed).length;
      const completed = mFollowups.filter(f => f.isClosed && isToday(f.closedAt || f.updatedAt)).length;
      const overdueVal = mFollowups.filter(f => f.statusCategory === 'overdue').length;

      return { id: mId, name, role, avatar, initials, pending, completed, overdue: overdueVal };
    }).sort((a, b) => b.pending - a.pending);
  }, [followups, activeMembers, members]);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    return followups
      .filter(f => f.isClosed)
      .slice(0, 5)
      .map(f => {
        let actIcon = Phone;
        const type = (f.taskType || '').toLowerCase();
        if (type.includes('call')) actIcon = Phone;
        else if (type.includes('whatsapp') || type.includes('message')) actIcon = MessageSquare;
        else if (type.includes('email') || type.includes('mail')) actIcon = Mail;
        else if (type.includes('meeting') || type.includes('visit')) actIcon = Users;
        else actIcon = Calendar;

        return {
          id: f.id,
          company: f.companyName,
          type: f.taskType || 'Follow-up',
          outcome: f.outcome,
          remarks: f.notes || f.remarks || f.description || '',
          by: f.assignedToName || 'Sales Agent',
          date: f.closedAt || f.updatedAt || f.targetDate,
          icon: actIcon
        };
      });
  }, [followups]);

  // 5. Actions Handlers
  const handleAdd = async (data) => {
    try {
      const fullData = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await addFollowup(fullData);

      if (data.assignedTo) {
        const member = members.find(m => m.id === data.assignedTo);
        if (member?.whatsapp) {
          try { await notifyFollowupAssigned(member, fullData); }
          catch (e) { console.error('Notification failed:', e); }
        }
      }
      toast.success('Activity follow-up scheduled!');
    } catch (err) {
      toast.error('Schedule failed: ' + err.message);
      throw err;
    }
  };

  const handleEdit = async (data) => {
    try {
      const fullData = {
        ...data,
        updatedAt: Timestamp.now(),
      };
      await updateFollowup(editing.id, fullData);
      toast.success('Follow-up activity updated!');
    } catch (err) {
      toast.error('Update failed: ' + err.message);
      throw err;
    }
  };

  const handleSaveNotes = async (id, noteText) => {
    try {
      await updateFollowup(id, { notes: noteText, remarks: noteText, updatedAt: Timestamp.now() });
      toast.success('Follow-up activity notes saved!');
      setSelectedFollowup(prev => prev && prev.id === id ? { ...prev, notes: noteText, remarks: noteText } : prev);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleItem || !newRescheduleDate) return;
    setRescheduleSaving(true);
    try {
      await updateFollowup(rescheduleItem.id, {
        nextFollowupDate: Timestamp.fromDate(new Date(newRescheduleDate)),
        rescheduleCount: (rescheduleItem.rescheduleCount || 0) + 1,
        updatedAt: Timestamp.now(),
      });
      toast.success('Follow-up rescheduled successfully!');
      setRescheduleItem(null);
    } catch (err) {
      toast.error('Reschedule failed: ' + err.message);
    } finally {
      setRescheduleSaving(false);
    }
  };

  const deleteFollowupRecord = (id) => {
    confirmDelete({
      title: 'Delete Follow-up Activity',
      description: 'Are you sure you want to permanently delete this follow-up record?',
      onConfirm: async () => {
        await deleteFollowup(id);
        setSelectedFollowupIds(prev => prev.filter(item => item !== id));
        if (selectedFollowup?.id === id) setSelectedFollowup(null);
        toast.success('Activity deleted');
      }
    });
  };

  const bulkDeleteFollowups = () => {
    const idsToDelete = selectedFollowupIds.filter(id => followups.some(f => f.id === id));
    if (idsToDelete.length === 0) return;

    confirmDelete({
      title: `Delete ${idsToDelete.length} Activities`,
      description: `Permanently delete ${idsToDelete.length} selected follow-up records? This cannot be undone.`,
      onConfirm: async () => {
        await Promise.all(idsToDelete.map(id => deleteFollowup(id)));
        setSelectedFollowupIds([]);
        toast.success('Bulk deletion completed');
      }
    });
  };

  const handleSortClick = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Visual component customizers
  const getLeadScoreBadge = (score, priority) => {
    const s = score !== undefined ? Number(score) : (priority === 'critical' || priority === 'high' ? 85 : 55);
    let color = 'bg-slate-50 text-slate-700 border-slate-200';
    if (s >= 80) color = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    else if (s >= 50) color = 'bg-blue-50 text-blue-700 border border-blue-200';
    else color = 'bg-rose-50 text-rose-700 border border-rose-200';
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{s}</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'critical' || p === 'high') return <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-red-55 text-red-700 border border-red-100">High</span>;
    if (p === 'medium') return <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-blue-55 text-blue-700 border border-blue-100">Medium</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-50 text-slate-500 border border-slate-200">Low</span>;
  };

  const getHealthStatus = (f) => {
    const isClosed = f.isClosed;
    const isOverdueAlert = isOverdue(f.dueDate, f.status);
    const overdueDays = f.overdueDays || 0;

    if (isClosed) return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">On Track</span>;
    if (isOverdueAlert && overdueDays > 5) return <span className="text-xs font-bold text-rose-600 bg-rose-55 px-2 py-0.5 rounded border border-rose-100">Critical</span>;
    if (isOverdueAlert) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">At Risk</span>;
    return <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">On Track</span>;
  };

  const getStatusBadge = (f) => {
    if (f.isClosed) {
      if (f.outcome === 'negative') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-50 text-rose-700 border border-rose-250">Cancelled</span>;
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-250">Completed</span>;
    }
    if (isOverdue(f.dueDate, f.status)) return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-55 text-red-700 border border-red-100">Overdue</span>;
    if (isToday(f.dueDate)) return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-250">Today</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-250">Upcoming</span>;
  };

  const renderMemberAvatar = (assignedToId, nameFallback) => {
    const member = members.find(m => m.id === assignedToId);
    const name = member?.name || nameFallback || 'Unassigned';
    const initials = getInitials(name);

    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    const colorClass = colors[sum % colors.length];

    if (member?.avatarUrl) {
      return (
        <img src={member.avatarUrl} alt={name} className="w-7 h-7 rounded-full object-cover border border-slate-100" />
      );
    }
    return (
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${colorClass}`}>
        {initials}
      </div>
    );
  };

  const getMemberRole = (assignedToId) => {
    const member = members.find(m => m.id === assignedToId);
    return member?.designation || member?.role || 'Sales Executive';
  };

  // Outcome Quick Closures
  const openCloseOutcome = (followup) => {
    setClosingFollowup(followup);
  };

  return (
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-16">
      
      {/* 1. Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Follow-Up Management</h1>
          <p className="text-sm text-[#64748B] mt-0.5 font-semibold">
            {stats.total} Follow-ups &nbsp;·&nbsp; {stats.open} Open &nbsp;·&nbsp; {stats.overdue} Overdue
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="h-10 px-4 rounded-[12px] bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Follow-Up</span>
        </button>
      </div>

      {/* 2. Top KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { id: 'today', label: "Today's Follow-ups", value: stats.todayOpen, icon: Clock, color: 'bg-blue-50 text-blue-600', desc: 'due today' },
          { id: 'overdue', label: "Overdue Followups", value: stats.overdue, icon: AlertCircle, color: 'bg-rose-50 text-rose-600', desc: 'immediate triage' },
          { id: 'completed_today', label: "Completed Today", value: stats.completedToday, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', desc: 'actions resolved' },
          { id: 'upcoming_week', label: "Upcoming This Week", value: stats.upcomingWeek, icon: Calendar, color: 'bg-purple-50 text-purple-600', desc: '7-day pipeline' },
          { id: 'success_rate', label: "Success Rate", value: `${stats.successRate}%`, icon: TrendingUp, color: 'bg-teal-50 text-teal-600', desc: 'positive outcomes' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          const isActive = activeInsightFilter === stat.id;
          return (
            <button
              key={i}
              onClick={() => setActiveInsightFilter(isActive ? null : stat.id)}
              className={`text-left bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300 ${
                isActive ? 'ring-2 ring-blue-500 bg-blue-50/5' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center ${stat.color} shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider truncate">{stat.label}</p>
                <p className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight truncate">
                  {typeof stat.value === 'number' ? <CountUpNumber end={stat.value} /> : stat.value}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{stat.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Priority Action Center */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Priority Triage Workspace (Click category to isolate enquiries)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'hot',
              title: "🔥 Hot Opportunities",
              count: stats.hotCount,
              desc: "Enquiry score >= 80 or high heat levels",
              color: "border-orange-200 hover:border-orange-400 bg-orange-50/5",
              activeColor: "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20"
            },
            {
              id: 'overdue',
              title: "🔴 Overdue Followups",
              count: stats.overdueCount,
              desc: "Scheduled actions currently past due date",
              color: "border-rose-200 hover:border-rose-400 bg-rose-50/5",
              activeColor: "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20"
            },
            {
              id: 'high_value',
              title: "💰 High Value Deals",
              count: stats.highValueCount,
              desc: "Followups with estimated deal value >= Rs 50,000",
              color: "border-emerald-200 hover:border-emerald-400 bg-emerald-50/5",
              activeColor: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
            },
            {
              id: 'stuck',
              title: "⚠ Stuck Opportunities",
              count: stats.stuckCount,
              desc: "Rescheduled >= 3 times or age >= 30 days",
              color: "border-purple-200 hover:border-purple-400 bg-purple-50/5",
              activeColor: "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20"
            }
          ].map(widget => {
            const isActive = activeInsightFilter === widget.id;
            return (
              <button
                key={widget.id}
                onClick={() => setActiveInsightFilter(isActive ? null : widget.id)}
                className={`text-left border rounded-xl p-4 transition-all duration-200 ${isActive ? widget.activeColor : widget.color}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">{widget.title}</span>
                  {isActive && <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 uppercase">Active</span>}
                </div>
                <p className="text-3xl font-extrabold text-slate-900 mt-2">{widget.count}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">{widget.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Team Workload & Activity split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Workload */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-7 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Team Workload & Actions Performance</span>
          </h3>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 pb-2 text-slate-400 font-bold">
                  <th className="pb-2">Sales Executive</th>
                  <th className="pb-2 text-center">Pending Workload</th>
                  <th className="pb-2 text-center">Completed Today</th>
                  <th className="pb-2 text-center">Overdue Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {workloadStats.slice(0, 5).map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/40">
                    <td className="py-2.5 flex items-center gap-2">
                      {renderMemberAvatar(member.id, member.name)}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{member.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-0.5">{member.role}</p>
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-850">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${member.pending > 5 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {member.pending} active
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-bold text-emerald-600">
                      {member.completed > 0 ? `+${member.completed}` : '0'}
                    </td>
                    <td className="py-2.5 text-center font-extrabold">
                      <span className={member.overdue > 0 ? 'text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100' : 'text-slate-400'}>
                        {member.overdue} overdue
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Activity Timeline */}
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm lg:col-span-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Recent Activity Timeline</span>
          </h3>
          <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No completed activities logged today.</p>
            ) : (
              recentActivities.map(act => {
                const Icon = act.icon;
                const outcomeColors = {
                  positive: 'bg-green-500 text-white',
                  neutral: 'bg-amber-500 text-white',
                  negative: 'bg-rose-500 text-white'
                };
                return (
                  <div key={act.id} className="flex gap-3 text-xs">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 ${
                      act.outcome ? outcomeColors[act.outcome] || 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-650'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-slate-800 truncate">{act.company}</p>
                        <span className="text-[10px] text-slate-400">{formatDate(act.date)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                        {act.type} resolved by {act.by.split(' ')[0]}
                      </p>
                      {act.remarks && (
                        <p className="text-[10px] bg-slate-50 border border-slate-100 p-1.5 rounded mt-1 text-slate-600 truncate" title={act.remarks}>
                          {act.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Sticky Filter Toolbar */}
      <div className="sticky top-16 z-20 bg-white border border-[#E2E8F0] rounded-[16px] min-h-14 py-3 md:py-0 px-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search activities, accounts..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs bg-slate-50/30 font-medium text-slate-900"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Action Selectors */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30 cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30 cursor-pointer"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            {FOLLOWUP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30 cursor-pointer max-w-[120px]"
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
          >
            <option value="All">All reps</option>
            {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30 cursor-pointer"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <div className="flex items-center gap-1">
            <input
              type="date"
              className="h-9 px-1.5 rounded-lg border border-slate-200 focus:outline-none text-[10px] font-semibold text-slate-600 bg-slate-50/30"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              title="Next Action Start"
            />
            <span className="text-slate-350">-</span>
            <input
              type="date"
              className="h-9 px-1.5 rounded-lg border border-slate-200 focus:outline-none text-[10px] font-semibold text-slate-600 bg-slate-50/30"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              title="Next Action End"
            />
          </div>

          <select
            className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-xs font-semibold text-slate-650 bg-slate-50/30 cursor-pointer"
            value={`${sortConfig.key}_${sortConfig.direction}`}
            onChange={e => {
              const val = e.target.value;
              const idx = val.lastIndexOf('_');
              setSortConfig({ key: val.substring(0, idx), direction: val.substring(idx + 1) });
            }}
          >
            <option value="nextFollowupDate_asc">Activity (Soonest)</option>
            <option value="nextFollowupDate_desc">Activity (Latest)</option>
            <option value="leadScore_desc">Enquiry Score (High)</option>
            <option value="dealValue_desc">Deal Value (High)</option>
            <option value="followupAge_desc">Followup Age (Oldest)</option>
            <option value="companyName_asc">Company (A-Z)</option>
          </select>

          {/* Column toggler */}
          <div className="relative">
            <button
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="h-9 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100/50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>
            {showColumnToggle && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-30 space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Customizer</p>
                {Object.keys(visibleColumns).map(col => (
                  <label key={col} className="flex items-center gap-2 text-xs text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                      className="rounded accent-blue-600"
                    />
                    <span>{col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-205 shrink-0">
            {[
              { id: 'table', icon: LayoutGrid, label: 'Table' },
              { id: 'calendar', icon: Calendar, label: 'Calendar' },
            ].map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setView(option.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                    view === option.id
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Drawer */}
      {selectedFollowupIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 text-white rounded-2xl px-6 py-3 shadow-2xl flex flex-wrap items-center gap-5 transition-all duration-300 max-w-[95vw] sm:max-w-max">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-850">
            <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
              {selectedFollowupIds.length}
            </span>
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">Selected</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reassign:</span>
              <select
                className="bg-slate-800 text-xs font-semibold text-white px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer max-w-[110px]"
                value=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const member = members.find(m => m.id === val);
                  if (!member) return;
                  try {
                    await Promise.all(selectedFollowupIds.map(id => updateFollowup(id, { assignedTo: val, assignedToName: member.name })));
                    toast.success('Follow-ups reassigned successfully');
                    setSelectedFollowupIds([]);
                  } catch (err) {
                    toast.error('Reassign failed: ' + err.message);
                  }
                }}
              >
                <option value="">Select...</option>
                {activeMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Outcome:</span>
              <select
                className="bg-slate-800 text-xs font-semibold text-white px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                value=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  try {
                    await Promise.all(selectedFollowupIds.map(id => updateFollowup(id, { outcome: val, status: 'closed', closedAt: Timestamp.now() })));
                    toast.success('Follow-ups resolved');
                    setSelectedFollowupIds([]);
                  } catch (err) {
                    toast.error('Failed: ' + err.message);
                  }
                }}
              >
                <option value="">Select...</option>
                {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
              <select
                className="bg-slate-800 text-xs font-semibold text-white px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                value=""
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  try {
                    await Promise.all(selectedFollowupIds.map(id => updateFollowup(id, { status: val })));
                    toast.success('Statuses updated');
                    setSelectedFollowupIds([]);
                  } catch (err) {
                    toast.error('Failed: ' + err.message);
                  }
                }}
              >
                <option value="">Select...</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reschedule:</span>
              <input
                type="date"
                className="bg-slate-800 text-xs font-semibold text-white px-2 py-1 rounded-lg border border-slate-700 focus:outline-none cursor-pointer"
                onChange={async (e) => {
                  const val = e.target.value;
                  if (!val) return;
                  try {
                    await Promise.all(selectedFollowupIds.map(id => {
                      const item = followups.find(f => f.id === id);
                      return updateFollowup(id, {
                        nextFollowupDate: Timestamp.fromDate(new Date(val)),
                        rescheduleCount: ((item?.rescheduleCount || 0) + 1)
                      });
                    }));
                    toast.success('Rescheduled successfully');
                    setSelectedFollowupIds([]);
                  } catch (err) {
                    toast.error('Failed: ' + err.message);
                  }
                }}
              />
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <button
              onClick={() => {
                const selectedData = followups.filter(f => selectedFollowupIds.includes(f.id));
                const headers = ['Company', 'Contact Person', 'Phone', 'Type', 'Assigned', 'Status', 'Outcome', 'Deal Value', 'Score'];
                const rows = selectedData.map(f => [
                  f.companyName,
                  f.contactPerson || '',
                  f.contactPhone || '',
                  f.taskType || '',
                  f.assignedToName || '',
                  f.status || '',
                  f.outcome || '',
                  f.dealValue || f.amount || 0,
                  f.leadScore || 50
                ]);
                const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `followups_bulk_export.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Export completed');
                setSelectedFollowupIds([]);
              }}
              className="font-semibold text-slate-350 hover:text-white transition-colors"
            >
              Export
            </button>

            <button
              onClick={bulkDeleteFollowups}
              className="font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>

            <button onClick={() => setSelectedFollowupIds([])} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 6. Content Section */}
      {loading ? (
        view === 'calendar' ? <div className="card"><SkeletonCalendar /></div> : <SkeletonTable rows={7} cols={11} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="noData"
          title="No follow-up activity found"
          description={search || filterStatus !== 'All' || activeInsightFilter ? 'Try clearing your active filters or searches.' : 'Add your first CRM followup action to get started.'}
          actionLabel="New Follow-up"
          onAction={() => { setEditing(null); setShowModal(true); }}
        />
      ) : view === 'calendar' ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-6 shadow-sm">
          <CalendarView
            items={sorted}
            dateField="dueDate"
            onDayClick={(date, items) => {
              if (items.length > 0) {
                setSelectedDayInfo({ date, items });
              }
            }}
          />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left" data-export-table>
                <thead>
                  <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisibleFollowups}
                        className="rounded accent-blue-600"
                        title="Select visible"
                      />
                    </th>
                    {visibleColumns.company && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('companyName')}>Company</th>}
                    {visibleColumns.leadScore && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('leadScore')}>Enquiry Score</th>}
                    {visibleColumns.priority && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('priority')}>Priority</th>}
                    {visibleColumns.lastContact && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('createdAt')}>Last Contact</th>}
                    {visibleColumns.nextAction && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('nextFollowupDate')}>Next Action</th>}
                    {visibleColumns.dealValue && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('dealValue')}>Deal Value</th>}
                    {visibleColumns.followupAge && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('followupAge')}>Age</th>}
                    {visibleColumns.healthStatus && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider select-none">Health</th>}
                    {visibleColumns.status && <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSortClick('status')}>Status</th>}
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {sorted.map(f => {
                    const isOverdueAlert = isOverdue(f.dueDate, f.status);
                    const phone = (f.contactPhone || f.phone || '').replace(/\D/g, '');
                    const waLink = phone ? `https://wa.me/91${phone.length > 10 ? phone.slice(-10) : phone}` : null;
                    const telLink = f.contactPhone || f.phone ? `tel:${f.contactPhone || f.phone}` : null;
                    const mailLink = f.contactEmail || f.email ? `mailto:${f.contactEmail || f.email}` : null;
                    const age = getFollowupAge(f.createdAt);

                    return (
                      <tr key={f.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedFollowup(f)}>
                        <td className="p-4 text-center" onClick={ev => ev.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedFollowupSet.has(f.id)}
                            onChange={() => toggleFollowupSelection(f.id)}
                            className="rounded accent-blue-600 transition-all"
                            title="Select activity"
                          />
                        </td>
                        {visibleColumns.company && (
                          <td className="p-4 min-w-[200px]">
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{f.companyName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-450 font-semibold">
                                <span>{f.contactPerson || 'No contact'}</span>
                                {f.taskType && <span className="px-1 py-0.2 bg-slate-100 rounded text-[9px] text-[#64748B]">{f.taskType}</span>}
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.leadScore && <td className="p-4">{getLeadScoreBadge(f.leadScore, f.priority)}</td>}
                        {visibleColumns.priority && <td className="p-4">{getPriorityBadge(f.priority)}</td>}
                        {visibleColumns.lastContact && <td className="p-4 text-slate-500 font-medium text-xs">{formatDate(f.createdAt)}</td>}
                        {visibleColumns.nextAction && (
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold ${isOverdueAlert ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                                {formatDate(f.dueDate)}
                              </span>
                              {isOverdueAlert && <span className="text-[9px] text-rose-500 font-extrabold mt-0.5">Overdue {f.overdueDays}d</span>}
                            </div>
                          </td>
                        )}
                        {visibleColumns.dealValue && <td className="p-4 font-bold text-slate-900 text-xs">{formatCurrency(f.dealValue || f.amount || 0)}</td>}
                        {visibleColumns.followupAge && <td className="p-4 font-semibold text-slate-650 text-xs">{age === 0 ? 'Today' : age === 1 ? '1 day' : `${age} days`}</td>}
                        {visibleColumns.healthStatus && <td className="p-4">{getHealthStatus(f)}</td>}
                        {visibleColumns.status && <td className="p-4">{getStatusBadge(f)}</td>}

                        <td className="p-4 text-right" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Hover contact bar */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm rounded-lg px-2 py-1 mr-2">
                              {waLink && (
                                <a href={waLink} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="WhatsApp client">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {telLink && (
                                <a href={telLink} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Call client">
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {mailLink && (
                                <a href={mailLink} className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Email client">
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            <button onClick={() => setSelectedFollowup(f)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all" title="View Details">
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {!f.isClosed && (
                              <>
                                <button
                                  onClick={() => openCloseOutcome(f)}
                                  className="text-xs text-emerald-600 font-bold px-2 py-1 border border-emerald-100 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Resolve followup outcome"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => openReschedule(f)}
                                  className="text-xs text-amber-600 font-bold px-2 py-1 border border-amber-100 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Change date targets"
                                >
                                  Reschedule
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => { setEditing(f); setShowModal(true); }}
                              className="text-xs text-blue-600 font-bold px-2 py-1 border border-blue-100 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <DeleteButton onClick={() => deleteFollowupRecord(f.id)} showLabel={false} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {sorted.map(e => {
              const score = e.leadScore !== undefined ? Number(e.leadScore) : (e.priority === 'critical' || e.priority === 'high' ? 85 : 55);
              const isOverdueAlert = isOverdue(e.dueDate, e.status);
              const phone = (e.contactPhone || e.phone || '').replace(/\D/g, '');
              const waLink = phone ? `https://wa.me/91${phone.length > 10 ? phone.slice(-10) : phone}` : null;
              const telLink = e.contactPhone || e.phone ? `tel:${e.contactPhone || e.phone}` : null;

              return (
                <div
                  key={e.id}
                  className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3 cursor-pointer hover:border-blue-100"
                  onClick={() => setSelectedFollowup(e)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 break-words leading-tight">{e.companyName}</p>
                      <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">
                        {e.contactPerson ? `${e.contactPerson} · ` : ''}{e.contactPhone || 'No phone'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {getStatusBadge(e)}
                      {isOverdueAlert && <span className="text-[9px] text-rose-500 font-extrabold uppercase bg-rose-55 border border-rose-100 px-1.5 py-0.2 rounded-full">Overdue {e.overdueDays}d</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Score</span>
                      <div className="mt-1 flex items-center gap-1.5">
                        {getLeadScoreBadge(score, e.priority)}
                        {getHealthStatus(e)}
                      </div>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Priority</span>
                      <div className="mt-1">{getPriorityBadge(e.priority)}</div>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Value</span>
                      <span className="font-bold text-slate-700 block mt-1">{formatCurrency(e.dealValue || e.amount || 0)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-bold tracking-wider">Next Action</span>
                      <span className="font-bold text-slate-700 block mt-1">{formatDate(e.dueDate)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3" onClick={ev => ev.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFollowupSet.has(e.id)}
                        onChange={() => toggleFollowupSelection(e.id)}
                        className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                        title="Select enquiry"
                      />
                      <span className="text-xs font-bold text-slate-400">Select</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {waLink && (
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-100 rounded-lg">
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      )}
                      {telLink && (
                        <a href={telLink} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 rounded-lg">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => setSelectedFollowup(e)} className="p-2 rounded-lg border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {!e.isClosed && (
                        <>
                          <button onClick={() => openCloseOutcome(e)} className="text-xs text-emerald-600 border border-emerald-100 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg font-bold">
                            Complete
                          </button>
                        </>
                      )}
                      <DeleteButton onClick={() => deleteFollowupRecord(e.id)} showLabel={false} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <FollowupModal
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSubmit={editing ? handleEdit : handleAdd}
          members={activeMembers}
          editing={editing}
        />
      )}

      {rescheduleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRescheduleItem(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 scale-in">
            <h2 className="text-base font-bold text-slate-900 mb-1">Reschedule Follow-Up</h2>
            <p className="text-xs text-slate-500 font-semibold mb-4">{rescheduleItem.companyName}</p>
            
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">New Follow-up Date</label>
            <input
              type="date"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 text-sm font-semibold mb-5 bg-slate-50/20"
              value={newRescheduleDate}
              onChange={e => setNewRescheduleDate(e.target.value)}
            />
            
            <div className="flex gap-3">
              <button onClick={() => setRescheduleItem(null)} className="h-10 flex-1 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100/50 transition-colors">Cancel</button>
              <button
                onClick={handleReschedule}
                disabled={rescheduleSaving || !newRescheduleDate}
                className="h-10 flex-1 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                {rescheduleSaving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDayInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedDayInfo(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col border border-slate-100 max-h-[80vh] scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Actions on {selectedDayInfo.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </h3>
              <button onClick={() => setSelectedDayInfo(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {selectedDayInfo.items.map(f => (
                <div key={f.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 hover:border-blue-250 transition-all flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{f.companyName}</p>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">{f.contactPerson ? `${f.contactPerson} | ` : ''}{f.contactPhone || 'No phone'}</p>
                    </div>
                    {getStatusBadge(f)}
                  </div>
                  <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100 mt-1 whitespace-pre-wrap">{f.description || 'No description'}</p>
                  
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                    <button onClick={() => { setSelectedFollowup(f); setSelectedDayInfo(null); }} className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-slate-600" title="View details">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {!f.isClosed && (
                      <button onClick={() => { openCloseOutcome(f); setSelectedDayInfo(null); }} className="text-xs text-emerald-600 border border-emerald-100 hover:bg-emerald-50 px-2 py-1 rounded font-bold">
                        Complete
                      </button>
                    )}
                    <button onClick={() => { setEditing(f); setShowModal(true); setSelectedDayInfo(null); }} className="text-xs text-blue-600 border border-blue-100 hover:bg-blue-50 px-2 py-1 rounded font-bold">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {closingFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setClosingFollowup(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 scale-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Close Follow-Up Activity</h3>
            <p className="text-xs text-slate-500 font-semibold mb-4">Select outcome for <strong>{closingFollowup.companyName}</strong>:</p>

            <div className="flex flex-col gap-2 mb-6">
              {OUTCOMES.map(o => {
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    onClick={async () => {
                      try {
                        await updateFollowup(closingFollowup.id, {
                          status: 'closed',
                          outcome: o.value,
                          closedAt: Timestamp.now(),
                          updatedAt: Timestamp.now(),
                        });
                        toast.success('Activity follow-up completed!');
                        setClosingFollowup(null);
                      } catch (err) {
                        toast.error('Failed to close: ' + err.message);
                      }
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50/50 hover:border-blue-500 hover:bg-blue-50/10 transition-all text-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{o.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                );
              })}
            </div>

            <button onClick={() => setClosingFollowup(null)} className="h-10 w-full rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-100/50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {selectedFollowup && (
        <FollowupDetailPanel
          followup={selectedFollowup}
          onClose={() => setSelectedFollowup(null)}
          onSaveNotes={handleSaveNotes}
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

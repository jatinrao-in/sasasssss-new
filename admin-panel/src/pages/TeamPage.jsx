import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Users,
  UserRoundCog,
  X,
  Briefcase,
  CheckCircle2,
  XCircle,
  Crown,
  RefreshCw,
  Copy,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  createTeamMember as createMemberApi,
  updateTeamMember as updateMemberApi,
  deleteTeamMember as deleteMemberApi,
} from '../lib/backendApi';
import useAuditLog from '../hooks/useAuditLog';
import { useTeam } from '../hooks/useTeam';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import { useAuth } from '../hooks/useAuth';
import { notifyWelcome } from '../lib/notify';
import { COLLECTIONS, updateDocumentRef } from '../lib/firestore-helpers';
import { SkeletonCards } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import UserAvatar from '../components/UserAvatar';
import CountUpNumber from '../components/ui/CountUpNumber';
import {
  USER_ROLE_OPTIONS,
  getAllPageKeys,
  getPageOptions,
  normalizeRole,
  sanitizePermissions,
} from '../lib/accessControl';

const FILTER_STATUSES = ['All', 'Active', 'Inactive'];
const FILTER_ROLES = ['All', 'Admins', 'Members'];

const createFormState = (editing, mainAdminUid) => {
  const isMainAdmin = Boolean(editing?.id) && editing.id === mainAdminUid;
  const role = isMainAdmin ? 'admin' : normalizeRole(editing?.role);
  return {
    name: editing?.name || '',
    email: editing?.email || '',
    password: '',
    phone: editing?.phone || '',
    whatsapp: editing?.whatsapp || '',
    designation: editing?.designation || '',
    role,
    permissions: isMainAdmin
      ? getAllPageKeys('admin')
      : editing
      ? sanitizePermissions(role, editing.permissions)
      : getAllPageKeys('member'),
    status: isMainAdmin ? 'active' : editing?.status || 'active',
  };
};

function AccountModal({ editing, mainAdminUid, onClose, onSave }) {
  const isMainAdmin = Boolean(editing?.id) && editing.id === mainAdminUid;
  const [form, setForm] = useState(() => createFormState(editing, mainAdminUid));
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(createFormState(editing, mainAdminUid));
    setError('');
    setShowPassword(false);
  }, [editing, mainAdminUid]);

  const pageOptions = useMemo(() => getPageOptions(form.role), [form.role]);

  const handleRoleChange = (nextRole) => {
    if (isMainAdmin) return;
    setForm((prev) => ({
      ...prev,
      role: nextRole,
      permissions: nextRole === 'admin'
        ? ['dashboard','projects','enquiry','followups','payments','outgoing_payments','rgp','salary','tools','team','settings']
        : ['dashboard','tasks','enquiry','followups','payments','rgp','profile'],
      status: nextRole === 'admin' && prev.status !== 'inactive' ? 'active' : prev.status,
    }));
  };

  const togglePermission = (pageKey) => {
    if (isMainAdmin) return;
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(pageKey)
        ? prev.permissions.filter((p) => p !== pageKey)
        : [...prev.permissions, pageKey],
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!form.phone.toString().trim()) return 'Phone number is required.';
    if (!form.whatsapp.toString().trim()) return 'WhatsApp number is required.';
    if (!form.designation.trim()) return 'Designation is required.';
    if (!editing && !form.password) return 'Password is required for new accounts.';
    if (form.password && form.password.length < 8) return 'Password must be at least 8 characters.';
    return '';
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'Failed to save account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-6 py-5 bg-gradient-to-r from-teal-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center">
              {editing ? <UserRoundCog className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Account' : 'Add Team Member'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {editing ? `Editing ${editing.name}` : 'Create a new account with role & permissions'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {isMainAdmin && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <Crown className="w-4 h-4 flex-shrink-0" />
              Main admin — role, permissions, and status are locked to full admin access.
            </div>
          )}

          {/* Basic Info */}
          <div>
            <p className="label mb-3 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Basic Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input-field" placeholder="Enter full name" value={form.name}
                  autoComplete="new-name"
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input-field" type="email" placeholder="email@company.com" value={form.email}
                  autoComplete="new-email"
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">{editing ? 'New Password' : 'Password *'}</label>
                <div className="relative">
                  <input className="input-field pr-11"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editing ? 'Leave blank to keep current' : 'Min 8 characters'}
                    value={form.password} minLength={8}
                    autoComplete="new-password"
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Designation *</label>
                <input className="input-field" placeholder="e.g. Site Engineer" value={form.designation}
                  autoComplete="off"
                  onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input-field" type="tel" placeholder="Phone number" value={form.phone}
                  autoComplete="new-phone"
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">WhatsApp *</label>
                <input className="input-field" type="tel" placeholder="WhatsApp number" value={form.whatsapp}
                  autoComplete="new-whatsapp"
                  onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <p className="label mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Select Role</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {USER_ROLE_OPTIONS.map((option) => {
                const active = form.role === option.value;
                return (
                  <button key={option.value} type="button" disabled={isMainAdmin}
                    onClick={() => handleRoleChange(option.value)}
                    className={`rounded-2xl border px-4 py-3.5 text-left transition-all ${
                      active ? 'border-teal-400 bg-teal-50 shadow-sm ring-1 ring-teal-200' : 'border-[var(--border-primary)] hover:border-teal-200'
                    } ${isMainAdmin ? 'cursor-not-allowed opacity-70' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-teal-600' : 'border-gray-300'}`}>
                        {active && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{option.label}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{option.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="label mb-0 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  {form.role === 'admin' ? 'Admin Panel Access' : 'PWA Page Access'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {form.permissions.length} of {pageOptions.length} pages enabled
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={isMainAdmin}
                  onClick={() => setForm((p) => ({ ...p, permissions: getAllPageKeys(p.role) }))}
                  className="rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-teal-200 hover:text-teal-700 disabled:opacity-50">
                  All
                </button>
                <button type="button" disabled={isMainAdmin}
                  onClick={() => setForm((p) => ({ ...p, permissions: [] }))}
                  className="rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-red-200 hover:text-red-600 disabled:opacity-50">
                  None
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              {pageOptions.map((page) => {
                const checked = form.permissions.includes(page.key);
                return (
                  <label key={page.key}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                      isMainAdmin ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${checked ? 'border-teal-200 bg-teal-50' : 'border-transparent hover:border-teal-100 hover:bg-white/70'}`}>
                    <input type="checkbox" checked={checked} disabled={isMainAdmin}
                      onChange={() => togglePermission(page.key)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{page.label}</p>
                      {page.description && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{page.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="label mb-3">Account Status</p>
            <div className="inline-flex rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
              {['active', 'inactive'].map((status) => {
                const active = form.status === status;
                return (
                  <button key={status} type="button" disabled={isMainAdmin}
                    onClick={() => setForm((p) => ({ ...p, status }))}
                    className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                      active
                        ? status === 'active'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-700 text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    } ${isMainAdmin ? 'cursor-not-allowed opacity-70' : ''}`}>
                    {status === 'active' ? '✓ Active' : '✗ Inactive'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-[var(--border-primary)] px-6 py-4 bg-gray-50/50">
          <button onClick={onClose} className="btn-secondary w-full sm:w-auto justify-center">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="btn-primary w-full sm:w-auto justify-center disabled:opacity-60">
            {saving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
            ) : editing ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Member card component
function MemberCard({ member, isMainAdmin, onEdit, onToggleStatus, onDelete, taskCount }) {
  const normalizedRole = normalizeRole(member.role);
  const permissions = isMainAdmin
    ? getAllPageKeys('admin')
    : sanitizePermissions(normalizedRole, member.permissions);
  const isActive = member.status === 'active' || isMainAdmin;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className={`card p-0 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${!isActive ? 'opacity-70' : ''}`}>
      {/* Card top gradient strip */}
      <div className={`h-1.5 w-full ${isMainAdmin ? 'bg-gradient-to-r from-amber-400 to-orange-400' : normalizedRole === 'admin' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-teal-500 to-emerald-400'}`} />

      <div className="p-4 sm:p-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar user={member} size={46} showRing={isActive} />
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate leading-tight">{member.name}</h3>
              <p className="text-xs text-teal-600 font-medium truncate mt-0.5">{member.designation || 'No designation'}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`badge text-[10px] py-0.5 ${isMainAdmin ? 'badge-yellow' : normalizedRole === 'admin' ? 'badge-blue' : 'badge-teal'}`}>
              {isMainAdmin ? '👑 Main Admin' : normalizedRole === 'admin' ? 'Admin' : 'Member'}
            </span>
            <span className={`badge text-[10px] py-0.5 ${isActive ? 'badge-green' : 'badge-gray'}`}>
              {isActive ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5 border-t border-gray-50 pt-3 mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 group">
            <Mail className="h-3.5 w-3.5 shrink-0 text-teal-400" />
            <span className="truncate flex-1">{member.email}</span>
            <button onClick={() => copyToClipboard(member.email)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100" title="Copy email">
              <Copy className="w-3 h-3 text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="h-3.5 w-3.5 shrink-0 text-teal-400" />
            <span>{member.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-3.5 w-3.5 shrink-0 text-teal-400" />
            <span><strong className="text-gray-700">{permissions.length}</strong> pages &nbsp;·&nbsp; <strong className="text-gray-700">{taskCount}</strong> tasks assigned</span>
          </div>
        </div>

        {/* Permission tags */}
        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[26px]">
          {permissions.slice(0, 4).map((perm) => (
            <span key={`${member.id}-${perm}`}
              className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-primary)] capitalize">
              {perm.replace(/_/g, ' ')}
            </span>
          ))}
          {permissions.length > 4 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              +{permissions.length - 4} more
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-3">
          <button onClick={onEdit}
            className="rounded-xl bg-teal-50 px-3 py-2.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 active:bg-teal-200 transition-colors flex items-center justify-center gap-1.5">
            ✏️ Edit
          </button>
          <button onClick={onToggleStatus} disabled={isMainAdmin}
            className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              isMainAdmin
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}>
            {isActive ? '🔒 Deactivate' : '✅ Activate'}
          </button>
        </div>
        {!isMainAdmin && (
          <div className="mt-2 flex justify-end">
            <DeleteButton onClick={onDelete} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const toast = useToast();
  const { mainAdminUid, isGhostAdmin } = useAuth();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { log } = useAuditLog();
  const { members, loading, deleteMember } = useTeam({ includeAdmins: true });
  const { tasks } = useTasks();

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [search, setSearch] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Stats
  const accountStats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.status === 'active' || m.id === mainAdminUid).length,
    admins: members.filter((m) => normalizeRole(m.role) === 'admin').length,
    teamMembers: members.filter((m) => normalizeRole(m.role) === 'member').length,
  }), [members, mainAdminUid]);

  // Task count per member id
  const taskCountByMemberId = useMemo(() => {
    const map = {};
    tasks.forEach((t) => { if (t.assignedTo) map[t.assignedTo] = (map[t.assignedTo] || 0) + 1; });
    return map;
  }, [tasks]);

  // Performance chart data
  const performanceData = useMemo(() => {
    const assignableMembers = members.filter((m) => normalizeRole(m.role) === 'member');
    const taskMap = {};
    assignableMembers.forEach((m) => { taskMap[m.name] = { completed: 0, pending: 0 }; });
    tasks.forEach((task) => {
      const name = task.assignedToName;
      if (!name || !taskMap[name]) return;
      if (task.status === 'done' || task.status === 'completed') taskMap[name].completed += 1;
      else taskMap[name].pending += 1;
    });
    return Object.keys(taskMap)
      .map((name) => ({
        name: name.split(' ')[0],
        Completed: taskMap[name].completed,
        Pending: taskMap[name].pending,
        total: taskMap[name].completed + taskMap[name].pending,
      }))
      .filter((e) => e.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [members, tasks]);

  // Filtered list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q
        || member.name?.toLowerCase().includes(q)
        || member.email?.toLowerCase().includes(q)
        || member.designation?.toLowerCase().includes(q)
        || member.phone?.toString().includes(q);
      const matchesStatus = filterStatus === 'All'
        || (filterStatus === 'Active' && (member.status === 'active' || member.id === mainAdminUid))
        || (filterStatus === 'Inactive' && member.status === 'inactive' && member.id !== mainAdminUid);
      const matchesRole = filterRole === 'All'
        || (filterRole === 'Admins' && normalizeRole(member.role) === 'admin')
        || (filterRole === 'Members' && normalizeRole(member.role) === 'member');
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [filterRole, filterStatus, members, search, mainAdminUid]);

  const openCreateModal = () => { setEditingMember(null); setShowModal(true); };
  const openEditModal = (member) => { setEditingMember(member); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingMember(null); };

  const handleSaveAccount = async (form) => {
    if (editingMember) {
      await updateMemberApi({
        uid: editingMember.id,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        phone: form.phone.toString().trim(),
        whatsapp: form.whatsapp.toString().trim(),
        designation: form.designation.trim(),
        role: form.role,
        permissions: form.permissions,
        status: form.status,
      });
      await log('member_updated', { memberUid: editingMember.id, role: form.role, status: form.status });
      toast.success(`${form.name} updated successfully.`);
      return;
    }

    await createMemberApi({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password.trim(),
      phone: form.phone.toString().trim(),
      whatsapp: form.whatsapp.toString().trim(),
      designation: form.designation.trim(),
      role: form.role,
      permissions: form.permissions,
      status: form.status,
    });
    await log('member_created', { memberEmail: form.email, memberName: form.name, role: form.role });
    notifyWelcome(form);
    toast.success(
      form.role === 'admin'
        ? `${form.name} can now log in to the admin panel.`
        : `${form.name} can now log in to the Team Member PWA.`,
    );
  };

  const handleToggleStatus = async (member) => {
    if (member.id === mainAdminUid) { toast.error('Main admin cannot be deactivated.'); return; }
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    try {
      await updateMemberApi({ uid: member.id, status: nextStatus });
      toast.success(`${member.name} is now ${nextStatus}.`);
    } catch (error) {
      toast.error(error.message || 'Failed to update account status.');
    }
  };

  const handleDeleteMember = (member) => {
    if (member.id === mainAdminUid) { toast.error('Main admin cannot be deleted.'); return; }
    confirmDelete({
      title: `Delete ${normalizeRole(member.role) === 'admin' ? 'Admin Account' : 'Team Member'}`,
      description: `Permanently delete "${member.name}"? Their email cannot be reused. Tasks will become unassigned. This cannot be undone.`,
      onConfirm: async () => {
        const taskSnapshot = await getDocs(
          query(collection(db, COLLECTIONS.tasks), where('assignedTo', '==', member.id)),
        );
        await Promise.all(
          taskSnapshot.docs.map((taskDoc) =>
            updateDocumentRef(taskDoc.ref, { assignedTo: '', assignedToName: '' },
              { action: 'unassign member tasks', collectionName: COLLECTIONS.tasks })
          )
        );
        await deleteMemberApi(member.id);
        await log('member_deleted', { memberUid: member.id, memberName: member.name, reassignedTaskCount: taskSnapshot.docs.length });
        toast.success(`${member.name} deleted permanently.`);
      },
    });
  };

  const statCards = [
    { label: 'Total Accounts', value: accountStats.total, icon: Users, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', border: 'border-l-teal-400' },
    { label: 'Active Accounts', value: accountStats.active, icon: ShieldCheck, iconBg: 'bg-green-50', iconColor: 'text-green-600', border: 'border-l-green-400' },
    { label: 'Admins', value: accountStats.admins, icon: UserRoundCog, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', border: 'border-l-blue-400' },
    { label: 'Team Members', value: accountStats.teamMembers, icon: Users, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', border: 'border-l-purple-400' },
  ];

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Access Control</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {filteredMembers.length} of {members.length} members shown — manage roles, permissions & status
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`card flex items-center gap-3 p-4 border-l-4 ${stat.border}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide truncate">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  <CountUpNumber end={stat.value} />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 w-full"
              placeholder="Search by name, email, phone or designation…" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role filter */}
            <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
              {FILTER_ROLES.map((role) => (
                <button key={role} onClick={() => setFilterRole(role)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    filterRole === role ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {role}
                </button>
              ))}
            </div>
            {/* Status filter */}
            <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
              {FILTER_STATUSES.map((status) => (
                <button key={status} onClick={() => setFilterStatus(status)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    filterStatus === status ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {status}
                </button>
              ))}
            </div>
            {/* Performance toggle */}
            <button onClick={() => setShowAnalytics((v) => !v)}
              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                showAnalytics ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-[var(--border-primary)] text-gray-600 hover:border-teal-200 hover:text-teal-700'
              }`}>
              <BarChart3 className="h-3.5 w-3.5" /> Performance
            </button>
          </div>
        </div>

        {/* Analytics chart */}
        {showAnalytics && performanceData.length > 0 && (
          <div className="rounded-2xl border border-[var(--border-primary)] p-4">
            <h3 className="mb-4 text-sm font-bold text-gray-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-500" /> Task Performance — Top Members
            </h3>
            <div className="overflow-x-auto">
              <div style={{ minWidth: '320px' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={performanceData} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        {showAnalytics && performanceData.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
            No task data yet to display performance chart.
          </div>
        )}
      </div>

      {/* Member Grid */}
      {loading ? (
        <SkeletonCards count={4} />
      ) : filteredMembers.length === 0 ? (
        <EmptyState icon="noData" title="No accounts found"
          description="Try a different filter or search term, or add a new team member."
          actionLabel="Add Member" onAction={openCreateModal} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isMainAdmin={member.id === mainAdminUid}
              taskCount={taskCountByMemberId[member.id] || 0}
              onEdit={() => openEditModal(member)}
              onToggleStatus={() => handleToggleStatus(member)}
              onDelete={() => handleDeleteMember(member)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AccountModal
          editing={editingMember}
          mainAdminUid={mainAdminUid}
          onClose={closeModal}
          onSave={handleSaveAccount}
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

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
import { COLLECTIONS, updateDocumentRef } from '../lib/firestore-helpers';
import { SkeletonCards } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import DeleteButton from '../components/DeleteButton';
import UserAvatar from '../components/UserAvatar';
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
    if (isMainAdmin) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      role: nextRole,
      permissions: nextRole === 'admin'
        ? [
            'dashboard', 'projects', 
            'enquiry', 'followups',
            'payments', 'outgoing_payments',
            'rgp', 'salary', 'tools',
            'team', 'settings', 'whatsapp'
          ]
        : [
            'dashboard', 'tasks',
            'enquiry', 'followups',
            'payments', 'rgp', 'profile'
          ],
      status: nextRole === 'admin' && prev.status !== 'inactive' ? 'active' : prev.status,
    }));
  };

  const togglePermission = (pageKey) => {
    if (isMainAdmin) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(pageKey)
        ? prev.permissions.filter((permission) => permission !== pageKey)
        : [...prev.permissions, pageKey],
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Full name is required.';
    }

    if (!form.email.trim()) {
      return 'Email is required.';
    }

    if (!form.phone.toString().trim()) {
      return 'Phone number is required.';
    }

    if (!form.whatsapp.toString().trim()) {
      return 'WhatsApp number is required.';
    }

    if (!form.designation.trim()) {
      return 'Designation is required.';
    }

    if (!editing && !form.password) {
      return 'Password is required for new accounts.';
    }

    if (form.password && form.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    return '';
  };

  const handleSubmit = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[var(--bg-card)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {editing ? 'Edit Account' : 'Add Team Member'}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Manage role, page access, and status from one place.
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {isMainAdmin && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This is the main admin account. Role, permissions, and status are locked to full admin access.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input-field"
                placeholder="Enter full name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input-field"
                type="email"
                placeholder="email@company.com"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input-field pr-11"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editing ? 'Leave blank to keep current password' : 'Set login password'}
                  value={form.password}
                  minLength={8}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Minimum 8 characters.
              </p>
            </div>

            <div>
              <label className="label">Designation</label>
              <input
                className="input-field"
                placeholder="e.g. Site Engineer"
                value={form.designation}
                onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value }))}
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                className="input-field"
                type="tel"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </div>

            <div>
              <label className="label">WhatsApp Number</label>
              <input
                className="input-field"
                type="tel"
                placeholder="Enter WhatsApp number"
                value={form.whatsapp}
                onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <p className="label mb-2">Select Role</p>
            <div className="grid grid-cols-2 gap-3">
              {USER_ROLE_OPTIONS.map((option) => {
                const active = form.role === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isMainAdmin}
                    onClick={() => handleRoleChange(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      active
                        ? 'border-teal-300 bg-teal-50 shadow-sm'
                        : 'border-[var(--border-primary)] bg-[var(--bg-card)] hover:border-teal-200'
                    } ${isMainAdmin ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-4 w-4 rounded-full border ${active ? 'border-teal-600' : 'border-gray-300'}`}>
                        <div className={`m-[3px] h-2 w-2 rounded-full ${active ? 'bg-teal-600' : 'bg-transparent'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{option.label}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{option.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="label mb-0">
                  {form.role === 'admin' ? 'Admin Panel Page Access' : 'PWA Page Access'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {form.role === 'admin'
                    ? 'Choose which admin pages this account can open.'
                    : 'Choose which PWA pages this account can open.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, permissions: getAllPageKeys(prev.role) }))}
                  disabled={isMainAdmin}
                  className="rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, permissions: [] }))}
                  disabled={isMainAdmin}
                  className="rounded-lg border border-[var(--border-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              {pageOptions.map((page) => (
                <label key={page.key} className={`flex items-start gap-3 rounded-xl border border-transparent px-3 py-2 ${isMainAdmin ? 'cursor-not-allowed' : 'cursor-pointer hover:border-teal-100 hover:bg-white/70'}`}>
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(page.key)}
                    disabled={isMainAdmin}
                    onChange={() => togglePermission(page.key)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{page.label}</p>
                    {page.description && (
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{page.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="label mb-2">Status</p>
            <div className="inline-flex rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
              {['active', 'inactive'].map((status) => {
                const active = form.status === status;

                return (
                  <button
                    key={status}
                    type="button"
                    disabled={isMainAdmin}
                    onClick={() => setForm((prev) => ({ ...prev, status }))}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? status === 'active'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    } ${isMainAdmin ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    {status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-primary)] px-6 py-4">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
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

  const accountStats = useMemo(() => ({
    total: members.length,
    active: members.filter((member) => member.status === 'active').length,
    admins: members.filter((member) => normalizeRole(member.role) === 'admin').length,
    teamMembers: members.filter((member) => normalizeRole(member.role) === 'member').length,
  }), [members]);

  const performanceData = useMemo(() => {
    const assignableMembers = members.filter((member) => normalizeRole(member.role) === 'member');
    const taskMap = {};

    assignableMembers.forEach((member) => {
      taskMap[member.name] = { completed: 0, pending: 0 };
    });

    tasks.forEach((task) => {
      const name = task.assignedToName;

      if (!name || !taskMap[name]) {
        return;
      }

      if (task.status === 'done' || task.status === 'completed') {
        taskMap[name].completed += 1;
      } else {
        taskMap[name].pending += 1;
      }
    });

    return Object.keys(taskMap)
      .map((name) => ({
        name: name.split(' ')[0],
        Completed: taskMap[name].completed,
        Pending: taskMap[name].pending,
        total: taskMap[name].completed + taskMap[name].pending,
      }))
      .filter((entry) => entry.total > 0)
      .sort((firstEntry, secondEntry) => secondEntry.total - firstEntry.total)
      .slice(0, 6);
  }, [members, tasks]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch = !normalizedSearch
        || member.name?.toLowerCase().includes(normalizedSearch)
        || member.email?.toLowerCase().includes(normalizedSearch)
        || member.designation?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = filterStatus === 'All' || member.status === filterStatus.toLowerCase();
      const matchesRole = filterRole === 'All'
        || (filterRole === 'Admins' && normalizeRole(member.role) === 'admin')
        || (filterRole === 'Members' && normalizeRole(member.role) === 'member');

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [filterRole, filterStatus, members, search]);

  const openCreateModal = () => {
    setEditingMember(null);
    setShowModal(true);
  };

  const openEditModal = (member) => {
    setEditingMember(member);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMember(null);
  };

  const handleSaveAccount = async (form) => {
    if (editingMember) {
      const payload = {
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
      };

      await updateMemberApi(payload);
      await log('member_updated', {
        memberUid: editingMember.id,
        role: form.role,
        status: form.status,
        permissions: form.permissions,
      });
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

    await log('member_created', {
      memberEmail: form.email,
      memberName: form.name,
      designation: form.designation || '',
      role: form.role,
      permissions: form.permissions || [],
    });

    toast.success(
      form.role === 'admin'
        ? `${form.name} can now log in to the admin panel.`
        : `${form.name} can now log in to the Team Member PWA.`,
    );
  };

  const handleToggleStatus = async (member) => {
    if (member.id === mainAdminUid) {
      toast.error('Main admin cannot be deactivated.');
      return;
    }

    const nextStatus = member.status === 'active' ? 'inactive' : 'active';

    try {
      await updateMemberApi({
        uid: member.id,
        status: nextStatus,
      });
      toast.success(`${member.name} is now ${nextStatus}.`);
    } catch (error) {
      toast.error(error.message || 'Failed to update account status.');
    }
  };

  const handleDeleteMember = (member) => {
    if (member.id === mainAdminUid) {
      toast.error('Main admin cannot be deleted.');
      return;
    }

    confirmDelete({
      title: `Delete ${normalizeRole(member.role) === 'admin' ? 'Admin Account' : 'Team Member'}`,
      description: `Permanently delete "${member.name}"? Their email cannot be reused. This removes them from Firebase Auth AND Firestore. Their assigned tasks will become unassigned. This cannot be undone.`,
      onConfirm: async () => {
        // Unassign all tasks first
        const taskSnapshot = await getDocs(
          query(collection(db, COLLECTIONS.tasks), where('assignedTo', '==', member.id)),
        );

        await Promise.all(taskSnapshot.docs.map((taskDoc) => updateDocumentRef(
          taskDoc.ref,
          { assignedTo: '', assignedToName: '' },
          { action: 'unassign member tasks', collectionName: COLLECTIONS.tasks },
        )));

        // Delete from Firebase Auth + Firestore via backend API
        await deleteMemberApi(member.id);

        await log('member_deleted', {
          memberUid: member.id,
          memberName: member.name,
          reassignedTaskCount: taskSnapshot.docs.length,
        });
        toast.success(`${member.name} deleted permanently.`);
      },
    });
  };

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Access Control</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Create member and admin accounts, then control exactly which pages each one can open.
          </p>
        </div>
        {!isGhostAdmin && (
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
            <Users className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Accounts</p>
            <p className="text-xl font-bold text-gray-900">{accountStats.total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <ShieldCheck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Active Accounts</p>
            <p className="text-xl font-bold text-gray-900">{accountStats.active}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <UserRoundCog className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Admins</p>
            <p className="text-xl font-bold text-gray-900">{accountStats.admins}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Team Members</p>
            <p className="text-xl font-bold text-gray-900">{accountStats.teamMembers}</p>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[280px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field pl-10"
              placeholder="Search by name, email, or designation"
            />
          </div>

          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            {FILTER_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  filterRole === role
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
            {FILTER_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAnalytics((value) => !value)}
            className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition-colors ${
              showAnalytics
                ? 'border-teal-200 bg-teal-50 text-teal-700'
                : 'border-[var(--border-primary)] bg-white text-gray-600 hover:border-teal-200 hover:text-teal-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Performance
          </button>
        </div>

        {showAnalytics && performanceData.length > 0 && (
          <div className="rounded-2xl border border-[var(--border-primary)] p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Task Performance (Top Members)</h3>
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
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          icon="noData"
          title="No accounts found"
          description="Try a different filter or add a new team member."
          actionLabel="Add Member"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const normalizedRole = normalizeRole(member.role);
            const isMainAdmin = member.id === mainAdminUid;
            const permissions = isMainAdmin
              ? getAllPageKeys('admin')
              : sanitizePermissions(normalizedRole, member.permissions);

            return (
              <div
                key={member.id}
                className={`card stat-card group transition-all duration-200 hover:shadow-md ${
                  member.status === 'inactive' && !isMainAdmin ? 'opacity-70' : ''
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <UserAvatar user={member} size={48} />
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className={`badge ${isMainAdmin ? 'badge-yellow' : normalizedRole === 'admin' ? 'badge-blue' : 'badge-teal'}`}>
                      {isMainAdmin ? 'Main Admin' : normalizedRole === 'admin' ? 'Admin' : 'Member'}
                    </span>
                    <span className={`badge ${member.status === 'active' || isMainAdmin ? 'badge-green' : 'badge-gray'}`}>
                      {isMainAdmin ? 'active' : member.status}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="mt-0.5 text-xs font-medium text-teal-600">{member.designation || 'No designation set'}</p>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail className="h-3.5 w-3.5 text-gray-300" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone className="h-3.5 w-3.5 text-gray-300" />
                    <span>{member.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Shield className="h-3.5 w-3.5 text-gray-300" />
                    <span>{permissions.length} page access</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {permissions.slice(0, 4).map((permission) => (
                    <span key={`${member.id}-${permission}`} className="rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-primary)]">
                      {permission.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {permissions.length > 4 && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
                      +{permissions.length - 4} more
                    </span>
                  )}
                </div>

                {!isGhostAdmin && (
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-50 pt-4">
                    <button
                      onClick={() => openEditModal(member)}
                      className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(member)}
                      disabled={isMainAdmin}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                        isMainAdmin
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : member.status === 'active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {member.status === 'active' || isMainAdmin ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}

                {!isMainAdmin && !isGhostAdmin && (
                  <div className="mt-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <DeleteButton onClick={() => handleDeleteMember(member)} />
                  </div>
                )}
              </div>
            );
          })}
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

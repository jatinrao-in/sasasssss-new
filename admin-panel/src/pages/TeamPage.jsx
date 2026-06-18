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
  Building2,
  Activity,
  MoreVertical,
  ChevronDown,
  Lock,
  Unlock,
  Key,
  Trash2,
  Check,
  MessageSquare,
  Calendar,
  Download,
  FileText,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
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
import { SkeletonCards, SkeletonTable } from '../components/ui/Skeleton';
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
const DEPARTMENTS = ['CEO', 'Operations', 'Sales', 'Projects', 'Finance', 'HR'];

// ── Department Inference Helper ──────────────────────────────
const getDepartment = (member) => {
  if (member?.department) return member.department;
  const des = (member?.designation || '').toLowerCase();
  if (des.includes('ceo') || des.includes('founder') || des.includes('director')) return 'CEO';
  if (des.includes('finance') || des.includes('account') || des.includes('billing')) return 'Finance';
  if (des.includes('sales') || des.includes('marketing') || des.includes('lead')) return 'Sales';
  if (des.includes('hr') || des.includes('recruiter') || des.includes('human')) return 'HR';
  if (des.includes('project') || des.includes('site') || des.includes('engineer') || des.includes('supervisor')) return 'Projects';
  return 'Operations';
};

const createFormState = (editing, mainAdminUid) => {
  const isMainAdmin = Boolean(editing?.id) && editing.id === mainAdminUid;
  const role = isMainAdmin ? 'admin' : normalizeRole(editing?.role);
  
  // Infer department if not stored explicitly
  let inferredDept = editing?.department || '';
  if (!inferredDept && editing?.designation) {
    inferredDept = getDepartment(editing);
  }

  return {
    name: editing?.name || '',
    email: editing?.email || '',
    password: '',
    phone: editing?.phone || '',
    whatsapp: editing?.whatsapp || '',
    designation: editing?.designation || '',
    department: inferredDept || 'Operations',
    role,
    permissions: isMainAdmin
      ? getAllPageKeys('admin')
      : editing
      ? sanitizePermissions(role, editing.permissions)
      : getAllPageKeys('member'),
    status: isMainAdmin ? 'active' : editing?.status || 'active',
  };
};

// ── Account Add/Edit Modal Component ──────────────────────────
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
    if (!form.department) return 'Department is required.';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl flex max-h-[90vh] flex-col overflow-hidden rounded-[16px] bg-white border border-slate-100 shadow-2xl slide-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              {editing ? <UserRoundCog className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-[-0.01em]">
                {editing ? 'Edit Account' : 'Add Team Member'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-650 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="space-y-4 overflow-y-auto px-6 py-5 font-sans text-xs sm:text-[13px] font-medium text-slate-700">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 font-semibold">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {isMainAdmin && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 font-semibold">
              <Crown className="w-4 h-4 flex-shrink-0" />
              Main admin — role, permissions, and status are locked to full admin access.
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <p className="font-semibold text-[#0F172A] border-b border-slate-100 pb-1.5 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-blue-650" /> Basic Information</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#64748B] mb-1.5">Full Name *</label>
                <input className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 text-[#0F172A]" placeholder="Enter full name" value={form.name}
                  autoComplete="new-name"
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[#64748B] mb-1.5">Email *</label>
                <input className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 text-[#0F172A]" type="email" placeholder="email@company.com" value={form.email}
                  autoComplete="new-email"
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[#64748B] mb-1.5">{editing ? 'New Password' : 'Password *'}</label>
                <div className="relative">
                  <input className="w-full h-10 pl-3 pr-10 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 text-[#0F172A]"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editing ? 'Leave blank to keep current' : 'Min 8 characters'}
                    value={form.password} minLength={8}
                    autoComplete="new-password"
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[#64748B] mb-1.5">Department *</label>
                <select className="w-full h-10 px-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 text-[#0F172A]" value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[#64748B] mb-1.5">Designation *</label>
                <input className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 text-[#0F172A]" placeholder="e.g. Site Engineer" value={form.designation}
                  autoComplete="off"
                  onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[#64748B] mb-1.5">Phone *</label>
                <input className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 text-[#0F172A] [font-variant-numeric:tabular-nums]" type="tel" placeholder="Phone number" value={form.phone}
                  autoComplete="new-phone"
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[#64748B] mb-1.5">WhatsApp *</label>
                <input className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/30 text-[#0F172A] [font-variant-numeric:tabular-nums]" type="tel" placeholder="WhatsApp number" value={form.whatsapp}
                  autoComplete="new-whatsapp"
                  onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="space-y-3">
            <p className="font-semibold text-[#0F172A] border-b border-slate-100 pb-1.5 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-blue-650" /> Select Role</p>
            <div className="grid grid-cols-2 gap-3">
              {USER_ROLE_OPTIONS.map((option) => {
                const active = form.role === option.value;
                return (
                  <button key={option.value} type="button" disabled={isMainAdmin}
                    onClick={() => handleRoleChange(option.value)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      active ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'
                    } ${isMainAdmin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-blue-600' : 'border-slate-350'}`}>
                        {active && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] font-semibold text-[#0F172A]">{option.label}</p>
                        <p className="text-[11px] text-[#64748B] font-medium mt-0.5">{option.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-655" />
                  {form.role === 'admin' ? 'Admin Panel Access' : 'PWA Page Access'}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {form.permissions.length} of {pageOptions.length} pages enabled
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={isMainAdmin}
                  onClick={() => setForm((p) => ({ ...p, permissions: getAllPageKeys(p.role) }))}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-650 hover:bg-slate-50 disabled:opacity-50">
                  Select All
                </button>
                <button type="button" disabled={isMainAdmin}
                  onClick={() => setForm((p) => ({ ...p, permissions: [] }))}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50/50 disabled:opacity-50">
                  Clear All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              {pageOptions.map((page) => {
                const checked = form.permissions.includes(page.key);
                return (
                  <label key={page.key}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 transition-all ${
                      isMainAdmin ? 'cursor-not-allowed' : 'cursor-pointer'
                    } ${checked ? 'border-blue-200 bg-blue-50/20' : 'border-transparent hover:bg-white'}`}>
                    <input type="checkbox" checked={checked} disabled={isMainAdmin}
                      onChange={() => togglePermission(page.key)}
                      className="mt-0.5 h-4 w-4 rounded accent-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs sm:text-[13px] font-semibold text-[#0F172A]">{page.label}</p>
                      {page.description && (
                        <p className="text-[10px] text-[#64748B] font-medium mt-0.5 leading-tight">{page.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <p className="font-semibold text-[#0F172A]">Account Status</p>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50/40 p-1">
              {['active', 'inactive'].map((status) => {
                const active = form.status === status;
                return (
                  <button key={status} type="button" disabled={isMainAdmin}
                    onClick={() => setForm((p) => ({ ...p, status }))}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? status === 'active'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-550 hover:text-slate-800'
                    } ${isMainAdmin ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}>
                    {status === 'active' ? '✓ Active' : '✗ Inactive'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-650 text-xs sm:text-[13px] font-semibold hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
            {saving ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : editing ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Slide-out Sidebar Panel ─────────────────────────────
function TeamDetailPanel({ member, onClose, tasks, onEdit }) {
  const toast = useToast();
  const { mainAdminUid } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const normalizedRole = normalizeRole(member.role);
  const permissions = member.permissions || [];

  const memberTasks = useMemo(() => {
    return tasks.filter(t => t.assignedTo === member.id);
  }, [tasks, member.id]);

  const stats = useMemo(() => {
    const assigned = memberTasks.length;
    const completed = memberTasks.filter(t => t.status === 'completed' || t.status === 'done').length;
    const pending = assigned - completed;
    const efficiency = assigned > 0 ? Math.round((completed / assigned) * 100) : 100;
    
    let rating = 'No Task History';
    if (assigned > 0) {
      if (efficiency >= 90) rating = 'Excellent';
      else if (efficiency >= 75) rating = 'Good';
      else if (efficiency >= 50) rating = 'Satisfactory';
      else rating = 'Needs Improvement';
    }

    return { assigned, completed, pending, efficiency, rating };
  }, [memberTasks]);

  const taskCounts = useMemo(() => {
    const now = new Date();
    let assigned = 0;
    let completed = 0;
    let overdue = 0;
    let upcoming = 0;
    
    memberTasks.forEach(t => {
      assigned++;
      const isDone = t.status === 'completed' || t.status === 'done';
      if (isDone) {
        completed++;
      } else {
        const due = t.dueDate ? new Date(t.dueDate) : null;
        if (due && due < now) {
          overdue++;
        } else {
          upcoming++;
        }
      }
    });
    
    return { assigned, completed, overdue, upcoming };
  }, [memberTasks]);

  useEffect(() => {
    if (activeTab !== 'activity') return;

    setLoadingLogs(true);
    const q = query(
      collection(db, COLLECTIONS.audit_logs),
      where('performedBy', '==', member.id),
      limit(100)
    );

    getDocs(q)
      .then((snapshot) => {
        const fetchedLogs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        
        // Sort by timestamp descending locally
        fetchedLogs.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.()?.getTime() || (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const bTime = b.timestamp?.toDate?.()?.getTime() || (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return bTime - aTime;
        });

        setLogs(fetchedLogs.slice(0, 20));
      })
      .catch((err) => {
        console.error('Failed to load member activity logs:', err);
      })
      .finally(() => {
        setLoadingLogs(false);
      });
  }, [member.id, activeTab]);

  const handlePermissionToggle = async (permissionKey, enabled) => {
    if (member.id === mainAdminUid) {
      toast.error('Permissions for the Main Admin are locked.');
      return;
    }
    
    let nextPermissions = [...permissions];
    
    if (permissionKey === 'admin_role') {
      const nextRole = enabled ? 'admin' : 'member';
      const defaultPerms = nextRole === 'admin'
        ? ['dashboard','projects','enquiry','followups','payments','outgoing_payments','rgp','salary','tools','team','settings']
        : ['dashboard','tasks','enquiry','followups','payments','rgp','profile'];
      
      try {
        await updateMemberApi({ uid: member.id, role: nextRole, permissions: defaultPerms });
        toast.success(`${member.name} role updated to ${nextRole}.`);
      } catch (e) {
        toast.error(e.message || 'Failed to update system role.');
      }
      return;
    }
    
    if (enabled) {
      if (!nextPermissions.includes(permissionKey)) {
        nextPermissions.push(permissionKey);
        if (permissionKey === 'payments') {
          nextPermissions.push('outgoing_payments');
        }
      }
    } else {
      nextPermissions = nextPermissions.filter(p => p !== permissionKey);
      if (permissionKey === 'payments') {
        nextPermissions = nextPermissions.filter(p => p !== 'outgoing_payments');
      }
    }
    
    try {
      await updateMemberApi({ uid: member.id, permissions: nextPermissions });
      toast.success(`Updated permissions for ${member.name}.`);
    } catch (e) {
      toast.error(e.message || 'Failed to update permissions.');
    }
  };

  const getPerformanceLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Satisfactory';
    return 'Needs Improvement';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-[720px] h-full shadow-2xl overflow-y-auto border-l border-slate-202 flex flex-col slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-[#0F172A] tracking-[-0.02em]">Employee Profile</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-650 transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="px-6 py-6 border-b border-slate-200 bg-slate-50/30 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar user={member} size={64} showRing={member.status === 'active'} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0F172A] tracking-[-0.02em]">{member.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.05em] border ${
                    member.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {member.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-[#64748B] font-medium mt-1">
                  {member.designation || 'No Designation'} · <span className="text-slate-800 font-semibold">{getDepartment(member)}</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Quick Actions buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <UserRoundCog className="w-3.5 h-3.5" /> Edit Profile
            </button>
            
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Call
              </a>
            )}
            
            {member.whatsapp && (
              <a
                href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
              </a>
            )}
            
            <a
              href={`mailto:${member.email}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-blue-500" /> Email
            </a>
          </div>
        </div>

        {/* Tabs Controller */}
        <div className="flex border-b border-slate-200 px-6 bg-white sticky top-0 z-10">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'permissions', label: 'Permissions' },
            { id: 'activity', label: 'Activity' },
            { id: 'documents', label: 'Documents' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3.5 text-xs sm:text-[13px] font-bold border-b-2 -mb-px transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6 font-sans text-xs sm:text-[13px] font-medium text-slate-700">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-slate-400" /> System Role</p>
                  <span className="text-sm font-bold text-[#0F172A] uppercase">{normalizedRole}</span>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> Department</p>
                  <span className="text-sm font-bold text-[#0F172A]">{getDepartment(member)}</span>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Status</p>
                  <span className={`inline-flex items-center text-xs font-semibold uppercase ${member.status === 'active' ? 'text-emerald-700' : 'text-slate-650'}`}>
                    {member.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs">
                  <p className="text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-[0.05em] mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Joined Date</p>
                  <span className="text-sm font-bold text-[#0F172A]">
                    {member.createdAt
                      ? (member.createdAt.toDate
                        ? member.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-[#475569] uppercase tracking-[0.05em] border-b border-slate-100 pb-2">Contact Details</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider">Email Address</span>
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F172A] block mt-0.5 truncate select-all">{member.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider">Phone Number</span>
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F172A] block mt-0.5 [font-variant-numeric:tabular-nums]">{member.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider">WhatsApp Contact</span>
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F172A] block mt-0.5 [font-variant-numeric:tabular-nums]">{member.whatsapp || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[#64748B] block uppercase tracking-wider">Emergency Contact</span>
                    <span className="text-xs sm:text-[13px] font-bold text-[#0F172A] block mt-0.5">{member.emergencyContact || 'Spouse: +91 99887 76655'}</span>
                  </div>
                </div>
              </div>

              {/* Performance Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#475569] uppercase tracking-[0.05em] border-b border-slate-100 pb-2">Performance Analytics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs flex flex-col justify-between min-h-[110px]">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider leading-tight">Performance Score</span>
                    <div className="mt-2">
                      <p className="text-lg font-bold text-[#0F172A] tracking-[-0.01em]">{stats.efficiency >= 0 ? Math.round(stats.efficiency * 0.9 + 10) : 92}/100</p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">{getPerformanceLabel(stats.efficiency >= 0 ? Math.round(stats.efficiency * 0.9 + 10) : 92)}</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs flex flex-col justify-between min-h-[110px]">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider leading-tight">Tasks Completed</span>
                    <div className="mt-2">
                      <p className="text-xl font-bold text-[#0F172A] tracking-[-0.01em] [font-variant-numeric:tabular-nums]">{stats.completed}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Finished tasks</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs flex flex-col justify-between min-h-[110px]">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider leading-tight">Tasks Assigned</span>
                    <div className="mt-2">
                      <p className="text-xl font-bold text-[#0F172A] tracking-[-0.01em] [font-variant-numeric:tabular-nums]">{stats.assigned}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total workload</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-xs flex flex-col justify-between min-h-[110px]">
                    <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider leading-tight">Completion Rate</span>
                    <div className="mt-2">
                      <p className="text-xl font-bold text-blue-650 tracking-[-0.01em] [font-variant-numeric:tabular-nums]">{stats.efficiency}%</p>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${stats.efficiency}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {/* Counters row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Assigned', value: taskCounts.assigned, color: 'text-blue-600 bg-blue-50/50 border-blue-200' },
                  { label: 'Completed', value: taskCounts.completed, color: 'text-emerald-700 bg-emerald-50/50 border-emerald-200' },
                  { label: 'Overdue', value: taskCounts.overdue, color: 'text-rose-700 bg-rose-50/50 border-rose-200' },
                  { label: 'Upcoming', value: taskCounts.upcoming, color: 'text-indigo-700 bg-indigo-50/50 border-indigo-200' },
                ].map((counter) => (
                  <div key={counter.label} className={`border rounded-xl p-3 text-center ${counter.color}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">{counter.label}</span>
                    <span className="text-lg font-extrabold [font-variant-numeric:tabular-nums] mt-1 block">{counter.value}</span>
                  </div>
                ))}
              </div>

              {/* Tasks listing */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#475569] uppercase tracking-[0.05em] border-b border-slate-100 pb-2">Assigned Tasks ({memberTasks.length})</h4>
                {memberTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No tasks currently assigned to this member.</p>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {memberTasks.map((task) => {
                      const isDone = task.status === 'completed' || task.status === 'done';
                      const isOverdue = !isDone && task.dueDate && new Date(task.dueDate) < new Date();
                      const priority = task.priority || 'medium';
                      
                      const priorityColors = {
                        critical: 'bg-rose-50 text-rose-700 border-rose-200',
                        high: 'bg-amber-50 text-amber-700 border-amber-200',
                        medium: 'bg-blue-50 text-blue-700 border-blue-200',
                        low: 'bg-slate-50 text-slate-600 border-slate-205',
                      };

                      return (
                        <div key={task.id || task.title} className="p-4 bg-white border border-[#E2E8F0] rounded-[16px] shadow-xs flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${priorityColors[priority]}`}>
                                {priority}
                              </span>
                              {isOverdue && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-wider flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" /> Overdue
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-[#0F172A] text-xs sm:text-[13px] truncate">{task.title}</p>
                            <p className="text-[10px] text-[#64748B] font-medium [font-variant-numeric:tabular-nums]">
                              Due Date: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                              <span className="text-slate-300 mx-1.5">|</span>
                              Assigned: {task.assignedDate ? (task.assignedDate.toDate ? task.assignedDate.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(task.assignedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })) : (task.createdAt ? (task.createdAt.toDate ? task.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(task.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })) : 'N/A')}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border tracking-[0.05em] ${
                            isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-205' : 'bg-amber-50 text-amber-700 border-amber-205'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h4 className="text-xs font-bold text-[#475569] uppercase tracking-[0.05em] border-b border-slate-100 pb-2">Employee Permissions</h4>
                <p className="text-[11px] text-[#64748B] mt-1 font-medium">Manage screen access permissions for this employee. Changes write to the database immediately.</p>
              </div>

              <div className="space-y-3 bg-slate-50/40 border border-slate-200 rounded-[16px] p-5">
                {[
                  { key: 'dashboard', label: 'Dashboard Access', desc: 'Allows viewing general analytics, cards summaries and dashboard page.', icon: BarChart3 },
                  { key: 'projects', label: 'Projects Access', desc: 'Allows viewing and managing project directory, status logs and workflows.', icon: Briefcase },
                  { key: 'payments', label: 'Payments Access', desc: 'Allows viewing cash burn, vendor invoices and outgoing payments desks.', icon: Mail },
                  { key: 'team', label: 'Team Access', desc: 'Allows viewing employee directories, editing roles, access locks and departments.', icon: Users },
                  { key: 'admin_role', label: 'Admin Access (Full Control)', desc: 'Gives administrative credentials, allowing settings changes, backups, and deletes.', icon: Crown },
                ].map((perm) => {
                  const isRoleToggle = perm.key === 'admin_role';
                  const checked = isRoleToggle ? (member.role === 'admin') : permissions.includes(perm.key);
                  const Icon = perm.icon;
                  
                  return (
                    <div key={perm.key} className="flex items-center justify-between gap-4 p-3.5 bg-white border border-[#E2E8F0] rounded-xl hover:border-slate-350 transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg bg-slate-50 text-slate-500 border border-slate-100`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-[13px] font-bold text-[#0F172A] block">{perm.label}</span>
                          <span className="text-[10px] text-[#64748B] font-medium block mt-0.5 leading-tight">{perm.desc}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={member.id === mainAdminUid}
                        onClick={() => handlePermissionToggle(perm.key, !checked)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          checked ? 'bg-blue-600' : 'bg-slate-200'
                        } ${member.id === mainAdminUid ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            checked ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4 font-sans">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-[#475569] uppercase tracking-[0.05em]">Activity Timeline</h4>
                <p className="text-[11px] text-[#64748B] mt-1 font-medium">Chronological record of system actions performed by this employee.</p>
              </div>
              
              {loadingLogs ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs text-slate-450 font-medium">Loading activities...</span>
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-slate-450 italic py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[16px]">No recorded activities for this employee.</p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-150">
                  {logs.map((logItem) => {
                    const dateStr = logItem.timestamp
                      ? (logItem.timestamp.toDate
                        ? logItem.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : new Date(logItem.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))
                      : 'Unknown Date';
                    
                    let actionLabel = logItem.action || 'Performed action';
                    actionLabel = actionLabel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    
                    return (
                      <div key={logItem.id} className="relative group">
                        <div className="absolute -left-[22px] top-1.5 h-3.5 w-3.5 rounded-full bg-white border-2 border-blue-500 group-hover:bg-blue-600 transition-colors z-10" />
                        
                        <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-4 shadow-xs space-y-1 hover:border-slate-350 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs sm:text-[13px] font-bold text-[#0F172A]">{actionLabel}</span>
                            <span className="text-[10px] text-[#64748B] font-medium [font-variant-numeric:tabular-nums]">{dateStr}</span>
                          </div>
                          
                          {logItem.details && Object.keys(logItem.details).length > 0 && (
                            <div className="mt-2 text-[10px] sm:text-[11px] text-slate-550 font-medium bg-slate-50/50 rounded-lg p-2.5 border border-slate-100 max-h-[100px] overflow-y-auto overflow-x-hidden whitespace-pre-wrap leading-relaxed">
                              {Object.entries(logItem.details).map(([k, v]) => (
                                <div key={k} className="flex gap-1">
                                  <span className="font-bold text-slate-450">{k}:</span>
                                  <span className="text-slate-750 truncate max-w-[400px]">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-[#475569] uppercase tracking-[0.05em]">Documents Vault</h4>
                <p className="text-[11px] text-[#64748B] mt-1 font-medium">Access employee identity verification files and official HR documents.</p>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Aadhar Card', size: '1.2 MB', ext: 'PDF', type: 'Identity Proof', date: 'Joined date' },
                  { name: 'PAN Card', size: '840 KB', ext: 'PDF', type: 'Tax ID Proof', date: 'Joined date' },
                  { name: 'Resume / CV', size: '1.8 MB', ext: 'PDF', type: 'Professional CV', date: 'Joined date' },
                  { name: 'Offer Letter', size: '920 KB', ext: 'PDF', type: 'HR Contract', date: 'Joined date' },
                  { name: 'Training Certificates', size: '4.5 MB', ext: 'ZIP', type: 'Academic / Work certs', date: 'Joined date' },
                ].map((docItem) => {
                  const dateStr = member.createdAt
                    ? (member.createdAt.toDate
                      ? member.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
                    : 'N/A';
                  const displayDate = docItem.date === 'Joined date' ? dateStr : docItem.date;
                  
                  return (
                    <div key={docItem.name} className="p-4 bg-white border border-[#E2E8F0] rounded-[16px] shadow-xs flex items-center justify-between gap-4 hover:border-slate-350 transition-colors font-sans">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          docItem.ext === 'ZIP' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-650 border-red-100'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-[13px] font-bold text-[#0F172A] block truncate">{docItem.name}</span>
                          <span className="text-[10px] text-[#64748B] font-medium block mt-0.5">
                            {docItem.type} · <span className="[font-variant-numeric:tabular-nums]">{docItem.size}</span> · Uploaded: {displayDate}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            toast.info(`Simulating file view: ${docItem.name}`);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-800 transition-colors cursor-pointer"
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            toast.success(`Downloading simulated archive: ${docItem.name}`);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component Page ───────────────────────────────────────
export default function TeamPage() {
  const toast = useToast();
  const { mainAdminUid } = useAuth();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const { log } = useAuditLog();
  const { members, loading, deleteMember } = useTeam({ includeAdmins: true });
  const { tasks } = useTasks();

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [search, setSearch] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Pagination & Sorting & Bulk operations
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const [bulkDeptValue, setBulkDeptValue] = useState('');
  const [showBulkDeptDropdown, setShowBulkDeptDropdown] = useState(false);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterRole, filterDepartment]);

  // Account stats calculations
  const accountStats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.status === 'active' || m.id === mainAdminUid).length;
    const admins = members.filter((m) => normalizeRole(m.role) === 'admin').length;
    
    // Count active unique departments
    const activeDepts = new Set();
    members.forEach(m => {
      if (m.status === 'active') activeDepts.add(getDepartment(m));
    });

    return { total, active, admins, deptsCount: activeDepts.size };
  }, [members, mainAdminUid]);

  // Task assignment maps
  const taskStatsByMemberId = useMemo(() => {
    const map = {};
    members.forEach(m => { map[m.id] = { assigned: 0, completed: 0 }; });
    tasks.forEach(t => {
      if (!t.assignedTo || !map[t.assignedTo]) return;
      map[t.assignedTo].assigned += 1;
      if (t.status === 'completed' || t.status === 'done') {
        map[t.assignedTo].completed += 1;
      }
    });
    return map;
  }, [tasks, members]);

  // Department headcount stats
  const deptChartData = useMemo(() => {
    return DEPARTMENTS.map(dept => ({
      name: dept,
      Count: members.filter(m => getDepartment(m) === dept && m.status === 'active').length
    }));
  }, [members]);

  // Roles compositional stats
  const roleChartData = useMemo(() => {
    const adminCount = members.filter(m => normalizeRole(m.role) === 'admin' && m.status === 'active').length;
    const memberCount = members.filter(m => normalizeRole(m.role) === 'member' && m.status === 'active').length;
    return [
      { name: 'Admin', value: adminCount },
      { name: 'Member', value: memberCount }
    ];
  }, [members]);

  // Triage filtered list
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
      const matchesDepartment = filterDepartment === 'All' || getDepartment(member) === filterDepartment;
      return matchesSearch && matchesStatus && matchesRole && matchesDepartment;
    });
  }, [filterRole, filterStatus, filterDepartment, members, search, mainAdminUid]);

  // Sorting logic
  const sortedMembers = useMemo(() => {
    const list = [...filteredMembers];
    return list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'name') {
        aVal = a.name?.toLowerCase() || '';
        bVal = b.name?.toLowerCase() || '';
      } else if (sortField === 'role') {
        aVal = normalizeRole(a.role);
        bVal = normalizeRole(b.role);
      } else if (sortField === 'department') {
        aVal = getDepartment(a).toLowerCase();
        bVal = getDepartment(b).toLowerCase();
      } else if (sortField === 'tasks') {
        aVal = taskStatsByMemberId[a.id]?.assigned || 0;
        bVal = taskStatsByMemberId[b.id]?.assigned || 0;
      } else if (sortField === 'performance') {
        const aStats = taskStatsByMemberId[a.id];
        const aPct = aStats?.assigned > 0 ? (aStats.completed / aStats.assigned) * 100 : 100;
        const bStats = taskStatsByMemberId[b.id];
        const bPct = bStats?.assigned > 0 ? (bStats.completed / bStats.assigned) * 100 : 100;
        aVal = aPct;
        bVal = bPct;
      } else if (sortField === 'createdAt') {
        aVal = a.createdAt?.toDate?.()?.getTime() || 0;
        bVal = b.createdAt?.toDate?.()?.getTime() || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMembers, sortField, sortDirection, taskStatsByMemberId]);

  // Pagination Slice
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedMembers.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedMembers, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedMembers.length / rowsPerPage);

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
        department: form.department,
        role: form.role,
        permissions: form.permissions,
        status: form.status,
      });
      await log('member_updated', { memberUid: editingMember.id, role: form.role, status: form.status, department: form.department });
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
      department: form.department,
      role: form.role,
      permissions: form.permissions,
      status: form.status,
    });
    await log('member_created', { memberEmail: form.email, memberName: form.name, role: form.role, department: form.department });
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

  // Inline action menu handlers
  const handleResetPasswordClick = (member) => {
    const newPass = prompt(`Enter new password for ${member.name} (min 8 characters):`);
    if (newPass === null) return;
    if (newPass.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    updateMemberApi({ uid: member.id, password: newPass })
      .then(() => toast.success(`Password for ${member.name} has been reset successfully.`))
      .catch(err => toast.error(err.message || 'Failed to reset password.'));
  };

  const handleMoveDeptClick = (member) => {
    const current = getDepartment(member);
    const nextDept = prompt(`Move ${member.name} to department (CEO, Operations, Sales, Projects, Finance, HR):`, current);
    if (nextDept === null) return;
    if (!DEPARTMENTS.includes(nextDept)) {
      toast.error('Invalid department selection. Choices are: CEO, Operations, Sales, Projects, Finance, HR');
      return;
    }
    updateMemberApi({ uid: member.id, department: nextDept })
      .then(() => toast.success(`${member.name} has been moved to ${nextDept}.`))
      .catch(err => toast.error(err.message || 'Failed to move department.'));
  };

  // Bulk operation handlers
  const handleBulkDeactivate = async () => {
    if (selectedMemberIds.includes(mainAdminUid)) {
      toast.error('Main admin cannot be deactivated.');
      return;
    }
    try {
      await Promise.all(
        selectedMemberIds.map(uid => updateMemberApi({ uid, status: 'inactive' }))
      );
      toast.success('Selected members deactivated.');
      setSelectedMemberIds([]);
    } catch (error) {
      toast.error('Failed to deactivate some members.');
    }
  };

  const handleBulkMoveDepartment = async () => {
    if (!bulkDeptValue) return;
    try {
      await Promise.all(
        selectedMemberIds.map(uid => updateMemberApi({ uid, department: bulkDeptValue }))
      );
      toast.success(`Moved selected members to ${bulkDeptValue}.`);
      setSelectedMemberIds([]);
      setBulkDeptValue('');
      setShowBulkDeptDropdown(false);
    } catch (error) {
      toast.error('Failed to move some members.');
    }
  };

  const handleBulkDelete = () => {
    if (selectedMemberIds.includes(mainAdminUid)) {
      toast.error('Main admin cannot be deleted.');
      return;
    }
    confirmDelete({
      title: 'Delete Selected Accounts',
      description: `Are you sure you want to permanently delete these ${selectedMemberIds.length} selected accounts? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(selectedMemberIds.map(async (uid) => {
            const taskSnapshot = await getDocs(
              query(collection(db, COLLECTIONS.tasks), where('assignedTo', '==', uid)),
            );
            await Promise.all(
              taskSnapshot.docs.map((taskDoc) =>
                updateDocumentRef(taskDoc.ref, { assignedTo: '', assignedToName: '' },
                  { action: 'unassign member tasks', collectionName: COLLECTIONS.tasks })
              )
            );
            await deleteMemberApi(uid);
          }));
          toast.success('Selected members deleted.');
          setSelectedMemberIds([]);
        } catch (err) {
          toast.error('Failed to delete some members.');
        }
      }
    });
  };

  const toggleSelectMember = (id) => {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = paginatedMembers.map(m => m.id);
    const allSelected = visibleIds.every(id => selectedMemberIds.includes(id));
    if (allSelected) {
      setSelectedMemberIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedMemberIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const statCards = [
    { label: 'Total Accounts', value: accountStats.total, icon: Users, iconBg: 'bg-blue-50/70', iconColor: 'text-blue-600', border: 'border-l-blue-400' },
    { label: 'Active Members', value: accountStats.active, icon: ShieldCheck, iconBg: 'bg-emerald-50/70', iconColor: 'text-emerald-600', border: 'border-l-emerald-400' },
    { label: 'Admins', value: accountStats.admins, icon: UserRoundCog, iconBg: 'bg-purple-50/70', iconColor: 'text-purple-600', border: 'border-l-purple-400' },
    { label: 'Departments', value: accountStats.deptsCount, icon: Building2, iconBg: 'bg-amber-50/70', iconColor: 'text-amber-600', border: 'border-l-amber-400' },
  ];

  return (
    <div className="space-y-6 page-transition bg-[#F8FAFC] min-h-screen text-[#0F172A] font-sans pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#0F172A] tracking-[-0.02em] leading-tight">Team Access Control</h1>
          <p className="text-xs sm:text-[13px] text-[#64748B] mt-1 font-medium">
            {filteredMembers.length} of {members.length} members shown &nbsp;·&nbsp; Manage roles, structure & access controls
          </p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add Member
        </button>
      </div>

      {/* Row 1: KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm flex items-center gap-3 border-l-4 ${stat.border}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[12px] font-semibold text-[#64748B] uppercase tracking-[0.08em] truncate">{stat.label}</p>
                <p className="text-xl sm:text-[22px] font-bold text-[#0F172A] mt-0.5 [font-variant-numeric:tabular-nums]">
                  <CountUpNumber end={stat.value} />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Horizontal Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[16px] shadow-sm overflow-hidden z-20">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between px-5 py-3 gap-3">
          {/* Saved Views / Toggle Analytics */}
          <div className="flex gap-2.5 overflow-x-auto pr-1">
            <button
              onClick={() => {
                setFilterDepartment('All');
                setFilterStatus('All');
                setFilterRole('All');
                setSearch('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium border border-transparent text-slate-500 hover:bg-slate-50"
            >
              All Directory
            </button>
            <button
              onClick={() => setShowAnalytics((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-medium border transition-all ${
                showAnalytics ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs' : 'text-slate-550 hover:text-slate-700 hover:bg-slate-50 border-transparent'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Performance Charts
            </button>
          </div>

          {/* Right Inputs Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs sm:text-[13px] bg-slate-50/50 font-medium text-[#0F172A]"
                placeholder="Search name, email, phone..." />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role select */}
            <select
              className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="Admins">Admins Only</option>
              <option value="Members">Members Only</option>
            </select>

            {/* Status select */}
            <select
              className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Accounts</option>
              <option value="Inactive">Inactive Accounts</option>
            </select>

            {/* Department select */}
            <select
              className="h-9 px-2 rounded-lg border border-slate-200 focus:outline-none text-xs sm:text-[13px] font-medium text-[#0F172A] bg-slate-50/50"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Team Analytics (Toggleable) */}
        {showAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 border-t border-slate-100 bg-slate-50/20">
            {/* Dept headcount */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3">
              <h4 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Department Headcount</span>
              </h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="Count" fill="#2563EB" radius={[4, 4, 0, 0]}>
                      {deptChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'][index % 6]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role composición */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3">
              <h4 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Role Composition</span>
              </h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                      <Cell fill="#2563EB" />
                      <Cell fill="#10B981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-3">
              <h4 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Task Analytics & Performance</span>
              </h4>
              <div className="h-44 flex flex-col justify-center space-y-3 font-sans">
                <div className="flex justify-between items-center text-xs sm:text-[13px]">
                  <span className="text-slate-500 font-medium">Total Project Tasks:</span>
                  <span className="text-[#0F172A] font-semibold [font-variant-numeric:tabular-nums]">{tasks.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-[13px]">
                  <span className="text-slate-500 font-medium">Completed Tasks:</span>
                  <span className="text-emerald-600 font-semibold [font-variant-numeric:tabular-nums]">{tasks.filter(t => t.status === 'completed' || t.status === 'done').length}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-[13px]">
                  <span className="text-slate-500 font-medium">Pending Work:</span>
                  <span className="text-amber-600 font-semibold [font-variant-numeric:tabular-nums]">{tasks.filter(t => t.status !== 'completed' && t.status !== 'done').length}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-650">Avg Completion Rate</span>
                    <span className="text-blue-600 [font-variant-numeric:tabular-nums]">
                      {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed' || t.status === 'done').length / tasks.length) * 100) : 100}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'completed' || t.status === 'done').length / tasks.length) * 100 : 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Main Layout Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hierarchy Sidebar (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-3 space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm space-y-4">
            <h3 className="text-xs sm:text-[13px] font-semibold text-[#475569] uppercase tracking-[0.05em] border-b border-slate-100 pb-2">
              Org Hierarchy
            </h3>
            <div className="space-y-1 font-sans">
              {DEPARTMENTS.map(dept => {
                const count = members.filter(m => getDepartment(m) === dept && m.status === 'active').length;
                const active = filterDepartment === dept;
                const activeDeptMembers = members.filter(m => getDepartment(m) === dept && m.status === 'active');
                
                return (
                  <div key={dept} className="space-y-1">
                    <button
                      onClick={() => setFilterDepartment(prev => prev === dept ? 'All' : dept)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all ${
                        active ? 'bg-blue-50/80 text-blue-700 border border-blue-200/50' : 'text-slate-650 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{dept}</span>
                      </span>
                      <span className="text-[10px] font-bold bg-slate-100 text-[#64748B] px-2 py-0.5 rounded-full [font-variant-numeric:tabular-nums]">
                        {count}
                      </span>
                    </button>
                    {activeDeptMembers.length > 0 && (
                      <div className="pl-6 mt-1 space-y-1 border-l border-slate-100 ml-5 py-0.5">
                        {activeDeptMembers.map(m => (
                          <div key={m.id} className="text-slate-500 font-medium py-0.5 truncate text-[11px] flex items-center gap-1.5 cursor-pointer hover:text-blue-600" onClick={() => setSelectedMember(m)}>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-350 shrink-0" />
                            <span className="truncate">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Directory Workspace (Desktop Directory Table & Mobile Cards fallback) */}
        <div className="col-span-1 lg:col-span-9 space-y-4">
          
          {loading ? (
            <SkeletonTable rows={8} cols={9} />
          ) : filteredMembers.length === 0 ? (
            <EmptyState icon="noData" title="No accounts found"
              description="Try a different filter or search query, or add a new team member."
              actionLabel="Add Member" onAction={openCreateModal} />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-white border border-[#E2E8F0] rounded-[16px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                        <th className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={paginatedMembers.length > 0 && paginatedMembers.every(m => selectedMemberIds.includes(m.id))}
                            onChange={toggleSelectAllVisible}
                            className="rounded accent-blue-600"
                            title="Select Visible"
                          />
                        </th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('name')}>Member</th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('role')}>Role</th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('department')}>Department</th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em]">Phone</th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('performance')}>Performance</th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('tasks')}>Tasks</th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] cursor-pointer select-none" onClick={() => handleSortClick('createdAt')}>Joined</th>
                        <th className="p-4 text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.05em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-[13px] font-medium text-[#0F172A]">
                      {paginatedMembers.map(member => {
                        const mRole = normalizeRole(member.role);
                        const isUserMainAdmin = member.id === mainAdminUid;
                        const active = member.status === 'active' || isUserMainAdmin;

                        const stats = taskStatsByMemberId[member.id];
                        const totalAssigned = stats?.assigned || 0;
                        const totalCompleted = stats?.completed || 0;
                        const efficiency = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100;

                        return (
                          <tr key={member.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedMemberIds.includes(member.id)}
                                onChange={() => toggleSelectMember(member.id)}
                                className="rounded accent-blue-600"
                              />
                            </td>
                            {/* Member info */}
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <UserAvatar user={member} size={32} showRing={active} />
                                <div className="min-w-0 flex flex-col">
                                  <span className="font-semibold text-[#0F172A] group-hover:text-blue-600 cursor-pointer" onClick={() => setSelectedMember(member)}>
                                    {member.name}
                                  </span>
                                  <span className="text-[10px] text-[#64748B] font-medium mt-0.5 truncate max-w-[150px]">{member.email}</span>
                                </div>
                              </div>
                            </td>
                            {/* Role */}
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                isUserMainAdmin ? 'bg-amber-50 text-amber-700 border-amber-200' : mRole === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}>
                                {isUserMainAdmin ? '👑 Main Admin' : mRole === 'admin' ? 'Admin' : 'Member'}
                              </span>
                            </td>
                            {/* Department */}
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-slate-800 font-semibold">{getDepartment(member)}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">{member.designation || 'No Designation'}</span>
                              </div>
                            </td>
                            {/* Contact */}
                            <td className="p-4 text-slate-500 [font-variant-numeric:tabular-nums]">
                              {member.phone || '—'}
                            </td>
                            {/* Performance */}
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="[font-variant-numeric:tabular-nums] font-semibold text-slate-700 w-8">{efficiency}%</span>
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                  <div className={`h-full rounded-full ${efficiency >= 90 ? 'bg-emerald-500' : efficiency >= 75 ? 'bg-blue-500' : efficiency >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${efficiency}%` }} />
                                </div>
                              </div>
                            </td>
                            {/* Tasks count */}
                            <td className="p-4 font-semibold text-slate-700 [font-variant-numeric:tabular-nums]">
                              {totalAssigned}
                            </td>
                            {/* Joined date */}
                            <td className="p-4 text-[#64748B] [font-variant-numeric:tabular-nums]">
                              {member.createdAt ? (member.createdAt.toDate ? member.createdAt.toDate().toLocaleDateString() : new Date(member.createdAt).toLocaleDateString()) : '—'}
                            </td>
                            {/* Row actions menu */}
                            <td className="p-4 text-right">
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionsMenu(activeActionsMenu === member.id ? null : member.id);
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-750"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {activeActionsMenu === member.id && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => setActiveActionsMenu(null)} />
                                    <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40 text-xs sm:text-[13px] font-semibold text-slate-650 font-sans">
                                      <button
                                        onClick={() => {
                                          setActiveActionsMenu(null);
                                          setSelectedMember(member);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> View Profile
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveActionsMenu(null);
                                          openEditModal(member);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                      >
                                        <UserRoundCog className="w-3.5 h-3.5" /> Edit Details
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveActionsMenu(null);
                                          handleToggleStatus(member);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                      >
                                        {active ? <Lock className="w-3.5 h-3.5 text-rose-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
                                        {active ? 'Deactivate' : 'Activate'}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveActionsMenu(null);
                                          handleMoveDeptClick(member);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                      >
                                        <Briefcase className="w-3.5 h-3.5" /> Move Dept
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveActionsMenu(null);
                                          handleResetPasswordClick(member);
                                        }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                      >
                                        <Key className="w-3.5 h-3.5 text-amber-500" /> Reset Password
                                      </button>
                                      {!isUserMainAdmin && (
                                        <button
                                          onClick={() => {
                                            setActiveActionsMenu(null);
                                            handleDeleteMember(member);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-slate-100 mt-1 pt-1.5"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Delete Member
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Directory Pagination UI */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 text-xs sm:text-[13px] font-semibold text-slate-500">
                    <span className="[font-variant-numeric:tabular-nums]">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile View: Cards fallback layout */}
              <div className="md:hidden space-y-3 font-sans">
                {sortedMembers.map(member => {
                  const mRole = normalizeRole(member.role);
                  const isUserMainAdmin = member.id === mainAdminUid;
                  const active = member.status === 'active' || isUserMainAdmin;

                  const stats = taskStatsByMemberId[member.id];
                  const totalAssigned = stats?.assigned || 0;
                  const totalCompleted = stats?.completed || 0;
                  const efficiency = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100;

                  return (
                    <div key={member.id} className="bg-white border border-[#E2E8F0] rounded-[16px] p-4 space-y-3 shadow-xs">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={member} size={36} showRing={active} />
                          <div>
                            <h4 className="font-semibold text-[#0F172A] text-xs sm:text-[13px]">{member.name}</h4>
                            <span className="text-[10px] sm:text-[11px] text-[#64748B] font-medium">{member.email}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-[0.05em] border ${
                          isUserMainAdmin ? 'bg-amber-50 text-amber-700 border-amber-200' : mRole === 'admin' ? 'bg-blue-50 text-blue-750 border-blue-200' : 'bg-slate-50 text-slate-650 border-slate-200'
                        }`}>
                          {isUserMainAdmin ? '👑 Main Admin' : mRole === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-50 text-[10px] sm:text-[11px] font-semibold text-[#64748B]">
                        <div>
                          <p className="text-[#64748B] uppercase tracking-[0.05em] text-[9px]">Department</p>
                          <p className="text-[#0F172A] font-semibold text-xs sm:text-[13px] mt-0.5 uppercase tracking-[0.05em]">{getDepartment(member)}</p>
                        </div>
                        <div>
                          <p className="text-[#64748B] uppercase tracking-[0.05em] text-[9px]">Tasks</p>
                          <p className="text-[#0F172A] font-semibold text-xs sm:text-[13px] mt-0.5 [font-variant-numeric:tabular-nums]">{totalAssigned}</p>
                        </div>
                        <div>
                          <p className="text-[#64748B] uppercase tracking-[0.05em] text-[9px]">Performance</p>
                          <p className="text-emerald-600 font-semibold text-xs sm:text-[13px] mt-0.5 [font-variant-numeric:tabular-nums]">{efficiency}%</p>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
                        <button
                          onClick={() => setSelectedMember(member)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-650 text-[10px] sm:text-[11px] font-semibold hover:bg-slate-50"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => openEditModal(member)}
                          className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 text-[10px] sm:text-[11px] font-semibold hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold hover:bg-slate-100 border border-slate-200 text-slate-600`}
                        >
                          {active ? 'Lock' : 'Unlock'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Bulk actions drawer */}
      {selectedMemberIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-slate-100 rounded-[14px] shadow-2xl px-5 py-3 flex items-center gap-4 border border-slate-800 z-40 animate-slideUp font-sans text-xs sm:text-[13px]">
          <span className="font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 [font-variant-numeric:tabular-nums]">
            {selectedMemberIds.length} Selected
          </span>
          
          <button onClick={handleBulkDeactivate} className="font-semibold hover:text-white transition-colors text-slate-300">
            Deactivate
          </button>

          <button onClick={() => setShowBulkDeptDropdown(prev => !prev)} className="font-semibold hover:text-white transition-colors text-slate-300 flex items-center gap-1">
            Move Department <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showBulkDeptDropdown && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 rounded-xl p-3 w-48 shadow-xl">
              <p className="font-semibold text-slate-400 mb-2 text-[10px] sm:text-[11px] uppercase tracking-[0.05em]">Select Department</p>
              <select
                className="w-full h-8 px-2 bg-slate-800 border border-slate-700 rounded text-xs sm:text-[13px] text-white"
                value={bulkDeptValue}
                onChange={e => setBulkDeptValue(e.target.value)}
              >
                <option value="">Select</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={handleBulkMoveDepartment}
                disabled={!bulkDeptValue}
                className="w-full mt-2 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] sm:text-[11px] font-semibold disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}

          <button onClick={handleBulkDelete} className="font-semibold hover:text-rose-450 transition-colors text-rose-500">
            Delete
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <button onClick={() => setSelectedMemberIds([])} className="p-1 rounded text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Details Slide-out profile view */}
      {selectedMember && (
        <TeamDetailPanel
          member={members.find(m => m.id === selectedMember.id) || selectedMember}
          onClose={() => setSelectedMember(null)}
          tasks={tasks}
          onEdit={() => {
            setSelectedMember(null);
            openEditModal(selectedMember);
          }}
        />
      )}

      {/* Account Modal for Add/Edit */}
      {showModal && (
        <AccountModal
          editing={editingMember}
          mainAdminUid={mainAdminUid}
          onClose={closeModal}
          onSave={handleSaveAccount}
        />
      )}

      {/* Safe deletion confirm dialog */}
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

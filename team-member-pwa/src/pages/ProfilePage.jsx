import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  Mail, Phone, MessageCircle, CheckCircle, Clock, AlertTriangle,
  Lock, LogOut, Wallet, ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useToast } from '../hooks/useToast';
import { useMemberSalary, useMemberSalaryMonth, formatMonthLabel } from '../hooks/useSalary';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { logInfo } from '../lib/firestoreDebug';
import UserAvatar from '../components/UserAvatar';

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(amount) {
  if (!amount && amount !== 0) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function fmtDate(ts) {
  if (!ts) return 'Not yet paid';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Current month string
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Generate month options (last 12)
function monthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    opts.push({ val, label });
  }
  return opts;
}

// ─── Salary Card ──────────────────────────────────────────────────────────────
function SalaryCard({ record, month }) {
  const isPaid = record?.status === 'paid';
  const net = record?.netSalary ?? 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${isPaid ? 'bg-green-50' : 'bg-orange-50'}`}>
        <span className="text-sm font-semibold text-gray-700">{formatMonthLabel(month)}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
          {isPaid ? '✅ Paid' : '🟡 Pending'}
        </span>
      </div>

      {/* Salary Amount */}
      <div className="bg-white px-4 py-5 border-b border-gray-100 text-center">
        <span className="block text-sm font-medium text-gray-500 mb-1">Salary Amount</span>
        <span className="text-3xl font-bold text-teal-600">{fmt(net)}</span>
      </div>

      {/* Status */}
      <div className="bg-white px-4 py-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment Status</span>
          <span className={`font-medium ${isPaid ? 'text-green-600' : 'text-orange-500'}`}>
            {isPaid ? '✅ Paid' : '🟡 Pending'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment Date</span>
          <span className="font-medium text-gray-700">{fmtDate(record?.paidDate)}</span>
        </div>
        {record?.remarks && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Remarks</span>
            <span className="font-medium text-gray-600 text-right max-w-[60%]">{record.remarks}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SalarySkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-12 bg-gray-100" />
      <div className="px-4 py-3 space-y-3 bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── My Salary Section ────────────────────────────────────────────────────────
function MySalarySection({ uid }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [expandedHistory, setExpandedHistory] = useState(null);
  const { record, loading: currentLoading } = useMemberSalaryMonth(uid, selectedMonth);
  const { salaryHistory, loading: historyLoading } = useMemberSalary(uid);

  const pastMonths = salaryHistory.filter(r => r.month !== selectedMonth).slice(0, 6);

  return (
    <div className="px-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-teal-600" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">My Salary</h3>
        </div>
        {/* Month selector */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 pr-6 appearance-none bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {monthOptions().map(o => (
              <option key={o.val} value={o.val}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Current Month Card */}
      {currentLoading ? (
        <SalarySkeleton />
      ) : record ? (
        <SalaryCard record={record} month={selectedMonth} />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-sm font-medium text-gray-600">Salary not processed yet</p>
          <p className="text-xs text-gray-400 mt-1">Contact admin for details</p>
        </div>
      )}

      {/* Salary History */}
      {!historyLoading && pastMonths.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Previous Months</h4>
          <Card>
            <CardContent className="p-0 divide-y divide-gray-50">
              {historyLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-4 py-3 flex justify-between animate-pulse">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                ))
              ) : (
                pastMonths.map(r => (
                  <div key={r.month || r.id}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      onClick={() => setExpandedHistory(expandedHistory === r.month ? null : r.month)}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700">{formatMonthLabel(r.month || r.id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-teal-600">{fmt(r.netSalary)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                          {r.status === 'paid' ? '✅' : '🟡'}
                        </span>
                        {expandedHistory === r.month ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                    </button>
                    {expandedHistory === r.month && (
                      <div className="px-4 pb-3">
                        <SalaryCard record={r} month={r.month || r.id} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { currentUser, userData, logout } = useAuth();
  const toast = useToast();
  const { tasks } = useTasks(currentUser?.uid || userData?.uid);
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const profileUser = currentUser || userData;

  const myTasks = tasks;
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const overdueTasks = myTasks.filter(t => t.status === 'overdue');
  const onTimePct = myTasks.length > 0 ? Math.round((completedTasks.length / myTasks.length) * 100) : 0;

  const stats = [
    { label: 'Completed', value: completedTasks.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'On-Time %', value: `${onTimePct}%`, icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  const handleLogout = async () => {
    try { await logout(); } catch (err) { toast.error('Logout failed'); }
  };

  useEffect(() => {
    logInfo('ProfilePage', 'Render state:', {
      uid: userData?.uid || null,
      tasks: myTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
    });
  }, [completedTasks.length, myTasks.length, overdueTasks.length, userData?.uid]);

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error('Passwords do not match'); return; }
    if (newPwd.length < 8) { toast.error('Min 8 characters'); return; }
    setSaving(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      toast.success('Password updated!');
      setPasswordSheetOpen(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="pb-4">
      {/* Avatar + Name */}
      <div className="mb-3 flex flex-col items-center bg-[var(--bg-card)] px-5 py-8">
        <UserAvatar
          user={profileUser}
          size={80}
          showRing
        />
        <h2 className="mt-3 text-xl font-bold text-[var(--text-primary)]">
          {profileUser?.name || 'Team Member'}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {profileUser?.designation || 'Team Member'}
        </p>
        <span className="mt-2 rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary)]">
          {profileUser?.role === 'admin' ? 'Administrator' : 'Team Member'}
        </span>
      </div>

      {/* Contact Info */}
      <div className="px-4 mb-5">
        <Card>
          <CardContent className="p-0 divide-y divide-gray-50">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-teal-50 flex items-center justify-center"><Mail className="h-4 w-4 text-teal-600" /></div>
              <div className="flex-1 min-w-0"><p className="text-xs text-gray-400">Email</p><p className="text-sm text-gray-700 truncate">{userData?.email || '-'}</p></div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center"><Phone className="h-4 w-4 text-blue-600" /></div>
              <div className="flex-1"><p className="text-xs text-gray-400">Phone</p><p className="text-sm text-gray-700">{userData?.phone || '-'}</p></div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center"><MessageCircle className="h-4 w-4 text-green-600" /></div>
              <div className="flex-1"><p className="text-xs text-gray-400">WhatsApp</p><p className="text-sm text-gray-700">{userData?.whatsapp || '-'}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="px-4 mb-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">My Stats</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((stat, idx) => { const Icon = stat.icon; return (
            <Card key={idx}><CardContent className="p-3 flex flex-col items-center text-center">
              <div className={`h-9 w-9 rounded-full ${stat.bg} flex items-center justify-center mb-2`}><Icon className={`h-4 w-4 ${stat.color}`} /></div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{stat.label}</p>
            </CardContent></Card>
          ); })}
        </div>
      </div>

      {/* ── MY SALARY SECTION ── */}
      {profileUser?.uid && <MySalarySection uid={profileUser.uid} />}

      {/* Actions */}
      <div className="px-4 space-y-3">
        <Button variant="outline" className="w-full min-h-[44px] justify-start" onClick={() => setPasswordSheetOpen(true)}>
          <Lock className="h-4 w-4 mr-3 text-gray-500" />Change Password
        </Button>
        <Button variant="outline-destructive" className="w-full min-h-[44px] justify-start border-red-200 text-red-600 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-3" />Logout
        </Button>
      </div>

      {/* Change Password Sheet */}
      <Sheet open={passwordSheetOpen} onOpenChange={setPasswordSheetOpen}>
        <SheetContent><SheetHeader><SheetTitle>Change Password</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-4">
            <div className="space-y-2"><Label htmlFor="currentPwd">Current Password</Label><Input id="currentPwd" type="password" placeholder="Enter current password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="newPwd">New Password</Label><Input id="newPwd" type="password" placeholder="Enter new password" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="confirmPwd">Confirm</Label><Input id="confirmPwd" type="password" placeholder="Confirm new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></div>
            <Button className="w-full min-h-[44px]" onClick={handleChangePassword} disabled={saving}>{saving ? 'Saving...' : 'Save Password'}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

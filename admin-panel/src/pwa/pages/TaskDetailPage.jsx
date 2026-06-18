import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Briefcase, User, Clock, AlertTriangle,
  Check, Percent, IndianRupee, CalendarClock, ChevronRight,
  FileText, Flag, CheckCircle2, ClipboardList, Edit3, Send
} from 'lucide-react';
import {
  serverTimestamp, collection, query, where, getDocs, doc, updateDoc, addDoc
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useToast } from '../hooks/useToast';
import { db } from '../lib/firebase';
import { COLLECTIONS, addDocument } from '../lib/firestore-helpers';
import { notify } from '../lib/notify';
import { formatDate as fmtDate } from '../lib/helpers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import ActionLoader from '../components/ActionLoader';

/* ─── helpers ───────────────────────────────────────────────────── */
const formatDate = (ts) => {
  if (!ts) return 'N/A';
  const d = ts?.toDate?.() ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const HERO_IMAGE = '/task_hero_4.png';

const STATUS_MAP = {
  completed: { label: 'Completed',   color: '#3B4731', bg: '#EEF1E9', border: '#C5D5B8', bar: 'linear-gradient(90deg,#3B4731,#7CB87A)' },
  overdue:   { label: 'Overdue',     color: '#E11D48', bg: '#FBEAE9', border: '#E9C3C1', bar: 'linear-gradient(90deg,#E11D48,#FB7185)' },
  open:      { label: 'In Progress', color: '#A68F6D', bg: '#FAF6EE', border: '#DFD5C6', bar: 'linear-gradient(90deg,#A68F6D,#D4B896)' },
};

/* ─── Section heading ────────────────────────────────────────────── */
const SectionTitle = ({ children }) => (
  <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase mb-3 px-5">{children}</p>
);

/* ─── Info row ───────────────────────────────────────────────────── */
const InfoRow = ({ icon: Icon, label, value, accent }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <span className="text-[12px] text-slate-500 font-medium">{label}</span>
    </div>
    <span className={`text-[12px] font-bold text-right max-w-[55%] truncate ${accent || 'text-slate-800'}`}>{value}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════ */
export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const toast = useToast();

  const { tasks, loading: tasksLoading, updateCompletion } = useTasks(userData?.uid);
  const { projects, loading: projectsLoading } = useProjects(userData?.uid);

  const task = tasks.find(t => t.id === taskId);
  const project = projects.find(p => p.id === task?.projectId);
  const st = STATUS_MAP[task?.status] || STATUS_MAP.open;
  const heroImg = HERO_IMAGE;
  const completion = task?.completionPercent || 0;
  const isCompleted = task?.status === 'completed';
  const hasPendingReschedule = task?.rescheduleRequest?.status === 'pending';

  /* sheets */
  const [updateOpen, setUpdateOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  /* form state */
  const [slider, setSlider] = useState(0);
  const [expActivity, setExpActivity] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [resDate, setResDate] = useState('');
  const [resReason, setResReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (task) setSlider(task.completionPercent || 0); }, [task]);

  /* ─── Handlers ──────────────────────────────────────────────────── */
  const handleUpdateCompletion = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await updateCompletion(task.id, slider, task.title);
      toast.success('Progress updated!');
      if (slider === 100) {
        notify('task_completed', {
          whatsappNumber: '',
          memberName: userData?.displayName || userData?.name || 'Team Member',
          taskName: task.title,
          projectName: project?.name || 'Unknown Project',
          completedOn: fmtDate(new Date()),
        });
      }
      setUpdateOpen(false);
    } catch (err) {
      toast.error(err?.code === 'permission-denied' ? 'Permission denied. Contact admin.' : 'Failed: ' + err.message);
    } finally { setSaving(false); }
  };

  const handleAddExpense = async () => {
    if (!task || !expActivity || !expAmount) return;
    setSaving(true);
    try {
      await addDocument(db, COLLECTIONS.expenses, {
        activity: expActivity,
        amount: Number(expAmount),
        assignedTo: userData?.uid || '',
        assignedToName: userData?.displayName || userData?.name || '',
        createdAt: serverTimestamp(),
        projectId: task.projectId,
        taskId: task.id,
      }, 'save task expense');
      toast.success('Expense added!');
      setExpenseOpen(false);
      setExpActivity(''); setExpAmount('');
    } catch (err) {
      toast.error(err?.code === 'permission-denied' ? 'Permission denied. Contact admin.' : 'Failed: ' + err.message);
    } finally { setSaving(false); }
  };

  const handleRequestReschedule = async () => {
    if (!task || !resDate || !resReason) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.tasks, task.id), {
        rescheduleRequest: {
          requestedBy: userData?.uid,
          requestedByName: userData?.displayName || userData?.name || 'Team Member',
          suggestedDate: new Date(resDate),
          reason: resReason,
          requestedAt: serverTimestamp(),
          status: 'pending'
        },
        updatedAt: serverTimestamp()
      });
      const q = query(collection(db, COLLECTIONS.users), where('role', '==', 'admin'));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d =>
        addDoc(collection(db, `notifications/${d.id}/items`), {
          title: 'Reschedule Request',
          body: `${userData?.displayName || userData?.name || 'Member'} requested reschedule for: ${task.title}`,
          type: 'task', read: false, createdAt: serverTimestamp(), relatedId: task.id
        })
      ));
      toast.success('Request sent to admin');
      setRescheduleOpen(false);
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally { setSaving(false); }
  };

  /* ─── Loading ───────────────────────────────────────────────────── */
  if (tasksLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Fake hero */}
        <div className="w-full bg-slate-100 animate-pulse" style={{ aspectRatio: '16/9' }} />
        <div className="px-5 pt-5 space-y-3">
          <div className="h-6 bg-slate-100 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
          <div className="h-2 bg-slate-100 rounded-full animate-pulse mt-4" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-slate-300" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Task not found</h2>
        <p className="text-slate-400 text-sm mb-6">This task doesn't exist or you don't have access.</p>
        <button onClick={() => navigate('/pwa/tasks')} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm">
          Back to Tasks
        </button>
      </div>
    );
  }

  /* ─── Render ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white font-sans">
      <ActionLoader visible={saving} message={saving ? 'Saving changes…' : ''} />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <img
          src={heroImg}
          alt={task.title}
          className="w-full h-full object-cover object-center scale-110 transition-transform duration-700"
          style={{ transformOrigin: 'center center' }}
        />
        {/* Dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

        {/* Back button — top left */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center active:scale-90 transition-transform"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>

        {/* Status chip — top right */}
        <div
          className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase backdrop-blur-sm"
          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
        >
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.color }} />
            {st.label}
          </span>
        </div>

        {/* Title + project on image bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          {project && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Briefcase className="h-3 w-3 text-white/70" />
              <span className="text-[10px] text-white/75 font-semibold tracking-wider uppercase">{project.name}</span>
            </div>
          )}
          <h1 className="text-white text-[20px] font-black leading-tight drop-shadow-sm">{task.title}</h1>
        </div>
      </div>

      {/* ── PROGRESS BAR ─────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">Completion</span>
          <span className="text-sm font-black text-slate-800">{completion}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${completion}%`, background: st.bar }}
          />
        </div>
        {task.status === 'overdue' && (
          <p className="text-[10px] font-bold text-[#E11D48] mt-1.5">⚠ {task.overdueDays} days overdue</p>
        )}
      </div>

      {/* ── DESCRIPTION ──────────────────────────────────────────── */}
      {task.description && (
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase mb-2">About</p>
          <p className="text-[13px] text-slate-600 leading-relaxed">{task.description}</p>
        </div>
      )}

      {/* ── DETAILS ──────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-slate-100">
        <SectionTitle>Details</SectionTitle>
        <div className="bg-slate-50 rounded-2xl px-4">
          <InfoRow icon={Calendar}  label="Due Date"    value={formatDate(task.targetDate)} accent={task.status === 'overdue' ? 'text-[#E11D48]' : ''} />
          <InfoRow icon={Calendar}  label="Assigned Date" value={formatDate(task.assignedDate || task.createdAt)} />
          <InfoRow icon={Clock}     label="Start Date"  value={formatDate(task.startDate || task.createdAt)} />
          <InfoRow icon={User}      label="Assigned To" value={task.assignedToName || userData?.name || 'You'} />
          <InfoRow icon={Briefcase} label="Project"     value={project?.name || 'General'} />
          {task.priority && <InfoRow icon={Flag} label="Priority" value={task.priority} />}
          {task.category && <InfoRow icon={ClipboardList} label="Category" value={task.category} />}
        </div>
      </div>

      {/* ── NOTES ────────────────────────────────────────────────── */}
      {task.notes && (
        <div className="px-5 py-4 border-b border-slate-100">
          <SectionTitle>Notes</SectionTitle>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex gap-2.5">
              <FileText className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-800 leading-relaxed">{task.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── PENDING RESCHEDULE ALERT ──────────────────────────────── */}
      {hasPendingReschedule && (
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CalendarClock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-amber-800">Reschedule Pending Admin Approval</p>
                <p className="text-[11px] text-amber-600 mt-0.5">Requested: {formatDate(task.rescheduleRequest?.suggestedDate)}</p>
                {task.rescheduleRequest?.reason && (
                  <p className="text-[11px] text-amber-600 mt-0.5 italic">"{task.rescheduleRequest.reason}"</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLETION SUMMARY (shown when 100%) ─────────────────── */}
      {isCompleted && (
        <div className="px-5 py-4 border-b border-slate-100">
          <SectionTitle>Completion Summary</SectionTitle>
          <div className="bg-[#EEF1E9] border border-[#C5D5B8] rounded-2xl overflow-hidden">
            {/* success header */}
            <div className="bg-[#3B4731] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-white text-[13px] font-black">Task Completed 🎉</p>
                <p className="text-white/60 text-[10px]">Great work! All done.</p>
              </div>
            </div>
            <div className="px-4 divide-y divide-[#C5D5B8]/50">
              {[
                { l: 'Task',          v: task.title },
                { l: 'Project',       v: project?.name || 'General' },
                { l: 'Completed By',  v: task.assignedToName || userData?.name },
                { l: 'Due Date Was',  v: formatDate(task.targetDate) },
                ...(task.updatedAt ? [{ l: 'Completed On', v: formatDate(task.updatedAt) }] : []),
              ].map(({ l, v }) => (
                <div key={l} className="flex items-center justify-between py-2.5">
                  <span className="text-[11px] font-semibold text-[#5A7349]">{l}</span>
                  <span className="text-[11px] font-black text-[#3B4731] text-right max-w-[55%] truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIONS (hidden for completed tasks) ─────────────────── */}
      {!isCompleted && (
        <div className="px-5 py-4 border-b border-slate-100">
          <SectionTitle>Actions</SectionTitle>
          <div className="space-y-2.5">

            {/* Update Progress */}
            <button
              onClick={() => { setSlider(task.completionPercent || 0); setUpdateOpen(true); }}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-900 text-white rounded-2xl active:scale-[0.99] transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Percent className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold">Update Progress</p>
                  <p className="text-[10px] text-white/60">Currently {task.completionPercent || 0}% complete</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/50" />
            </button>

            {/* Add Expense */}
            {task.projectId && (
              <button
                onClick={() => { setExpActivity(''); setExpAmount(''); setExpenseOpen(true); }}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-slate-200 rounded-2xl active:scale-[0.99] transition-all hover:bg-slate-50 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <IndianRupee className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-bold text-slate-800">Add Expense</p>
                    <p className="text-[10px] text-slate-400">Record material or labour cost</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            )}

            {/* Request Reschedule */}
            <button
              onClick={() => { setResDate(''); setResReason(''); setRescheduleOpen(true); }}
              disabled={hasPendingReschedule}
              className={`w-full flex items-center justify-between px-4 py-3.5 bg-white border border-slate-200 rounded-2xl active:scale-[0.99] transition-all hover:bg-slate-50 shadow-sm ${hasPendingReschedule ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <CalendarClock className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold text-slate-800">Request Reschedule</p>
                  <p className="text-[10px] text-slate-400">
                    {hasPendingReschedule ? 'Pending admin approval' : 'Propose a new due date'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-10" />

      {/* ═══ SHEETS ════════════════════════════════════════════════ */}

      {/* Update Progress sheet */}
      <Sheet open={updateOpen} onOpenChange={setUpdateOpen}>
        <SheetContent className="bg-white border-t border-slate-100 rounded-t-[28px]">
          <SheetHeader>
            <SheetTitle className="text-slate-800 font-black">Update Progress</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-5">
            <div className="bg-slate-50 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Task</p>
              <p className="text-[13px] font-bold text-slate-800 leading-snug">{task.title}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-slate-700 font-semibold text-sm">Completion %</Label>
                <span className="text-2xl font-black text-slate-900">{slider}%</span>
              </div>

              {/* Quick presets */}
              <div className="flex gap-2 mb-4">
                {[0, 25, 50, 75, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => setSlider(v)}
                    className={`flex-1 h-9 rounded-xl text-[11px] font-black transition-all ${
                      slider === v
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range" min="0" max="100" step="5"
                value={slider}
                onChange={e => setSlider(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            {slider === 100 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5">
                <p className="text-[12px] font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" /> Marking as Complete
                </p>
                <p className="text-[11px] text-red-500 mt-1">This will finalize the task. Expenses can't be added after completion.</p>
              </div>
            )}

            <button
              onClick={handleUpdateCompletion}
              disabled={saving}
              className="w-full h-12 bg-slate-900 text-white rounded-2xl font-bold text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : <><Check className="h-4 w-4" /> Confirm Update</>}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Expense sheet */}
      <Sheet open={expenseOpen} onOpenChange={setExpenseOpen}>
        <SheetContent className="bg-white border-t border-slate-100 rounded-t-[28px]">
          <SheetHeader>
            <SheetTitle className="text-slate-800 font-black">Add Expense</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <div className="bg-slate-50 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Task</p>
              <p className="text-[13px] font-bold text-slate-800 leading-snug">{task.title}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-sm">Activity</Label>
              <Input
                placeholder="e.g., Material Purchase"
                value={expActivity}
                onChange={e => setExpActivity(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl h-11 text-slate-800 placeholder:text-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-sm">Amount (₹)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl h-11 text-slate-800 placeholder:text-slate-300"
              />
            </div>
            <button
              onClick={handleAddExpense}
              disabled={saving || !expActivity || !expAmount}
              className="w-full h-12 bg-emerald-600 text-white rounded-2xl font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {saving ? 'Submitting...' : <><Send className="h-4 w-4" /> Submit Expense</>}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reschedule sheet */}
      <Sheet open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <SheetContent className="bg-white border-t border-slate-100 rounded-t-[28px]">
          <SheetHeader>
            <SheetTitle className="text-slate-800 font-black">Request Reschedule</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <div className="bg-slate-50 rounded-2xl px-4 py-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Task</p>
              <p className="text-[13px] font-bold text-slate-800 leading-snug">{task.title}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-sm">Suggested New Date</Label>
              <Input
                type="date"
                value={resDate}
                onChange={e => setResDate(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl h-11 text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-sm">Reason</Label>
              <textarea
                className="w-full min-h-[100px] p-3 text-[13px] border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 text-slate-800 placeholder:text-slate-300"
                placeholder="Why do you need more time?"
                value={resReason}
                onChange={e => setResReason(e.target.value)}
              />
            </div>
            <button
              onClick={handleRequestReschedule}
              disabled={saving || !resDate || !resReason}
              className="w-full h-12 bg-amber-500 text-amber-950 rounded-2xl font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {saving ? 'Submitting...' : <><Send className="h-4 w-4" /> Submit Request</>}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

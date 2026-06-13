import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 BarChart, Bar, AreaChart, Area,
 PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
 PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
 Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
 TrendingUp, TrendingDown, DollarSign, CheckCircle2, AlertTriangle,
 Clock, Users, FolderOpen, Plus, ChevronRight, FileText,
 CalendarDays, CreditCard, MessageSquare, Award,
 Zap, Settings, Eye, EyeOff, Timer, ArrowUpRight, Activity,
 Briefcase, Receipt, BarChart3, Sparkles, Loader2, ArrowRight
} from 'lucide-react';

import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTeam } from '../hooks/useTeam';
import { usePayments } from '../hooks/usePayments';
import { useEnquiries } from '../hooks/useEnquiries';
import { useFollowups } from '../hooks/useFollowUps';
import { formatCurrency, formatLakhs } from '../lib/formatters';
import CountUpNumber from '../components/ui/CountUpNumber';
import { SkeletonDashboard } from '../components/ui/Skeleton';
import ProjectsPopup from '../components/popups/ProjectsPopup';
import TasksPopup    from '../components/popups/TasksPopup';
import PaymentsPopup from '../components/popups/PaymentsPopup';
import TeamPopup     from '../components/popups/TeamPopup';
import { RankBadge } from '../components/ui/TextIndicators';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../hooks/useAuth';

function LiveClock() {
 const [now, setNow] = useState(new Date());
 useEffect(() => {
  const interval = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(interval);
 }, []);
 return (
  <div className="text-right hidden sm:block">
   <p className="text-xl font-semibold text-white/90 tabular-nums tracking-tight">
    {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
   </p>
   <p className="text-xs text-white/50 mt-0.5">
    {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
   </p>
  </div>
 );
}

/* Google-style widget card */
function Widget({ title, subtitle, children, className = '', action, noPad }) {
 return (
  <div className={`card ${noPad ? '' : 'p-5'} ${className}`}>
   {(title || action) && (
    <div className={`flex items-center justify-between ${noPad ? 'px-5 pt-5 pb-4' : 'mb-4'}`}>
     <div>
      {title && <h3 className="text-[13px] font-semibold text-gray-800">{title}</h3>}
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
     </div>
     {action}
    </div>
   )}
   <div className={noPad ? 'px-5 pb-5' : ''}>{children}</div>
  </div>
 );
}

const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#00bcd4'];

function normalizeDate(val) {
 if (!val) return null;
 if (typeof val.toDate === 'function') return val.toDate();
 const d = new Date(val);
 return isNaN(d.getTime()) ? null : d;
}



export default function DashboardPage() {
 const navigate = useNavigate();
 const { isGhostAdmin } = useAuth();
 const { projects, loading: projLoading } = useProjects();
 const { tasks, loading: taskLoading } = useTasks();
 const { members, loading: teamLoading } = useTeam();
 const { payments, loading: payLoading } = usePayments();
 const { enquiries, loading: enqLoading } = useEnquiries();
 const { followups, loading: fuLoading } = useFollowups();

 const [widgetConfig, setWidgetConfig] = useState(() => {
  try {
   return JSON.parse(localStorage.getItem('dashboard_widgets') || 'null') || {
    quickActions: true, alerts: true, teamOverview: true,
    timeline: true, sparklines: true, upcomingDeadlines: true,
    performance: true, charts: true, weeklyTrend: true,
   };
  } catch { return {
   quickActions: true, alerts: true, teamOverview: true,
   timeline: true, sparklines: true, upcomingDeadlines: true,
   performance: true, charts: true, weeklyTrend: true,
  }; }
 });
 const [showCustomize, setShowCustomize] = useState(false);
 const [popup, setPopup] = useState(null);

 const toggleWidget = (key) => {
  const next = { ...widgetConfig, [key]: !widgetConfig[key] };
  setWidgetConfig(next);
  localStorage.setItem('dashboard_widgets', JSON.stringify(next));
 };

 const loading = projLoading || taskLoading || teamLoading || payLoading || enqLoading || fuLoading;

 const teamMembers = useMemo(() => members.filter(m => m.role === 'member'), [members]);
 const activeProjects = useMemo(() => projects.filter(p => p.status !== 'completed'), [projects]);
 const openTasks = useMemo(() => tasks.filter(t => t.status !== 'completed'), [tasks]);
 const overdueTasks = useMemo(() => tasks.filter(t => t.status === 'overdue'), [tasks]);
 const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);
 const overduePayments = useMemo(() =>
  payments.filter(p => p.paymentStatus !== 'received' && (p.overdueDays || 0) > 0), [payments]);
 const totalReceivable = useMemo(() =>
  payments.filter(p => p.paymentStatus !== 'received').reduce((s, p) => s + Number(p.amount || 0) - Number(p.totalPaid || 0), 0), [payments]);
 const totalReceived = useMemo(() =>
  payments.filter(p => p.paymentStatus === 'received').reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);
 const openEnquiries = useMemo(() => enquiries.filter(e => e.status !== 'closed'), [enquiries]);
 const overdueEnquiries = useMemo(() => enquiries.filter(e => e.status === 'overdue'), [enquiries]);
 const pendingFollowups = useMemo(() => followups.filter(f => f.status !== 'closed'), [followups]);
 const totalPOValue = useMemo(() => projects.reduce((s, p) => s + Number(p.poValue || 0), 0), [projects]);
 const totalExpense = useMemo(() => projects.reduce((s, p) => s + Number(p.totalExpense || 0), 0), [projects]);

 const memberStats = useMemo(() => {
  return teamMembers.map(m => {
   const memberTasks = tasks.filter(t => t.assignedTo === m.id);
   const completed = memberTasks.filter(t => t.status === 'completed').length;
   const overdue = memberTasks.filter(t => t.status === 'overdue').length;
   const open = memberTasks.filter(t => t.status === 'open').length;
   const total = memberTasks.length;
   const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
   return { ...m, completed, overdue, open, total, completionRate };
  }).sort((a, b) => b.completed - a.completed);
 }, [teamMembers, tasks]);

 const weeklyData = useMemo(() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  return days.map((name, i) => {
   const day = new Date(weekStart);
   day.setDate(weekStart.getDate() + i);
   const dayStr = day.toISOString().split('T')[0];
   const tasksCreated = tasks.filter(t => {
    const d = normalizeDate(t.createdAt);
    return d && d.toISOString().split('T')[0] === dayStr;
   }).length;
   const tasksCompleted = tasks.filter(t => {
    const d = normalizeDate(t.completedAt || t.updatedAt);
    return t.status === 'completed' && d && d.toISOString().split('T')[0] === dayStr;
   }).length;
   return { name, created: tasksCreated, completed: tasksCompleted };
  });
 }, [tasks]);

 const taskStatusData = useMemo(() => [
  { name: 'Open', value: openTasks.filter(t => t.status === 'open').length, color: '#1a73e8' },
  { name: 'Overdue', value: overdueTasks.length, color: '#ea4335' },
  { name: 'Completed', value: completedTasks.length, color: '#34a853' },
 ], [openTasks, overdueTasks, completedTasks]);

 const upcomingDeadlines = useMemo(() => {
  const now = new Date();
  const weekLater = new Date();
  weekLater.setDate(now.getDate() + 7);
  const deadlines = [];
  tasks.filter(t => t.status !== 'completed').forEach(t => {
   const d = normalizeDate(t.targetDate);
   if (d && d >= now && d <= weekLater) deadlines.push({ ...t, type: 'task', dueDate: d });
  });
  payments.filter(p => p.paymentStatus !== 'received').forEach(p => {
   const d = normalizeDate(p.targetPaymentDate);
   if (d && d >= now && d <= weekLater) deadlines.push({ ...p, type: 'payment', dueDate: d, title: `${p.customerName} - ${formatCurrency(p.amount)}` });
  });
  enquiries.filter(e => e.status !== 'closed').forEach(e => {
   const d = normalizeDate(e.targetDate);
   if (d && d >= now && d <= weekLater) deadlines.push({ ...e, type: 'enquiry', dueDate: d, title: e.customerName || e.taskType });
  });
  return deadlines.sort((a, b) => a.dueDate - b.dueDate).slice(0, 8);
 }, [tasks, payments, enquiries]);

 const monthlyTrend = useMemo(() => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
   const d = new Date();
   d.setMonth(d.getMonth() - i);
   const label = d.toLocaleDateString('en-IN', { month: 'short' });
   const monthNum = d.getMonth();
   const yearNum = d.getFullYear();
   const created = tasks.filter(t => {
    const td = normalizeDate(t.createdAt);
    return td && td.getMonth() === monthNum && td.getFullYear() === yearNum;
   }).length;
   const done = tasks.filter(t => {
    const td = normalizeDate(t.completedAt || t.updatedAt);
    return t.status === 'completed' && td && td.getMonth() === monthNum && td.getFullYear() === yearNum;
   }).length;
   months.push({ name: label, created, completed: done });
  }
  return months;
 }, [tasks]);

 const radarData = useMemo(() => {
  return memberStats.slice(0, 5).map(m => ({
   name: m.name.split(' ')[0],
   completed: m.completed,
   open: m.open,
   overdue: m.overdue,
  }));
 }, [memberStats]);

 if (loading) return <SkeletonDashboard />;

 /* ------------------------------------------------------------------ */
 return (
  <div className="space-y-5 page-transition" style={{ background: '#f8f9fa', minHeight: '100vh', padding: '0' }}>

   {/* ── HERO BANNER ─────────────────────────────────────── */}
   <div style={{
    background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 60%, #1565c0 100%)',
    padding: '28px 32px',
    position: 'relative',
    overflow: 'hidden',
   }}>
    {/* Decorative circles */}
    <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
    <div style={{ position: 'absolute', bottom: '-60px', right: '200px', width: '160px', height: '160px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />

    <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
     <div>
      <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">Business Command Center</p>
      <h1 className="text-2xl font-semibold text-white">Welcome back! Here's your overview.</h1>
      <div className="flex items-center gap-5 mt-3 flex-wrap">
       <div className="flex items-center gap-1.5 text-sm text-blue-100">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        <FolderOpen className="w-3.5 h-3.5" />
        <span><strong className="text-white">{activeProjects.length}</strong> Active Projects</span>
       </div>
       <div className="flex items-center gap-1.5 text-sm text-blue-100">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span><strong className="text-white">{openTasks.length}</strong> Open Tasks</span>
       </div>
       <div className="flex items-center gap-1.5 text-sm text-blue-100">
        <DollarSign className="w-3.5 h-3.5" />
        <span><strong className="text-white">{formatLakhs(totalPOValue)}</strong> Portfolio</span>
       </div>
      </div>
     </div>
     <div className="flex items-center gap-3">
      <button
       onClick={() => setShowCustomize(!showCustomize)}
       className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 transition-all border border-white/10"
      >
       <Settings className="w-3.5 h-3.5" /> Customize
      </button>
      <LiveClock />
     </div>
    </div>
   </div>

   {/* Content wrapper with padding */}
   <div className="px-6 pb-6 space-y-5">

   {/* ── CUSTOMIZE PANEL ──────────────────────────────────── */}
   {showCustomize && (
    <div className="card p-4">
     <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Toggle Widgets</h3>
     <div className="flex flex-wrap gap-2">
      {[
       { key: 'quickActions', label: 'Quick Actions' },
       { key: 'alerts', label: 'Smart Alerts' },
       { key: 'teamOverview', label: 'Team Overview' },
       { key: 'timeline', label: 'Activity' },
       { key: 'sparklines', label: 'Sparklines' },
       { key: 'upcomingDeadlines', label: 'Deadlines' },
       { key: 'performance', label: 'Top Performers' },
       { key: 'charts', label: 'Charts' },
       { key: 'weeklyTrend', label: 'Weekly Trend' },
      ].map(w => (
       <button
        key={w.key}
        onClick={() => toggleWidget(w.key)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
         widgetConfig[w.key]
          ? 'bg-[#e8f0fe] border-[#c5d7fb] text-[#1a73e8]'
          : 'bg-white border-gray-200 text-gray-400'
        }`}
       >
        {widgetConfig[w.key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        {w.label}
       </button>
      ))}
     </div>
    </div>
   )}

   {/* ── STAT CARDS ───────────────────────────────────────── */}
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {[
     {
      label: 'Active Projects',
      value: activeProjects.length,
      icon: FolderOpen,
      iconBg: '#e8f0fe',
      iconColor: '#1a73e8',
      sub: `${formatLakhs(totalPOValue)} PO Value`,
      trend: `${projects.length > 0 ? Math.round((activeProjects.length / projects.length) * 100) : 0}% active`,
      trendUp: true,
      onClick: () => setPopup('projects'),
     },
     {
      label: 'Open Tasks',
      value: openTasks.length,
      icon: CheckCircle2,
      iconBg: '#e6f4ea',
      iconColor: '#34a853',
      sub: `${overdueTasks.length} overdue`,
      trend: overdueTasks.length === 0 ? 'All on track' : `${overdueTasks.length} overdue`,
      trendUp: overdueTasks.length === 0,
      onClick: () => setPopup('tasks'),
     },
     {
      label: 'Receivables',
      value: totalReceivable,
      icon: DollarSign,
      iconBg: '#fef9e0',
      iconColor: '#f9ab00',
      sub: `${overduePayments.length} overdue payments`,
      trend: overduePayments.length === 0 ? 'All clear' : `${overduePayments.length} overdue`,
      trendUp: overduePayments.length === 0,
      isCurrency: true,
      onClick: () => setPopup('payments'),
     },
     {
      label: 'Team Members',
      value: teamMembers.filter(m => m.status === 'active').length,
      icon: Users,
      iconBg: '#fce8e6',
      iconColor: '#ea4335',
      sub: `${teamMembers.length} total`,
      trend: `${completedTasks.length} tasks done`,
      trendUp: true,
      onClick: () => setPopup('team'),
     },
    ].map((stat, i) => {
     const Icon = stat.icon;
     return (
      <div
       key={i}
       onClick={stat.onClick}
       className="card p-5 cursor-pointer stagger-item"
      >
       <div className="flex items-start justify-between mb-3">
        <div
         className="w-10 h-10 rounded-xl flex items-center justify-center"
         style={{ background: stat.iconBg }}
        >
         <Icon className="w-5 h-5" style={{ color: stat.iconColor }} />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stat.trendUp ? 'bg-[#e6f4ea] text-[#34a853]' : 'bg-[#fce8e6] text-[#ea4335]'}`}>
         {stat.trendUp ? '↑' : '↓'} {stat.trend}
        </span>
       </div>
       <p className="text-2xl font-semibold text-gray-900">
        {stat.isCurrency
         ? <CountUpNumber end={stat.value} formatter={v => formatCurrency(Math.round(v))} />
         : <CountUpNumber end={stat.value} />
        }
       </p>
       <p className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</p>
       <p className="text-[11px] text-gray-400 mt-1">{stat.sub}</p>
      </div>
     );
    })}
   </div>

   {/* ── QUICK ACTIONS ────────────────────────────────────── */}
   {widgetConfig.quickActions && (
    <div className="flex gap-2 flex-wrap">
     {[
      { label: 'New Task', icon: Plus, color: '#1a73e8', bg: '#e8f0fe', onClick: () => navigate('/projects') },
      { label: 'New Enquiry', icon: FileText, color: '#34a853', bg: '#e6f4ea', onClick: () => navigate('/enquiry') },
      { label: 'New Payment', icon: CreditCard, color: '#f9ab00', bg: '#fef9e0', onClick: () => navigate('/payments') },
      { label: 'Follow-Up', icon: MessageSquare, color: '#ea4335', bg: '#fce8e6', onClick: () => navigate('/followup') },
     ].map((action, i) => {
      const Icon = action.icon;
      return (
       <button
        key={i}
        onClick={action.onClick}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-white hover:shadow-md transition-all duration-150 hover:-translate-y-0.5"
        style={{ color: action.color }}
       >
        <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: action.bg }}>
         <Icon className="w-3 h-3" />
        </span>
        {action.label}
       </button>
      );
     })}
    </div>
   )}



   {/* ── SMART ALERTS ─────────────────────────────────────── */}
   {widgetConfig.alerts && (overdueTasks.length > 0 || overduePayments.length > 0 || overdueEnquiries.length > 0 || pendingFollowups.length > 0) && (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
     {overdueTasks.length > 0 && (
      <button onClick={() => navigate('/projects')} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#fce8e6] border border-[#f5c6c2] text-left hover:shadow-md transition-all">
       <AlertTriangle className="w-4 h-4 text-[#d93025] flex-shrink-0" />
       <div className="min-w-0">
        <p className="text-xs font-semibold text-[#d93025]">{overdueTasks.length} Overdue Tasks</p>
        <p className="text-[10px] text-[#d93025]/70">Needs attention</p>
       </div>
       <ChevronRight className="w-3.5 h-3.5 text-[#d93025] ml-auto flex-shrink-0" />
      </button>
     )}
     {overduePayments.length > 0 && (
      <button onClick={() => navigate('/payments')} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#fef9e0] border border-[#fde47a] text-left hover:shadow-md transition-all">
       <DollarSign className="w-4 h-4 text-[#f9ab00] flex-shrink-0" />
       <div className="min-w-0">
        <p className="text-xs font-semibold text-[#f29900]">{overduePayments.length} Overdue Payments</p>
        <p className="text-[10px] text-[#f29900]/70">{formatCurrency(overduePayments.reduce((s, p) => s + Number(p.amount || 0), 0))} pending</p>
       </div>
       <ChevronRight className="w-3.5 h-3.5 text-[#f29900] ml-auto flex-shrink-0" />
      </button>
     )}
     {overdueEnquiries.length > 0 && (
      <button onClick={() => navigate('/enquiry')} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#fef9e0] border border-[#fde47a] text-left hover:shadow-md transition-all">
       <FileText className="w-4 h-4 text-[#f9ab00] flex-shrink-0" />
       <div className="min-w-0">
        <p className="text-xs font-semibold text-[#f29900]">{overdueEnquiries.length} Overdue Enquiries</p>
        <p className="text-[10px] text-[#f29900]/70">Need follow-up</p>
       </div>
       <ChevronRight className="w-3.5 h-3.5 text-[#f29900] ml-auto flex-shrink-0" />
      </button>
     )}
     {pendingFollowups.length > 0 && (
      <button onClick={() => navigate('/followup')} className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#e8f0fe] border border-[#c5d7fb] text-left hover:shadow-md transition-all">
       <CalendarDays className="w-4 h-4 text-[#1a73e8] flex-shrink-0" />
       <div className="min-w-0">
        <p className="text-xs font-semibold text-[#1a73e8]">{pendingFollowups.length} Pending Follow-ups</p>
        <p className="text-[10px] text-[#1a73e8]/70">Scheduled actions</p>
       </div>
       <ChevronRight className="w-3.5 h-3.5 text-[#1a73e8] ml-auto flex-shrink-0" />
      </button>
     )}
    </div>
   )}

   {/* ── SPARKLINES ───────────────────────────────────────── */}
   {widgetConfig.sparklines && (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
     {[
      { label: 'Tasks This Week', value: <CountUpNumber end={weeklyData.reduce((s, d) => s + d.completed, 0)} />, dataKey: 'completed', data: weeklyData, stroke: '#1a73e8', fill: '#e8f0fe' },
      { label: 'Total Received', value: <CountUpNumber end={totalReceived} formatter={v => formatCurrency(Math.round(v))} />, dataKey: 'completed', data: monthlyTrend, stroke: '#34a853', fill: '#e6f4ea' },
      { label: 'Open Enquiries', value: <CountUpNumber end={openEnquiries.length} />, dataKey: 'created', data: monthlyTrend, stroke: '#f9ab00', fill: '#fef9e0' },
     ].map((s, i) => (
      <div key={i} className="card p-4 flex items-center gap-4">
       <div>
        <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
        <p className="text-xl font-semibold text-gray-900 mt-0.5">{s.value}</p>
       </div>
       <div className="flex-1 h-10">
        <ResponsiveContainer width="100%" height={40}>
         <AreaChart data={s.data}>
          <Area type="monotone" dataKey={s.dataKey} stroke={s.stroke} fill={s.fill} strokeWidth={2} />
         </AreaChart>
        </ResponsiveContainer>
       </div>
      </div>
     ))}
    </div>
   )}

   {/* ── CHARTS ROW ───────────────────────────────────────── */}
   {widgetConfig.charts && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
     <Widget title="Monthly Tasks" subtitle="Created vs Completed">
      <ResponsiveContainer width="100%" height={220}>
       <BarChart data={monthlyTrend} barSize={10}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aa0a6' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Bar dataKey="created" fill="#c5d7fb" radius={[4, 4, 0, 0]} name="Created" />
        <Bar dataKey="completed" fill="#1a73e8" radius={[4, 4, 0, 0]} name="Completed" />
       </BarChart>
      </ResponsiveContainer>
     </Widget>

     <Widget title="Task Status" subtitle="Distribution breakdown">
      <ResponsiveContainer width="100%" height={220}>
       <PieChart>
        <Pie
         data={taskStatusData}
         cx="50%" cy="45%"
         innerRadius={55} outerRadius={80}
         paddingAngle={3}
         dataKey="value"
        >
         {taskStatusData.map((entry, idx) => (
          <Cell key={idx} fill={entry.color} />
         ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
       </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 mt-1">
       {taskStatusData.map(s => (
        <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-gray-500">
         <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
         {s.name}: <span className="font-semibold text-gray-800">{s.value}</span>
        </div>
       ))}
      </div>
     </Widget>

     <Widget title="Team Comparison" subtitle="Task performance radar">
      <ResponsiveContainer width="100%" height={250}>
       <RadarChart data={radarData}>
        <PolarGrid stroke="#e8eaed" />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aa0a6' }} />
        <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9aa0a6' }} />
        <Radar name="Completed" dataKey="completed" stroke="#1a73e8" fill="#1a73e8" fillOpacity={0.2} />
        <Radar name="Open" dataKey="open" stroke="#34a853" fill="#34a853" fillOpacity={0.1} />
        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
       </RadarChart>
      </ResponsiveContainer>
     </Widget>
    </div>
   )}

   {/* ── TEAM OVERVIEW + DEADLINES ────────────────────────── */}
   <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {widgetConfig.teamOverview && (
     <Widget
      title="Team Performance"
      className="col-span-1 lg:col-span-2"
      action={
       <button onClick={() => navigate('/team')} className="flex items-center gap-1 text-xs text-[#1a73e8] font-medium hover:underline">
        View All <ArrowUpRight className="w-3 h-3" />
       </button>
      }
     >
      <div className="overflow-x-auto">
      <table className="w-full">
       <thead>
        <tr className="border-b border-gray-50">
         <th className="text-left text-[11px] font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Member</th>
         <th className="text-center text-[11px] font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Open</th>
         <th className="text-center text-[11px] font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Overdue</th>
         <th className="text-center text-[11px] font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Done</th>
         <th className="text-left text-[11px] font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Progress</th>
         <th className="text-center text-[11px] font-semibold text-gray-400 pb-2.5 uppercase tracking-wide">Rank</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-gray-50">
        {memberStats.slice(0, 6).map((m, i) => (
         <tr key={m.id} className="hover:bg-[#f8f9fa] transition-colors">
          <td className="py-2.5">
           <div className="flex items-center gap-2.5">
            <UserAvatar user={m} size={30} />
            <div>
             <p className="text-xs font-medium text-gray-900">{m.name}</p>
             <p className="text-[10px] text-gray-400">{m.designation || 'Member'}</p>
            </div>
           </div>
          </td>
          <td className="text-center py-2.5">
           <span className="text-xs font-semibold text-[#1a73e8]">{m.open}</span>
          </td>
          <td className="text-center py-2.5">
           <span className={`text-xs font-semibold ${m.overdue > 0 ? 'text-[#ea4335]' : 'text-gray-300'}`}>{m.overdue}</span>
          </td>
          <td className="text-center py-2.5">
           <span className="text-xs font-semibold text-[#34a853]">{m.completed}</span>
          </td>
          <td className="py-2.5 pr-4">
           <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
             <div
              className="h-full rounded-full transition-all duration-500"
              style={{
               width: `${m.completionRate}%`,
               background: m.completionRate >= 80 ? '#34a853' : m.completionRate >= 50 ? '#f9ab00' : '#ea4335',
              }}
             />
            </div>
            <span className="text-[10px] font-semibold text-gray-400 w-7 text-right">{m.completionRate}%</span>
           </div>
          </td>
          <td className="text-center py-2.5">
           <RankBadge rank={i + 1} />
          </td>
         </tr>
        ))}
       </tbody>
      </table>
      </div>
     </Widget>
    )}

    {widgetConfig.upcomingDeadlines && (
      <Widget title="Upcoming (7 days)" subtitle="Deadlines ahead">
       {upcomingDeadlines.length === 0 ? (
        <div className="text-center py-8 text-gray-300 text-sm">
         <CalendarDays className="w-7 h-7 mx-auto mb-2 opacity-40" />
         No upcoming deadlines!
        </div>
       ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
         {upcomingDeadlines.map((item, i) => {
          const typeColors = {
           task: { bg: '#e8f0fe', text: '#1a73e8' },
           payment: { bg: '#e6f4ea', text: '#34a853' },
           enquiry: { bg: '#fef9e0', text: '#f9ab00' },
          };
          const typeIcons = { task: CheckCircle2, payment: DollarSign, enquiry: FileText };
          const TypeIcon = typeIcons[item.type] || Clock;
          const col = typeColors[item.type] || { bg: '#f1f3f4', text: '#5f6368' };
          const daysLeft = Math.ceil((item.dueDate - new Date()) / (1000 * 60 * 60 * 24));
          return (
           <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#f8f9fa] transition-colors">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: col.bg }}>
             <TypeIcon className="w-3.5 h-3.5" style={{ color: col.text }} />
            </div>
            <div className="flex-1 min-w-0">
             <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
             <p className="text-[10px] text-gray-400">{item.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
             daysLeft <= 1 ? 'bg-[#fce8e6] text-[#ea4335]' :
             daysLeft <= 3 ? 'bg-[#fef9e0] text-[#f9ab00]' :
             'bg-[#e6f4ea] text-[#34a853]'
            }`}>
             {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
            </span>
           </div>
          );
         })}
        </div>
       )}
      </Widget>
     )}
    </div>

   {/* ── WEEKLY TREND + PO VALUE ──────────────────────────── */}
   {widgetConfig.weeklyTrend && (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
     <Widget title="Weekly Task Trend" subtitle="This week's activity">
      <ResponsiveContainer width="100%" height={200}>
       <AreaChart data={weeklyData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9aa0a6' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#9aa0a6' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
        <Area type="monotone" dataKey="created" stroke="#c5d7fb" fill="#e8f0fe" strokeWidth={2} name="Created" />
        <Area type="monotone" dataKey="completed" stroke="#1a73e8" fill="#dce9fd" strokeWidth={2} name="Completed" />
       </AreaChart>
      </ResponsiveContainer>
     </Widget>

     <Widget title="Budget Utilization" subtitle="PO Value vs Expense per project">
      <div className="space-y-3.5">
       {activeProjects.slice(0, 5).map(p => {
        const utilization = p.poValue > 0 ? Math.min(100, Math.round((p.totalExpense || 0) / p.poValue * 100)) : 0;
        const color = utilization >= 80 ? '#ea4335' : utilization >= 60 ? '#f9ab00' : '#34a853';
        return (
         <div key={p.id}>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
           <span className="font-medium text-gray-600 truncate max-w-[200px]">{p.name}</span>
           <span className="font-semibold ml-2" style={{ color }}>{utilization}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
           <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${utilization}%`, background: color }}
           />
          </div>
         </div>
        );
       })}
       {activeProjects.length === 0 && (
        <p className="text-center text-gray-300 text-sm py-8">No active projects</p>
       )}
      </div>
     </Widget>
    </div>
   )}

   {/* ── ACTIVITY TIMELINE ────────────────────────────────── */}
   {widgetConfig.timeline && (
    <Widget
     title="Recent Activity"
     action={
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
       <span className="w-1.5 h-1.5 rounded-full bg-[#34a853] status-dot-pulse" />
       Live
      </div>
     }
    >
     <div className="space-y-1 max-h-[260px] overflow-y-auto">
      {(() => {
       const activities = [];
       tasks.slice(0, 5).forEach(t => { activities.push({ id: 'task-' + t.id, icon: CheckCircle2, dotClass: 'timeline-dot-task', title: t.title || 'Task update', subtitle: t.assignedToName || 'Unassigned', type: 'task', badge: t.status, date: normalizeDate(t.updatedAt || t.createdAt) }); });
       payments.slice(0, 3).forEach(p => { activities.push({ id: 'pay-' + p.id, icon: Receipt, dotClass: 'timeline-dot-payment', title: `${p.customerName} - ${formatCurrency(p.amount || 0)}`, subtitle: p.paymentStatus || 'pending', type: 'payment', badge: p.paymentStatus, date: normalizeDate(p.updatedAt || p.createdAt) }); });
       enquiries.slice(0, 3).forEach(e => { activities.push({ id: 'enq-' + e.id, icon: FileText, dotClass: 'timeline-dot-enquiry', title: e.customerName || e.taskType || 'Enquiry', subtitle: e.status || 'open', type: 'enquiry', badge: e.status, date: normalizeDate(e.updatedAt || e.createdAt) }); });
       activities.sort((a, b) => (b.date || new Date(0)) - (a.date || new Date(0)));
       return activities.slice(0, 8).map((a, idx) => {
        const Icon = a.icon;
        const timeAgo = a.date ? (() => {
         const diff = Math.floor((new Date() - a.date) / 60000);
         if (diff < 1) return 'Just now';
         if (diff < 60) return `${diff}m ago`;
         if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
         return `${Math.floor(diff / 1440)}d ago`;
        })() : '';
        const badgeColor = { completed: 'badge-green', received: 'badge-green', closed: 'badge-gray', overdue: 'badge-red', open: 'badge-blue', pending: 'badge-yellow', in_progress: 'badge-teal' }[a.badge] || 'badge-gray';
        return (
         <div key={a.id} className="timeline-item">
          <div className={`timeline-dot ${a.dotClass}`} />
          <div className="flex items-center justify-between py-1.5">
           <div className="flex items-center gap-3 min-w-0">
            <div>
             <p className="text-xs font-medium text-gray-700 truncate">{a.title}</p>
             <p className="text-[10px] text-gray-400">{a.subtitle}</p>
            </div>
           </div>
           <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`badge ${badgeColor} text-[10px]`}>{a.badge}</span>
            <span className="text-[10px] text-gray-400 tabular-nums">{timeAgo}</span>
           </div>
          </div>
         </div>
        );
       });
      })()}
      {tasks.length === 0 && payments.length === 0 && enquiries.length === 0 && (
       <p className="text-center text-gray-300 text-sm py-8">No recent activity</p>
      )}
     </div>
    </Widget>
   )}

   {/* ── FINANCIAL SUMMARY ────────────────────────────────── */}
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {[
     { label: 'Total PO Value', value: formatLakhs(totalPOValue), icon: Briefcase, color: '#1a73e8', bg: '#e8f0fe' },
     { label: 'Total Expenses', value: formatLakhs(totalExpense), icon: Receipt, color: '#f9ab00', bg: '#fef9e0' },
     { label: 'Total Received', value: formatCurrency(totalReceived), icon: DollarSign, color: '#34a853', bg: '#e6f4ea' },
     { label: 'Profit Margin', value: `${totalPOValue > 0 ? Math.round(((totalPOValue - totalExpense) / totalPOValue) * 100) : 0}%`, icon: BarChart3, color: '#ea4335', bg: '#fce8e6' },
    ].map((item, i) => {
     const Icon = item.icon;
     return (
      <div key={i} className="card p-4 flex items-center gap-3 stagger-item">
       <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.bg }}>
        <Icon className="w-4 h-4" style={{ color: item.color }} />
       </div>
       <div>
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{item.label}</p>
        <p className="text-base font-semibold text-gray-900">{item.value}</p>
       </div>
      </div>
     );
    })}
   </div>

   {/* ── TOP PERFORMERS ───────────────────────────────────── */}
   {widgetConfig.performance && memberStats.length > 0 && (
    <Widget title="Top Performers" subtitle="This month's best">
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {memberStats.slice(0, 3).map((m, i) => (
       <div
        key={m.id}
        className={`rounded-2xl p-4 text-center border transition-all hover:shadow-md ${
         i === 0 ? 'bg-gradient-to-br from-[#fef9e0] to-[#fef3c7] border-[#fde47a]' :
         i === 1 ? 'bg-gradient-to-br from-[#f1f3f4] to-[#e8eaed] border-gray-200' :
         'bg-gradient-to-br from-[#fef0e6] to-[#fde8d0] border-[#fdd1a4]'
        }`}
       >
        <div className="mb-2 flex justify-center"><RankBadge rank={i + 1} /></div>
        <div className="mb-2 flex justify-center"><UserAvatar user={m} size={44} /></div>
        <p className="font-semibold text-gray-900 text-xs">{m.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{m.designation || 'Team Member'}</p>
        <div className="mt-3 grid grid-cols-3 gap-1 text-center">
         <div>
          <p className="text-base font-bold text-[#34a853]">{m.completed}</p>
          <p className="text-[9px] text-gray-400">Done</p>
         </div>
         <div>
          <p className="text-base font-bold text-[#1a73e8]">{m.open}</p>
          <p className="text-[9px] text-gray-400">Open</p>
         </div>
         <div>
          <p className="text-base font-bold text-[#ea4335]">{m.completionRate}%</p>
          <p className="text-[9px] text-gray-400">Rate</p>
         </div>
        </div>
       </div>
      ))}
     </div>
    </Widget>
   )}

   </div>{/* end content wrapper */}

   {/* Popups */}
   <ProjectsPopup isOpen={popup === 'projects'} onClose={() => setPopup(null)} />
   <TasksPopup    isOpen={popup === 'tasks'}    onClose={() => setPopup(null)} />
   <PaymentsPopup isOpen={popup === 'payments'} onClose={() => setPopup(null)} />
   <TeamPopup     isOpen={popup === 'team'}     onClose={() => setPopup(null)} />
  </div>
 );
}

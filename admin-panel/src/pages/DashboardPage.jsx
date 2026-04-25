import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 BarChart, Bar, LineChart, Line, AreaChart, Area,
 PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
 PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
 Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
 TrendingUp, TrendingDown, DollarSign, CheckCircle2, AlertTriangle,
 Clock, Users, FolderOpen, Plus, ChevronRight, FileText,
 CalendarDays, CreditCard, MessageSquare, Award,
 Zap, Settings, Eye, EyeOff, Timer, ArrowUpRight, Activity,
 Briefcase, Receipt, BarChart3, Sparkles, Loader2
} from 'lucide-react';
import { useAIManager } from '../hooks/useAIManager';
import { getDashboardInsights } from '../lib/api';
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

// Live clock



function LiveClock() {
 const [now, setNow] = useState(new Date());

 useEffect(() => {
 const interval = setInterval(() => setNow(new Date()), 1000);
 return () => clearInterval(interval);
 }, []);

 return (
 <div className="text-right">
 <p className="text-2xl font-bold text-white live-clock tabular-nums">
 {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
 </p>
 <p className="text-xs text-white/60 mt-0.5">
 {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
 </p>
 </div>
 );
}

// Dashboard widget wrapper



function DashboardWidget({ title, children, className = '', action }) {
 return (
 <div className={`card ${className}`}>
 {(title || action) && (
 <div className="flex items-center justify-between mb-4">
 {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}
 {action}
 </div>
 )}
 {children}
 </div>
 );
}

// Chart colors


const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function normalizeDate(val) {
 if (!val) return null;
 if (typeof val.toDate === 'function') return val.toDate();
 const d = new Date(val);
 return isNaN(d.getTime()) ? null : d;
}

// AI insights widget
function AIInsightsWidget({ data }) {
  const { generateInsights, isProcessing } = useAIManager();
  const [insights, setInsights] = useState(null);

  const fetchInsights = async () => {
    const res = await generateInsights(data);
    setInsights(res);
  };

  return (
    <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100 dark:from-gray-800 dark:to-gray-900 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI Business Insights</h3>
        </div>
        <button 
          onClick={fetchInsights} 
          disabled={isProcessing}
          className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:shadow-sm flex items-center gap-1.5 transition-all"
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" /> : <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
          {insights ? 'Refresh Insights' : 'Generate Insights'}
        </button>
      </div>
      
      {isProcessing && (
        <div className="animate-pulse space-y-2 py-2">
          <div className="h-4 bg-purple-200/50 rounded w-3/4"></div>
          <div className="h-4 bg-purple-200/50 rounded w-5/6"></div>
          <div className="h-4 bg-purple-200/50 rounded w-2/3"></div>
        </div>
      )}

      {insights && !isProcessing && (
        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/60 dark:bg-black/20 p-4 rounded-xl border border-white/50 dark:border-gray-800">
          {insights}
        </div>
      )}
      
      {!insights && !isProcessing && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Click "Generate Insights" to get an AI analysis of your current active projects, overdue tasks, and pending payments.
        </p>
      )}
    </div>
  );
}

// Main dashboard



export default function DashboardPage() {
 const navigate = useNavigate();
 const { projects, loading: projLoading } = useProjects();
 const { tasks, loading: taskLoading } = useTasks();
 const { members, loading: teamLoading } = useTeam();
 const { payments, loading: payLoading } = usePayments();
 const { enquiries, loading: enqLoading } = useEnquiries();
 const { followups, loading: fuLoading } = useFollowups();

 // Widget visibility (saved to localStorage)
 const [widgetConfig, setWidgetConfig] = useState(() => {
 try {
 return JSON.parse(localStorage.getItem('dashboard_widgets') || 'null') || {
 quickActions: true, aiInsights: true, alerts: true, teamOverview: true,
 timeline: true, sparklines: true, upcomingDeadlines: true,
 performance: true, charts: true, weeklyTrend: true,
 };
 } catch { return {
 quickActions: true, aiInsights: true, alerts: true, teamOverview: true,
 timeline: true, sparklines: true, upcomingDeadlines: true,
 performance: true, charts: true, weeklyTrend: true,
 }; }
 });
 const [showCustomize, setShowCustomize] = useState(false);
 const [popup, setPopup] = useState(null);
 const [businessSummary, setBusinessSummary] = useState(null);
 const [isExplaining, setIsExplaining] = useState(false);

 const toggleWidget = (key) => {
 const next = { ...widgetConfig, [key]: !widgetConfig[key] };
 setWidgetConfig(next);
 localStorage.setItem('dashboard_widgets', JSON.stringify(next));
 };

 const loading = projLoading || taskLoading || teamLoading || payLoading || enqLoading || fuLoading;

 // Computed data
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

 // Member performance
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

 // Weekly data
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

 // Status breakdown
 const taskStatusData = useMemo(() => [
 { name: 'Open', value: openTasks.filter(t => t.status === 'open').length, color: '#3b82f6' },
 { name: 'Overdue', value: overdueTasks.length, color: '#ef4444' },
 { name: 'Completed', value: completedTasks.length, color: '#10b981' },
 ], [openTasks, overdueTasks, completedTasks]);

 // Upcoming deadlines
 const upcomingDeadlines = useMemo(() => {
 const now = new Date();
 const weekLater = new Date();
 weekLater.setDate(now.getDate() + 7);

 const deadlines = [];

 tasks.filter(t => t.status !== 'completed').forEach(t => {
 const d = normalizeDate(t.targetDate);
 if (d && d >= now && d <= weekLater) {
 deadlines.push({ ...t, type: 'task', dueDate: d });
 }
 });

 payments.filter(p => p.paymentStatus !== 'received').forEach(p => {
 const d = normalizeDate(p.targetPaymentDate);
 if (d && d >= now && d <= weekLater) {
 deadlines.push({ ...p, type: 'payment', dueDate: d, title: `${p.customerName} - ${formatCurrency(p.amount)}` });
 }
 });

 enquiries.filter(e => e.status !== 'closed').forEach(e => {
 const d = normalizeDate(e.targetDate);
 if (d && d >= now && d <= weekLater) {
 deadlines.push({ ...e, type: 'enquiry', dueDate: d, title: e.customerName || e.taskType });
 }
 });

 return deadlines.sort((a, b) => a.dueDate - b.dueDate).slice(0, 8);
 }, [tasks, payments, enquiries]);

 // Monthly charts
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

 // Radar data
 const radarData = useMemo(() => {
 return memberStats.slice(0, 5).map(m => ({
 name: m.name.split(' ')[0],
 completed: m.completed,
 open: m.open,
 overdue: m.overdue,
 }));
 }, [memberStats]);

  const handleExplainBusiness = async () => {
    setIsExplaining(true);
    const payload = {
      activeProjects: activeProjects.length,
      poValue: formatLakhs(totalPOValue),
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      overduePayments: overduePayments.length,
      totalReceivable: totalReceivable,
      teamPerformance: memberStats.map(m => ({ name: m.name, completed: m.completed, open: m.open }))
    };

    try {
      const result = await getDashboardInsights(payload);
      setBusinessSummary(result.summary || '');
      setPopup('businessSummary');
    } catch (err) {
      console.error(err);
    } finally {
      setIsExplaining(false);
    }
  };

 if (loading) return <SkeletonDashboard />;

 return (
 <div className="space-y-6 page-transition">
 {/* Welcome banner */}
 <div className="welcome-banner animated-gradient p-6 text-white">
 <div className="relative z-10 flex items-center justify-between">
 <div>
 <p className="text-teal-200 text-sm font-medium mb-1">Business Command Center</p>
 <h1 className="text-2xl font-bold">Welcome back! Here's your overview.</h1>
 <div className="flex items-center gap-6 mt-3">
 <div className="flex items-center gap-2 text-sm text-white/80">
 <FolderOpen className="w-4 h-4" />
 <span><strong className="text-white">{activeProjects.length}</strong> Active Projects</span>
 </div>
 <div className="flex items-center gap-2 text-sm text-white/80">
 <CheckCircle2 className="w-4 h-4" />
 <span><strong className="text-white">{openTasks.length}</strong> Open Tasks</span>
 </div>
 <div className="flex items-center gap-2 text-sm text-white/80">
 <DollarSign className="w-4 h-4" />
 <span><strong className="text-white">{formatLakhs(totalPOValue)}</strong> Portfolio</span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <button
 onClick={() => setShowCustomize(!showCustomize)}
 className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
 >
 <Settings className="w-3.5 h-3.5" /> Customize
 </button>
 <button
      onClick={handleExplainBusiness}
      disabled={isExplaining}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-teal-700 shadow-md hover:bg-teal-50 transition-all disabled:opacity-50"
    >
      {isExplaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {isExplaining ? 'Analyzing...' : 'Explain My Business'}
    </button>
    <LiveClock />
 </div>
 </div>
 </div>

 {/* Widget customization panel */}
 {showCustomize && (
 <div className="card bg-gray-50 border border-[var(--border-primary)] p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Toggle Dashboard Widgets</h3>
 <div className="flex flex-wrap gap-2">
 {[
 { key: 'quickActions', label: 'Quick Actions' },
 { key: 'aiInsights', label: 'AI Insights' },
 { key: 'alerts', label: 'Smart Alerts' },
 { key: 'teamOverview', label: 'Team Overview' },
 { key: 'timeline', label: 'Activity Timeline' },
 { key: 'sparklines', label: 'Sparkline Charts' },
 { key: 'upcomingDeadlines', label: 'Upcoming Deadlines' },
 { key: 'performance', label: 'Performance' },
 { key: 'charts', label: 'Charts' },
 { key: 'weeklyTrend', label: 'Weekly Trend' },
 ].map(w => (
 <button
 key={w.key}
 onClick={() => toggleWidget(w.key)}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
 widgetConfig[w.key]
 ? 'bg-teal-50 border-teal-200 text-teal-700'
 : 'bg-white border-[var(--border-primary)] text-gray-400'
 }`}
 >
 {widgetConfig[w.key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
 {w.label}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Stat cards */}
 <div className="grid grid-cols-4 gap-5">
 {[
 {
 label: 'Active Projects',
 value: activeProjects.length,
 icon: FolderOpen,
 color: 'bg-blue-50 text-blue-600',
 iconBg: 'bg-blue-100',
 sub: `${formatLakhs(totalPOValue)} PO Value`,
 trend: projects.length > 0 ? `${Math.round((activeProjects.length / projects.length) * 100)}%` : '0%',
 trendUp: true,
 },
 {
 label: 'Open Tasks',
 value: openTasks.length,
 icon: CheckCircle2,
 color: 'bg-teal-50 text-teal-600',
 iconBg: 'bg-teal-100',
 sub: `${overdueTasks.length} overdue`,
 trend: overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'On track',
 trendUp: overdueTasks.length === 0,
 },
 {
 label: 'Receivables',
 value: totalReceivable,
 icon: DollarSign,
 color: 'bg-amber-50 text-amber-600',
 iconBg: 'bg-amber-100',
 sub: `${overduePayments.length} overdue payments`,
 trend: overduePayments.length > 0 ? `${overduePayments.length} overdue` : 'All clear',
 trendUp: overduePayments.length === 0,
 isCurrency: true,
 },
 {
 label: 'Team Members',
 value: teamMembers.filter(m => m.status === 'active').length,
 icon: Users,
 color: 'bg-purple-50 text-purple-600',
 iconBg: 'bg-purple-100',
 sub: `${teamMembers.length} total`,
 trend: `${completedTasks.length} tasks done`,
 trendUp: true,
 },
 ].map((stat, i) => {
 const popupKey = ['projects','tasks','payments','team'][i];
 const Icon = stat.icon;
 return (
 <div key={i} onClick={() => setPopup(popupKey)} style={{ cursor: 'pointer' }} className="card stat-card relative overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 stagger-item">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{stat.label}</p>
 <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
 {stat.isCurrency
 ? <CountUpNumber end={stat.value} formatter={v => formatCurrency(Math.round(v))} />
 : <CountUpNumber end={stat.value} />
 }
 </p>
 <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
 </div>
 <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${stat.color.split(' ')[1]}`} />
 </div>
 </div>
 <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-500'}`}>
 {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
 {stat.trend}
 </div>
 {/* Decorative gradient overlay on hover */}
 <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${stat.iconBg} opacity-20 group-hover:opacity-30 transition-opacity`} />
 </div>
 );
 })}
 </div>

 {/* Quick actions */}
 {widgetConfig.quickActions && (
 <div className="flex gap-3">
 {[
 { label: 'New Task', icon: Plus, bg: 'bg-teal-500 hover:bg-teal-600 text-white', onClick: () => navigate('/projects') },
 { label: 'New Enquiry', icon: FileText, bg: 'bg-blue-500 hover:bg-blue-600 text-white', onClick: () => navigate('/enquiry') },
 { label: 'New Payment', icon: CreditCard, bg: 'bg-amber-500 hover:bg-amber-600 text-white', onClick: () => navigate('/payments') },
 { label: 'Follow-Up', icon: MessageSquare, bg: 'bg-purple-500 hover:bg-purple-600 text-white', onClick: () => navigate('/followup') },
 ].map((action, i) => {
 const Icon = action.icon;
 return (
 <button key={i} onClick={action.onClick} className={`quick-action-btn ${action.bg}`}>
 <Icon className="w-4 h-4" /> {action.label}
 </button>
 );
 })}
 </div>
 )}

 {/* AI Insights */}
 {widgetConfig.aiInsights && (
  <AIInsightsWidget data={{
    activeProjects: activeProjects.length,
    openTasks: openTasks.length,
    overdueTasks: overdueTasks.length,
    receivables: totalReceivable,
    overduePayments: overduePayments.length,
    totalPOValue,
    totalExpense
  }} />
 )}

 {/* Smart alerts */}
 {widgetConfig.alerts && (overdueTasks.length > 0 || overduePayments.length > 0 || overdueEnquiries.length > 0 || pendingFollowups.length > 0) && (
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 {overdueTasks.length > 0 && (
 <div className="alert-banner alert-banner-red" onClick={() => navigate('/projects')}>
 <AlertTriangle className="w-5 h-5 flex-shrink-0" />
 <div>
 <p className="font-semibold">{overdueTasks.length} Overdue Tasks</p>
 <p className="text-xs opacity-75">Require immediate attention</p>
 </div>
 <ChevronRight className="w-4 h-4 ml-auto" />
 </div>
 )}
 {overduePayments.length > 0 && (
 <div className="alert-banner alert-banner-orange" onClick={() => navigate('/payments')}>
 <DollarSign className="w-5 h-5 flex-shrink-0" />
 <div>
 <p className="font-semibold">{overduePayments.length} Overdue Payments</p>
 <p className="text-xs opacity-75">{formatCurrency(overduePayments.reduce((s, p) => s + Number(p.amount || 0), 0))} pending</p>
 </div>
 <ChevronRight className="w-4 h-4 ml-auto" />
 </div>
 )}
 {overdueEnquiries.length > 0 && (
 <div className="alert-banner alert-banner-yellow" onClick={() => navigate('/enquiry')}>
 <FileText className="w-5 h-5 flex-shrink-0" />
 <div>
 <p className="font-semibold">{overdueEnquiries.length} Overdue Enquiries</p>
 <p className="text-xs opacity-75">Need follow-up</p>
 </div>
 <ChevronRight className="w-4 h-4 ml-auto" />
 </div>
 )}
 {pendingFollowups.length > 0 && (
 <div className="alert-banner alert-banner-blue" onClick={() => navigate('/followup')}>
 <CalendarDays className="w-5 h-5 flex-shrink-0" />
 <div>
 <p className="font-semibold">{pendingFollowups.length} Pending Follow-ups</p>
 <p className="text-xs opacity-75">Scheduled actions</p>
 </div>
 <ChevronRight className="w-4 h-4 ml-auto" />
 </div>
 )}
 </div>
 )}

 {/* Sparkline mini charts */}
 {widgetConfig.sparklines && (
 <div className="grid grid-cols-3 gap-5">
 <div className="card sparkline-card">
 <div>
 <p className="text-xs text-gray-400 font-medium">Tasks This Week</p>
 <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
 <CountUpNumber end={weeklyData.reduce((s, d) => s + d.completed, 0)} />
 </p>
 </div>
 <div className="sparkline-chart">
 <ResponsiveContainer width="100%" height={40}>
 <AreaChart data={weeklyData}>
 <Area type="monotone" dataKey="completed" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 <div className="card sparkline-card">
 <div>
 <p className="text-xs text-gray-400 font-medium">Payments Received</p>
 <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
 <CountUpNumber end={totalReceived} formatter={v => formatCurrency(Math.round(v))} />
 </p>
 </div>
 <div className="sparkline-chart">
 <ResponsiveContainer width="100%" height={40}>
 <AreaChart data={monthlyTrend}>
 <Area type="monotone" dataKey="completed" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 <div className="card sparkline-card">
 <div>
 <p className="text-xs text-gray-400 font-medium">Open Enquiries</p>
 <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
 <CountUpNumber end={openEnquiries.length} />
 </p>
 </div>
 <div className="sparkline-chart">
 <ResponsiveContainer width="100%" height={40}>
 <AreaChart data={monthlyTrend}>
 <Area type="monotone" dataKey="created" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>
 )}

 {/* Main charts row */}
 {widgetConfig.charts && (
 <div className="grid grid-cols-3 gap-5">
 {/* Monthly Task Trend - Stacked Bar */}
 <DashboardWidget title="Monthly Tasks">
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={monthlyTrend}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
 <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
 <Bar dataKey="created" stackId="a" fill="#93c5fd" radius={[0, 0, 0, 0]} name="Created" />
 <Bar dataKey="completed" stackId="a" fill="#0d9488" radius={[4, 4, 0, 0]} name="Completed" />
 </BarChart>
 </ResponsiveContainer>
 </DashboardWidget>

 {/* Task Status Pie */}
 <DashboardWidget title="Task Breakdown">
 <ResponsiveContainer width="100%" height={250}>
 <PieChart>
 <Pie
 data={taskStatusData}
 cx="50%" cy="50%"
 innerRadius={55} outerRadius={85}
 paddingAngle={4}
 dataKey="value"
 >
 {taskStatusData.map((entry, idx) => (
 <Cell key={idx} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip contentStyle={{ borderRadius: 12 }} />
 </PieChart>
 </ResponsiveContainer>
 <div className="flex justify-center gap-4 -mt-2">
 {taskStatusData.map(s => (
 <div key={s.name} className="flex items-center gap-1.5 text-xs text-gray-500">
 <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
 {s.name}: {s.value}
 </div>
 ))}
 </div>
 </DashboardWidget>

 {/* Team Radar */}
 <DashboardWidget title="Team Comparison">
 <ResponsiveContainer width="100%" height={250}>
 <RadarChart data={radarData}>
 <PolarGrid stroke="#e2e8f0" />
 <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
 <Radar name="Completed" dataKey="completed" stroke="#0d9488" fill="#0d9488" fillOpacity={0.3} />
 <Radar name="Open" dataKey="open" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
 <Tooltip contentStyle={{ borderRadius: 12 }} />
 </RadarChart>
 </ResponsiveContainer>
 </DashboardWidget>
 </div>
 )}

 {/* Team overview and upcoming deadlines */}
 <div className="grid grid-cols-3 gap-5">
 {/* Team Overview Table */}
 {widgetConfig.teamOverview && (
 <DashboardWidget
 title="Team Performance"
 className="col-span-2"
 action={
 <button onClick={() => navigate('/team')} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
 View All <ArrowUpRight className="w-3 h-3" />
 </button>
 }
 >
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-gray-100">
 <th className="text-left text-xs font-medium text-gray-400 pb-3 px-3">Member</th>
 <th className="text-center text-xs font-medium text-gray-400 pb-3 px-2">Open</th>
 <th className="text-center text-xs font-medium text-gray-400 pb-3 px-2">Overdue</th>
 <th className="text-center text-xs font-medium text-gray-400 pb-3 px-2">Done</th>
 <th className="text-left text-xs font-medium text-gray-400 pb-3 px-3">Completion</th>
 <th className="text-center text-xs font-medium text-gray-400 pb-3 px-2">Rank</th>
 </tr>
 </thead>
 <tbody>
 {memberStats.slice(0, 6).map((m, i) => (
 <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
 <td className="py-2.5 px-3">
 <div className="flex items-center gap-3">
 <UserAvatar user={m} size={32} />
 <div>
 <p className="text-sm font-medium text-gray-800">{m.name}</p>
 <p className="text-[10px] text-gray-400">{m.designation || 'Member'}</p>
 </div>
 </div>
 </td>
 <td className="text-center py-2.5 px-2">
 <span className="text-sm font-semibold text-blue-600">{m.open}</span>
 </td>
 <td className="text-center py-2.5 px-2">
 <span className={`text-sm font-semibold ${m.overdue > 0 ? 'text-red-500' : 'text-gray-300'}`}>{m.overdue}</span>
 </td>
 <td className="text-center py-2.5 px-2">
 <span className="text-sm font-semibold text-green-600">{m.completed}</span>
 </td>
 <td className="py-2.5 px-3">
 <div className="flex items-center gap-2">
 <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{
 width: `${m.completionRate}%`,
 background: m.completionRate >= 80 ? '#10b981' : m.completionRate >= 50 ? '#f59e0b' : '#ef4444',
 }}
 />
 </div>
 <span className="text-xs font-semibold text-[var(--text-muted)] w-8">{m.completionRate}%</span>
 </div>
 </td>
 <td className="text-center py-2.5 px-2">
 <RankBadge rank={i + 1} />
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </DashboardWidget>
 )}

 {/* Upcoming Deadlines */}
 {widgetConfig.upcomingDeadlines && (
 <DashboardWidget title="Upcoming Deadlines (7 days)">
 {upcomingDeadlines.length === 0 ? (
 <div className="text-center py-8 text-gray-300 text-sm">
 <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
 No upcoming deadlines!
 </div>
 ) : (
 <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
 {upcomingDeadlines.map((item, i) => {
 const typeColors = {
 task: 'bg-blue-100 text-blue-700',
 payment: 'bg-green-100 text-green-700',
 enquiry: 'bg-amber-100 text-amber-700',
 };
 const typeIcons = {
 task: CheckCircle2,
 payment: DollarSign,
 enquiry: FileText,
 };
 const TypeIcon = typeIcons[item.type] || Clock;
 const daysLeft = Math.ceil((item.dueDate - new Date()) / (1000 * 60 * 60 * 24));

 return (
 <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[item.type] || 'bg-gray-100 text-gray-500'}`}>
 <TypeIcon className="w-4 h-4" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-700 truncate">{item.title}</p>
 <p className="text-[10px] text-gray-400">
 {item.assignedToName || item.type} | {item.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
 </p>
 </div>
 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
 daysLeft <= 1 ? 'bg-red-100 text-red-600' :
 daysLeft <= 3 ? 'bg-amber-100 text-amber-600' :
 'bg-green-100 text-green-600'
 }`}>
 {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
 </span>
 </div>
 );
 })}
 </div>
 )}
 </DashboardWidget>
 )}
 </div>

 {/* Weekly trend and performance */}
 {widgetConfig.weeklyTrend && (
 <div className="grid grid-cols-2 gap-5">
 <DashboardWidget title="Weekly Task Trend">
 <ResponsiveContainer width="100%" height={220}>
 <AreaChart data={weeklyData}>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
 <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
 <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
 <Area type="monotone" dataKey="created" stroke="#93c5fd" fill="#dbeafe" strokeWidth={2} name="Created" />
 <Area type="monotone" dataKey="completed" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} name="Completed" />
 </AreaChart>
 </ResponsiveContainer>
 </DashboardWidget>

 {/* Expense vs PO Value */}
 <DashboardWidget title="PO Value vs Expense">
 <div className="space-y-4">
 {activeProjects.slice(0, 5).map(p => {
 const utilization = p.poValue > 0 ? Math.min(100, Math.round((p.totalExpense || 0) / p.poValue * 100)) : 0;
 return (
 <div key={p.id}>
 <div className="flex items-center justify-between text-xs mb-1">
 <span className="font-medium text-gray-600 truncate max-w-[200px]">{p.name}</span>
 <span className={`font-semibold ${utilization >= 80 ? 'text-red-500' : utilization >= 60 ? 'text-amber-500' : 'text-green-600'}`}>
 {utilization}%
 </span>
 </div>
 <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{
 width: `${utilization}%`,
 background: utilization >= 80 ? '#ef4444' : utilization >= 60 ? '#f59e0b' : '#10b981',
 }}
 />
 </div>
 </div>
 );
 })}
 {activeProjects.length === 0 && (
 <p className="text-center text-gray-300 text-sm py-8">No active projects</p>
 )}
 </div>
 </DashboardWidget>
 </div>
 )}

 {/* Activity timeline */}
 {widgetConfig.timeline && (
 <DashboardWidget
 title="Recent Activity"
 action={
 <div className="flex items-center gap-1 text-xs text-gray-400">
 <Activity className="w-3 h-3" /> Live
 <span className="w-1.5 h-1.5 rounded-full bg-green-500 status-dot-pulse ml-1" />
 </div>
 }
 >
 <div className="space-y-1 max-h-[300px] overflow-y-auto">
 {(() => {
 const activities = [];
 // Gather recent tasks
 tasks.slice(0, 5).forEach(t => {
 activities.push({
 id: 'task-' + t.id,
 icon: CheckCircle2,
 dotClass: 'timeline-dot-task',
 title: t.title || 'Task update',
 subtitle: t.assignedToName || 'Unassigned',
 type: 'task',
 badge: t.status,
 date: normalizeDate(t.updatedAt || t.createdAt),
 });
 });
 // Gather recent payments
 payments.slice(0, 3).forEach(p => {
 activities.push({
 id: 'pay-' + p.id,
 icon: Receipt,
 dotClass: 'timeline-dot-payment',
 title: `${p.customerName} - ${formatCurrency(p.amount || 0)}`,
 subtitle: p.paymentStatus || 'pending',
 type: 'payment',
 badge: p.paymentStatus,
 date: normalizeDate(p.updatedAt || p.createdAt),
 });
 });
 // Gather recent enquiries
 enquiries.slice(0, 3).forEach(e => {
 activities.push({
 id: 'enq-' + e.id,
 icon: FileText,
 dotClass: 'timeline-dot-enquiry',
 title: e.customerName || e.taskType || 'Enquiry',
 subtitle: e.status || 'open',
 type: 'enquiry',
 badge: e.status,
 date: normalizeDate(e.updatedAt || e.createdAt),
 });
 });
 // Sort by date desc
 activities.sort((a, b) => {
 const da = a.date || new Date(0);
 const db = b.date || new Date(0);
 return db - da;
 });
 return activities.slice(0, 8).map((a, idx) => {
 const Icon = a.icon;
 const timeAgo = a.date ? (() => {
 const diff = Math.floor((new Date() - a.date) / 60000);
 if (diff < 1) return 'Just now';
 if (diff < 60) return `${diff}m ago`;
 if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
 return `${Math.floor(diff / 1440)}d ago`;
 })() : '';
 const badgeColor = {
 completed: 'badge-green', received: 'badge-green', closed: 'badge-gray',
 overdue: 'badge-red', open: 'badge-blue', pending: 'badge-yellow',
 in_progress: 'badge-teal',
 }[a.badge] || 'badge-gray';
 return (
 <div key={a.id} className="timeline-item">
 <div className={`timeline-dot ${a.dotClass}`} />
 <div className="flex items-center justify-between py-1.5">
 <div className="flex items-center gap-3 min-w-0">
 <div>
 <p className="text-sm font-medium text-gray-700 truncate">{a.title}</p>
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
 </DashboardWidget>
 )}

 {/* Financial health */}
 <div className="grid grid-cols-4 gap-4">
 {[
 { label: 'Total PO Value', value: formatLakhs(totalPOValue), icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
 { label: 'Total Expenses', value: formatLakhs(totalExpense), icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50' },
 { label: 'Total Received', value: formatCurrency(totalReceived), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
 { label: 'Profit Margin', value: `${totalPOValue > 0 ? Math.round(((totalPOValue - totalExpense) / totalPOValue) * 100) : 0}%`, icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-50' },
 ].map((item, i) => {
 const Icon = item.icon;
 return (
 <div key={i} className="card stat-card stat-card-glow flex items-center gap-3 py-3 stagger-item">
 <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
 <Icon className={`w-5 h-5 ${item.color}`} />
 </div>
 <div>
 <p className="text-[10px] text-gray-400 uppercase font-medium">{item.label}</p>
 <p className="text-lg font-bold text-gray-900">{item.value}</p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Performance score cards */}
 {widgetConfig.performance && memberStats.length > 0 && (
 <DashboardWidget title="Top Performers This Month">
 <div className="grid grid-cols-3 gap-4">
 {memberStats.slice(0, 3).map((m, i) => (
 <div key={m.id} className={`rounded-xl p-4 text-center border transition-all hover:shadow-md ${
 i === 0 ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' :
 i === 1 ? 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200' :
 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'
 }`}>
 <div className="mb-3 flex justify-center"><RankBadge rank={i + 1} style={{ fontSize: '14px', padding: '4px 10px' }} /></div>
 <div className="mb-2 flex justify-center">
 <UserAvatar user={m} size={48} />
 </div>
 <p className="font-semibold text-[var(--text-primary)] text-sm">{m.name}</p>
 <p className="text-[10px] text-gray-400 mt-0.5">{m.designation || 'Team Member'}</p>
 <div className="mt-3 grid grid-cols-3 gap-1">
 <div>
 <p className="text-lg font-bold text-green-600">{m.completed}</p>
 <p className="text-[9px] text-gray-400">Done</p>
 </div>
 <div>
 <p className="text-lg font-bold text-blue-600">{m.open}</p>
 <p className="text-[9px] text-gray-400">Open</p>
 </div>
 <div>
 <p className="text-lg font-bold text-teal-600">{m.completionRate}%</p>
 <p className="text-[9px] text-gray-400">Rate</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </DashboardWidget>
 )}

  {/* Dashboard Popups - rendered at root level */}
  <ProjectsPopup isOpen={popup === 'projects'} onClose={() => setPopup(null)} />
  <TasksPopup    isOpen={popup === 'tasks'}    onClose={() => setPopup(null)} />
  <PaymentsPopup isOpen={popup === 'payments'} onClose={() => setPopup(null)} />
  <TeamPopup     isOpen={popup === 'team'}     onClose={() => setPopup(null)} />
 </div>
 );
}


import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
 ClipboardList, AlertTriangle, CalendarClock, CreditCard,
 ChevronRight, Clock, Activity, Folder, Wrench
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useFollowUps } from '../hooks/useFollowUps';
import { usePayments } from '../hooks/usePayments';
import { useProjects } from '../hooks/useProjects';
import { useTools } from '../hooks/useTools';
import { formatDate } from '../lib/formatters';
import { logInfo } from '../lib/firestoreDebug';

export default function DashboardPage() {
 const navigate = useNavigate();
 const { userData } = useAuth();
 const uid = userData?.uid;
 const { tasks, loading: tasksLoading } = useTasks(uid);
 const { followUps, loading: fuLoading } = useFollowUps(uid);
 const { payments, loading: payLoading } = usePayments(uid);
 const { projects, loading: projLoading } = useProjects(uid);
 const { tools, loading: toolsLoading } = useTools(uid);

 // Tasks are already filtered by uid from the hook
 const myTasks = tasks;
 const myFollowUps = followUps;
 const myPayments = payments;

 const openTasks = myTasks.filter(t => t.status === 'open');
 const overdueTasks = myTasks.filter(t => t.status === 'overdue');
 const openFollowups = myFollowUps.filter(f => f.status === 'open' || f.status === 'overdue');
 const pendingPayments = myPayments.filter(p => p.paymentStatus !== 'received');

 const myProjectIds = [...new Set(myTasks.filter(t => t.projectId).map(t => t.projectId))];
 const myProjects = projects.filter(p => myProjectIds.includes(p.id));
 const myPendingTools = tools.filter(t => t.returnStatus === 'pending');
 const myAllTools = tools;

 const loading = tasksLoading || fuLoading || payLoading || projLoading || toolsLoading;

 useEffect(() => {
  logInfo('DashboardPage', 'Render state:', {
   uid,
   tasks: myTasks.length,
   followUps: myFollowUps.length,
   payments: myPayments.length,
   projects: myProjects.length,
   tools: myPendingTools.length,
   loading,
  });
 }, [
  loading,
  myFollowUps.length,
  myPayments.length,
  myPendingTools.length,
  myProjects.length,
  myTasks.length,
  uid,
 ]);

 const getGreeting = () => {
 const h = new Date().getHours();
 if (h < 12) return 'Good Morning';
 if (h < 17) return 'Good Afternoon';
 return 'Good Evening';
 };

 const summaryCards = [
 { label: 'Open Tasks', value: openTasks.length, icon: ClipboardList, color: 'bg-teal-50 text-teal-600', iconBg: 'bg-teal-100' },
 { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'bg-red-50 text-red-600', iconBg: 'bg-red-100' },
 { label: 'Follow-Ups', value: openFollowups.length, icon: CalendarClock, color: 'bg-amber-50 text-amber-600', iconBg: 'bg-amber-100' },
 { label: 'Payments', value: pendingPayments.length, icon: CreditCard, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100', onClick: () => navigate('/payments') },
 ];

 return (
 <div className="pb-4">
 <div className="px-4 pt-5 pb-3">
 <h1 className="text-xl font-bold text-gray-900">
 {getGreeting()}, {userData?.name?.split(' ')[0] || 'Team'}!
 </h1>
 <p className="text-sm text-[var(--text-muted)] mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
 </div>

 <div className="px-4 mb-5">
 <div className="horizontal-scroll">
 {(tasksLoading || fuLoading || payLoading) ? Array(4).fill(0).map((_, i) => (
 <Card key={i} className="min-w-[140px]"><CardContent className="p-3.5"><div className="h-9 w-9 bg-gray-200 rounded-lg animate-pulse mb-2.5" /><div className="h-6 w-10 bg-gray-200 rounded animate-pulse mb-1" /><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
 )) : summaryCards.map((card, idx) => {
 const Icon = card.icon;
 return (
 <Card key={idx} className="min-w-[140px] cursor-pointer hover:shadow-card-hover transition-shadow" onClick={card.onClick}>
 <CardContent className="p-3.5">
 <div className={`h-9 w-9 rounded-lg ${card.iconBg} flex items-center justify-center mb-2.5`}><Icon className={`h-4.5 w-4.5 ${card.color.split(' ')[1]}`} /></div>
 <p className="text-2xl font-bold text-gray-900">{card.value}</p>
 <p className="text-xs text-[var(--text-muted)] mt-0.5">{card.label}</p>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </div>

 {overdueTasks.length > 0 && (
 <section className="px-4 mb-5">
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />My Overdue Tasks</h2>
 <button onClick={() => navigate('/tasks')} className="text-sm text-teal-600 font-medium flex items-center gap-0.5">View All <ChevronRight className="h-4 w-4" /></button>
 </div>
 <div className="space-y-2.5">
 {overdueTasks.slice(0, 3).map(task => (
 <Card key={task.id} className="hover:shadow-card-hover transition-shadow">
 <CardContent className="p-3.5">
 <div className="flex items-start justify-between">
 <div className="flex-1 min-w-0"><p className="font-medium text-sm text-[var(--text-primary)] truncate">{task.title}</p><p className="text-xs text-gray-400 mt-1">Due: {formatDate(task.targetDate)}</p></div>
 <Badge variant="destructive" className="ml-2 flex-shrink-0">{task.overdueDays || '?'}d overdue</Badge>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </section>
 )}

 <section className="px-4 mb-5">
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2"><CalendarClock className="h-4 w-4 text-teal-600" />My Follow-ups</h2>
 <button onClick={() => navigate('/follow-ups')} className="text-sm text-teal-600 font-medium flex items-center gap-0.5">View All <ChevronRight className="h-4 w-4" /></button>
 </div>
 <div className="space-y-2.5">
 {openFollowups.length === 0 ? (
 <p className="text-center py-6 text-gray-400 text-sm">No open follow-ups</p>
 ) : openFollowups.slice(0, 3).map(fu => (
 <Card key={fu.id} className="hover:shadow-card-hover transition-shadow">
 <CardContent className="p-3.5">
 <p className="font-medium text-sm text-gray-900">{fu.client || fu.taskType}</p>
 <p className="text-xs text-[var(--text-muted)] mt-1">{fu.taskType}</p>
 <div className="flex items-center gap-2 mt-2">
 <Badge variant={fu.status === 'overdue' ? 'destructive' : 'default'}>{fu.status}</Badge>
 <span className="text-xs text-gray-400">Next: {formatDate(fu.nextFollowupDate)}</span>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 </section>

 <section className="px-4 mb-5">
 <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3"><Activity className="h-4 w-4 text-teal-600" />Recent Tasks</h2>
 <Card>
 <CardContent className="p-0 divide-y divide-gray-50">
 {tasksLoading ? (<p className="text-center py-6 text-gray-400 text-sm">Loading tasks...</p>) : myTasks.length === 0 ? (
 <p className="text-center py-6 text-gray-400 text-sm">No tasks assigned yet</p>
 ) : myTasks.slice(0, 5).map(task => (
 <div key={task.id} className="flex items-start gap-3 px-3.5 py-3">
 <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5"><Clock className="h-3.5 w-3.5 text-teal-600" /></div>
 <div className="flex-1 min-w-0">
 <p className="text-sm text-gray-700">{task.title}</p>
 <p className="text-xs text-[var(--text-muted)] truncate">{task.status} · {task.completionPercent || 0}%</p>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 </section>

 <section className="px-4 mb-5">
 <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3"><Folder className="h-4 w-4 text-teal-600" />My Projects</h2>
 <div className="horizontal-scroll pb-2">
 {projLoading ? Array(2).fill(0).map((_, i) => (
 <Card key={i} className="min-w-[240px] max-w-[280px]">
 <CardContent className="p-4">
 <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3" />
 <div className="h-10 w-full bg-gray-100 rounded animate-pulse mb-3" />
 <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
 </CardContent>
 </Card>
 )) : myProjects.length === 0 ? (
 <p className="text-gray-400 text-sm italic py-2">No projects currently assigned</p>
 ) : myProjects.map(project => {
 const projectTasks = myTasks.filter(t => t.projectId === project.id);
 const completedProjectTasks = projectTasks.filter(t => t.status === 'completed');
 const myCompletion = projectTasks.length > 0 
 ? Math.round((completedProjectTasks.length / projectTasks.length) * 100) 
 : 0;
 
 return (
 <Card key={project.id} className="min-w-[240px] max-w-[280px] cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => navigate(`/tasks?projectId=${project.id}`)}>
 <CardContent className="p-4">
 <div className="flex items-start justify-between mb-2">
 <p className="font-semibold text-sm text-[var(--text-primary)] truncate pr-2">{project.name}</p>
 <Badge variant={project.status === 'completed' ? 'default' : 'secondary'} className="flex-shrink-0">{project.status || 'Active'}</Badge>
 </div>
 <p className="text-xs text-[var(--text-muted)] mb-3">{projectTasks.length} tasks assigned to me</p>
 
 <div className="space-y-3">
 <div>
 <div className="flex justify-between text-[10px] mb-1">
 <span className="text-gray-500">Overall Progress</span>
 <span className="font-medium text-teal-600">{project.completionPercent || 0}%</span>
 </div>
 <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
 <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${project.completionPercent || 0}%` }} />
 </div>
 </div>
 
 <div>
 <div className="flex justify-between text-[10px] mb-1">
 <span className="text-gray-500">My Progress</span>
 <span className="font-medium text-blue-600">{myCompletion}%</span>
 </div>
 <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
 <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${myCompletion}%` }} />
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </section>

  <section className="px-4 mb-5">
  <div className="flex items-center justify-between mb-3">
  <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2"><Wrench className="h-4 w-4 text-teal-600" />My Assigned Tools</h2>
  {myPendingTools.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">{myPendingTools.length} Pending</span>}
  </div>
  <div className="space-y-2.5">
  {toolsLoading ? Array(2).fill(0).map((_, i) => (
  <Card key={i}><CardContent className="p-3.5"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" /><div className="h-3 w-32 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
  )) : myAllTools.length === 0 ? (
  <p className="text-center py-6 text-gray-400 text-sm">No tools assigned</p>
  ) : myAllTools.map(tool => {
  const handedDate = tool.handedOverDate?.toDate ? tool.handedOverDate.toDate() : (tool.createdAt?.toDate ? tool.createdAt.toDate() : new Date(tool.handedOverDate || tool.createdAt));
  const daysSince = handedDate && !isNaN(handedDate.getTime()) ? Math.floor((new Date() - handedDate) / 864e5) : 0;
  const isPending = tool.returnStatus === 'pending';
  return (
  <Card key={tool.id} className={`${isPending ? 'border-orange-100' : 'border-green-100'}`}>
  <CardContent className="p-3.5">
  <div className="flex items-start justify-between mb-2">
  <p className="font-semibold text-sm text-[var(--text-primary)]">{tool.toolName}</p>
  <Badge className={isPending ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' : 'bg-green-100 text-green-700 hover:bg-green-100'}>
  {isPending ? 'Pending' : 'Returned'}
  </Badge>
  </div>
  <div className="space-y-1">
  <p className="text-xs text-[var(--text-muted)]">Handed over: {handedDate && !isNaN(handedDate.getTime()) ? handedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}</p>
  <p className="text-xs text-[var(--text-muted)]">Days since issue: <span className={`font-semibold ${daysSince > 30 ? 'text-red-500' : daysSince > 15 ? 'text-amber-500' : 'text-gray-700'}`}>{daysSince} days</span></p>
  {tool.condition && <p className="text-xs text-[var(--text-muted)]">Condition: <span className="font-medium text-gray-700">{tool.condition}</span></p>}
  {tool.notes && <p className="text-xs text-gray-400 italic mt-1">{tool.notes}</p>}
  </div>
  </CardContent>
  </Card>
  );
  })}
  </div>
  </section>
 </div>
 );
}

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
    { label: 'Open Tasks', value: openTasks.length, icon: ClipboardList, color: 'bg-blue-50 text-[#2E4BFF]', iconBg: 'bg-blue-100/60', onClick: () => navigate('/pwa/tasks') },
    { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'bg-red-50 text-red-600', iconBg: 'bg-red-100/60', onClick: () => navigate('/pwa/tasks') },
    { label: 'Follow-Ups', value: openFollowups.length, icon: CalendarClock, color: 'bg-amber-50 text-amber-600', iconBg: 'bg-amber-100/60', onClick: () => navigate('/pwa/follow-ups') },
    { label: 'Payments', value: pendingPayments.length, icon: CreditCard, color: 'bg-indigo-50 text-indigo-600', iconBg: 'bg-indigo-100/60', onClick: () => navigate('/pwa/payments') },
  ];

  return (
    <div className="pwa-dashboard-container pb-8 relative">
      {/* Interactive Glowing Aura Blobs (Match Login Screen) */}
      <div className="absolute top-[-5%] right-[-10%] w-72 h-72 rounded-full bg-blue-300/15 blur-[90px] pointer-events-none z-0" />
      <div className="absolute bottom-[25%] left-[-10%] w-72 h-72 rounded-full bg-indigo-300/15 blur-[100px] pointer-events-none z-0" />
      
      <div className="relative z-10 space-y-5">
        {/* Premium Welcome Banner (Royal Blue / Dark Gradient) */}
        <div className="px-4 pt-4">
          <div className="bg-gradient-to-br from-[#2E4BFF] via-[#1D35DB] to-[#0F172A] rounded-3xl p-5 text-white shadow-md relative overflow-hidden animate-slide-up">
            {/* Abstract decorative shapes */}
            <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100/90 bg-blue-700/30 px-2.5 py-1 rounded-full">{getGreeting()}</span>
                <h1 className="text-2xl font-bold mt-2.5 leading-tight">
                  {userData?.name || 'Team Member'}
                </h1>
                <p className="text-xs text-blue-100/80 mt-1">Saya Industrial Team Portal</p>
              </div>
              
              <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs text-blue-100">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-300"></span>
                  </span>
                  <span className="font-semibold">Active Member</span>
                </div>
                <span className="font-semibold opacity-90">
                  {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Action Grid */}
        <div className="px-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-2 gap-3.5">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm animate-pulse">
                  <div className="h-10 w-10 bg-slate-100 rounded-xl mb-4" />
                  <div className="h-6 w-8 bg-slate-100 rounded mb-1" />
                  <div className="h-3 w-16 bg-slate-50 rounded" />
                </div>
              ))
            ) : (
              summaryCards.map((card, idx) => {
                const Icon = card.icon;
                const isOverdue = card.label === 'Overdue';
                const textValColor = isOverdue && card.value > 0 ? 'text-red-600 font-extrabold' : 'text-slate-900';
                return (
                  <div 
                    key={idx} 
                    onClick={card.onClick}
                    className="bg-white border border-slate-100/85 rounded-2xl p-4 flex flex-col justify-between shadow-sm active:scale-95 transition-all duration-150 cursor-pointer hover:border-[#2E4BFF]/20 group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`h-10 w-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${card.color.split(' ')[1]}`} />
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#2E4BFF] transition-colors" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold tracking-tight ${textValColor}`}>{card.value}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{card.label}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Overdue Section */}
        {!loading && overdueTasks.length > 0 && (
          <section className="px-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
                Overdue Tasks
              </h2>
              <button onClick={() => navigate('/pwa/tasks')} className="text-xs text-[#2E4BFF] font-semibold flex items-center gap-0.5">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-2.5">
              {overdueTasks.slice(0, 2).map(task => (
                <div 
                  key={task.id} 
                  onClick={() => navigate('/pwa/tasks')}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm pwa-list-item pwa-list-item-overdue flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-semibold text-sm text-slate-800 truncate">{task.title}</p>
                    <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Due {formatDate(task.targetDate)}
                    </p>
                  </div>
                  <Badge variant="destructive" className="flex-shrink-0 text-[10px] px-2 py-0.5 font-bold">
                    {task.overdueDays || '?'}d Overdue
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Follow-ups Section */}
        <section className="px-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock className="h-4.5 w-4.5 text-[#2E4BFF]" />
              My Follow-ups
            </h2>
            <button onClick={() => navigate('/pwa/follow-ups')} className="text-xs text-[#2E4BFF] font-semibold flex items-center gap-0.5">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          {loading ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm animate-pulse flex flex-col gap-2">
              <div className="h-4 w-1/3 bg-slate-100 rounded" />
              <div className="h-3 w-1/2 bg-slate-50 rounded" />
            </div>
          ) : openFollowups.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <CalendarClock className="h-7 w-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">All caught up! No pending follow-ups.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {openFollowups.slice(0, 3).map(fu => {
                const isOverdue = fu.status === 'overdue';
                return (
                  <div 
                    key={fu.id}
                    onClick={() => navigate('/pwa/follow-ups')}
                    className={`bg-white border border-slate-100 rounded-2xl p-4 shadow-sm pwa-list-item ${isOverdue ? 'pwa-list-item-overdue' : 'pwa-list-item-pending'} flex items-center justify-between cursor-pointer active:bg-slate-50 transition-colors`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-semibold text-sm text-slate-800 truncate">{fu.client || fu.taskType}</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">{fu.taskType}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-[9px] font-bold px-2 py-0.5 capitalize">
                        {fu.status}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {formatDate(fu.nextFollowupDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Tasks */}
        <section className="px-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Activity className="h-4.5 w-4.5 text-[#2E4BFF]" />
            Recent Active Tasks
          </h2>
          
          {loading ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 animate-pulse">
              <div className="h-8 bg-slate-100 rounded w-full" />
              <div className="h-8 bg-slate-100 rounded w-full" />
            </div>
          ) : myTasks.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <ClipboardList className="h-7 w-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No tasks assigned yet</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {myTasks.slice(0, 4).map(task => {
                  const isTaskOverdue = task.status === 'overdue';
                  const isTaskCompleted = task.status === 'completed';
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => navigate('/pwa/tasks')}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 active:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isTaskCompleted ? 'bg-emerald-50' : isTaskOverdue ? 'bg-red-50' : 'bg-blue-50'
                      }`}>
                        <Clock className={`h-4 w-4 ${
                          isTaskCompleted ? 'text-emerald-600' : isTaskOverdue ? 'text-red-500' : 'text-[#2E4BFF]'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                          Progress: <span className="text-[#2E4BFF] font-bold">{task.completionPercent || 0}%</span> · <span className="capitalize font-semibold">{task.status}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Projects Horizontal Slider */}
        <section className="px-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Folder className="h-4.5 w-4.5 text-[#2E4BFF]" />
            My Project Progress
          </h2>
          
          {loading ? (
            <div className="horizontal-scroll">
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm min-w-[240px] animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-2/3 mb-4" />
                <div className="h-2 bg-slate-100 rounded w-full mb-2" />
                <div className="h-2 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ) : myProjects.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <Folder className="h-7 w-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No projects currently assigned</p>
            </div>
          ) : (
            <div className="horizontal-scroll pb-2">
              {myProjects.map(project => {
                const projectTasks = myTasks.filter(t => t.projectId === project.id);
                const completedProjectTasks = projectTasks.filter(t => t.status === 'completed');
                const myCompletion = projectTasks.length > 0 
                  ? Math.round((completedProjectTasks.length / projectTasks.length) * 100) 
                  : 0;
                
                return (
                  <div 
                    key={project.id} 
                    onClick={() => navigate(`/pwa/tasks?projectId=${project.id}`)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm min-w-[240px] max-w-[260px] flex-shrink-0 cursor-pointer active:scale-98 transition-transform duration-100"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-bold text-sm text-slate-800 truncate pr-2">{project.name}</p>
                      <Badge variant={project.status === 'completed' ? 'default' : 'secondary'} className="text-[9px] font-bold px-1.5 py-0.5">
                        {project.status || 'Active'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mb-4">{projectTasks.length} tasks assigned to me</p>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1 font-semibold text-slate-500">
                          <span>Project Progress</span>
                          <span className="text-[#2E4BFF]">{project.completionPercent || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2E4BFF] rounded-full transition-all duration-500" style={{ width: `${project.completionPercent || 0}%` }} />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-[10px] mb-1 font-semibold text-slate-500">
                          <span>My Contribution</span>
                          <span className="text-blue-600">{myCompletion}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${myCompletion}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tools Section */}
        <section className="px-4 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="h-4.5 w-4.5 text-[#2E4BFF]" />
              My Assigned Tools
            </h2>
            {myPendingTools.length > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2.5 py-1 rounded-full border border-amber-100">
                {myPendingTools.length} Pending Return
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-50 rounded w-1/2" />
            </div>
          ) : myAllTools.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <Wrench className="h-7 w-7 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No tools currently issued</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myAllTools.map(tool => {
                const handedDate = tool.handedOverDate?.toDate ? tool.handedOverDate.toDate() : (tool.createdAt?.toDate ? tool.createdAt.toDate() : new Date(tool.handedOverDate || tool.createdAt));
                const daysSince = handedDate && !isNaN(handedDate.getTime()) ? Math.floor((new Date() - handedDate) / 864e5) : 0;
                const isPending = tool.returnStatus === 'pending';
                return (
                  <div 
                    key={tool.id} 
                    className={`bg-white border border-slate-100 rounded-2xl p-4 shadow-sm pwa-list-item ${isPending ? 'pwa-list-item-pending' : 'pwa-list-item-open'} flex flex-col`}
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <p className="font-bold text-sm text-slate-800">{tool.toolName}</p>
                      <Badge className={isPending ? 'bg-amber-50 text-amber-600 border border-amber-100 font-bold text-[9px]' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[9px]'}>
                        {isPending ? 'Issued' : 'Returned'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-semibold border-t border-slate-50 pt-2.5">
                      <div>
                        Issued: <span className="text-slate-600 font-bold">{handedDate && !isNaN(handedDate.getTime()) ? handedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A'}</span>
                      </div>
                      <div className="text-right">
                        Usage: <span className={`font-bold ${daysSince > 30 ? 'text-red-500' : daysSince > 15 ? 'text-amber-500' : 'text-slate-600'}`}>{daysSince} days</span>
                      </div>
                    </div>
                    {tool.condition && (
                      <div className="text-[11px] text-slate-400 mt-1.5 font-semibold">
                        Condition: <span className="text-slate-600">{tool.condition}</span>
                      </div>
                    )}
                    {tool.notes && (
                      <p className="text-[10px] text-slate-400 italic mt-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">{tool.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

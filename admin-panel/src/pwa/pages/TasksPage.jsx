import React, { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckSquare, Calendar, ChevronRight,
  Briefcase, Check, Clock, Zap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { logInfo } from '../lib/firestoreDebug';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate?.() ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS = {
  completed: {
    label: 'Completed',
    dot: '#10B981',
    bar: 'linear-gradient(90deg, #10B981, #34D399)',
    chipBg: 'rgba(16, 185, 129, 0.12)', chipText: '#065F46',
    strip: '#10B981',
  },
  overdue: {
    label: 'Overdue',
    dot: '#EF4444',
    bar: 'linear-gradient(90deg, #EF4444, #F87171)',
    chipBg: 'rgba(239, 68, 68, 0.1)', chipText: '#991B1B',
    strip: '#EF4444',
  },
  open: {
    label: 'In Progress',
    dot: '#3B82F6',
    bar: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
    chipBg: 'rgba(59, 130, 246, 0.12)', chipText: '#1E40AF',
    strip: '#3B82F6',
  },
};

const TABS = [
  { key: 'open',      label: 'To Do'   },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'completed', label: 'Done'    },
];

export default function TasksPage() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading } = useTasks(userData?.uid);
  const { projects, loading: projectsLoading } = useProjects(userData?.uid);
  const [activeTab, setActiveTab] = useState('open');
  const loading = tasksLoading || projectsLoading;

  useEffect(() => {
    logInfo('TasksPage', 'mount', { tasks: tasks.length });
  }, [tasks.length]);

  const counts = {
    open:      tasks.filter(t => t.status === 'open').length,
    overdue:   tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (activeTab === 'open') return t.status === 'open';
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'overdue') return t.status === 'overdue';
    return true;
  }), [tasks, activeTab]);

  const avgCompletion = tasks.length
    ? Math.round(tasks.reduce((s, t) => s + (t.completionPercent || 0), 0) / tasks.length)
    : 0;

  const cardPress = (el, pressed) => {
    if (pressed) {
      el.style.transform = 'scale(0.975)';
      el.style.opacity = '0.9';
    } else {
      el.style.transform = '';
      el.style.opacity = '';
    }
  };

  return (
    <div
      className="min-h-screen font-sans pb-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #F4F6F9 0%, #E2E8F0 100%)' }}
    >
      {/* Background Gradient Mesh with iOS Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-300/30 blur-[100px]" />
        <div className="absolute top-[20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-purple-300/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[60%] h-[60%] rounded-full bg-pink-300/30 blur-[110px]" />
      </div>

      <div className="relative z-10">

        {/* ── PAGE HEADER ─────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-4">
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase mb-0.5"
             style={{ color: 'var(--color-text-secondary)' }}>
            My Workspace
          </p>
          <div className="flex items-end justify-between">
            <h1 className="text-[26px] font-black tracking-tight leading-none pwa-headline"
                style={{ color: 'var(--color-text-primary)' }}>
              Task List
            </h1>
            <span className="text-[11px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              {tasks.length} total
            </span>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ 
              background: 'rgba(255, 255, 255, 0.45)', 
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)'
            }}
          >
            <div className="grid grid-cols-3 divide-x divide-white/20">
              {[
                { label: 'To Do',   count: counts.open,      color: '#2563EB', icon: Clock },
                { label: 'Overdue', count: counts.overdue,   color: '#DC2626', icon: AlertTriangle },
                { label: 'Done',    count: counts.completed, color: '#059669', icon: Check },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex flex-col items-center py-4 gap-1">
                    <span className="text-[28px] font-black leading-none" style={{ color: s.color }}>{s.count}</span>
                    <div className="flex items-center gap-1">
                      <Icon className="h-2.5 w-2.5" style={{ color: s.color, opacity: 0.7 }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-white/20 bg-white/20">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-blue-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Overall Progress</span>
                </div>
                <span className="text-[11px] font-black text-slate-800">
                  {avgCompletion}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-black/5">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${avgCompletion}%`, background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────────── */}
        <div className="px-4 mb-4">
          <div className="flex p-1 rounded-xl bg-black/5">
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold transition-all duration-200 active:scale-[0.97] rounded-lg"
                  style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
                    color: isActive ? '#1F2937' : '#6B7280',
                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    backdropFilter: isActive ? 'blur(4px)' : 'none',
                  }}
                >
                  {tab.label}
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-black"
                    style={{
                      background: isActive ? '#1F2937' : 'rgba(0,0,0,0.06)',
                      color: isActive ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TASK CARDS — Glassmorphic ────────────────────────────── */}
        <div className="px-4 space-y-4 pb-24">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse p-4 space-y-3"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.45)', 
                     backdropFilter: 'blur(20px)',
                     border: '1px solid rgba(255, 255, 255, 0.5)',
                     boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)' 
                   }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black/5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 rounded bg-black/5 w-3/4" />
                    <div className="h-3 rounded bg-black/5 w-2/5" />
                  </div>
                </div>
                <div className="h-2 rounded bg-black/5" />
                <div className="h-3 rounded bg-black/5 w-1/3" />
              </div>
            ))
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-14 rounded-2xl"
                 style={{ 
                   background: 'rgba(255, 255, 255, 0.45)', 
                   backdropFilter: 'blur(20px)',
                   border: '1px solid rgba(255, 255, 255, 0.5)',
                   boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)'
                 }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-black/5 border border-white/40">
                <CheckSquare className="h-7 w-7 text-slate-400" />
              </div>
              <p className="font-bold text-sm text-slate-800">No tasks here</p>
              <p className="text-[11px] mt-1 text-slate-500">
                No {activeTab === 'completed' ? 'completed' : activeTab === 'overdue' ? 'overdue' : 'active'} tasks.
              </p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              const st = STATUS[task.status] || STATUS.open;
              const completion = task.completionPercent || 0;
 
              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/pwa/tasks/${task.id}`)}
                  className="rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.03)',
                    transition: 'transform 120ms, opacity 120ms',
                  }}
                  onMouseDown={e => cardPress(e.currentTarget, true)}
                  onMouseUp={e => cardPress(e.currentTarget, false)}
                  onMouseLeave={e => cardPress(e.currentTarget, false)}
                  onTouchStart={e => cardPress(e.currentTarget, true)}
                  onTouchEnd={e => cardPress(e.currentTarget, false)}
                >
                  {/* Status strip */}
                  <div className="h-[3px] w-full" style={{ background: st.strip }} />
 
                  <div className="p-4">
                    {/* Title row */}
                    <div className="flex items-start gap-3 mb-3.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-white/50 shadow-sm">
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                      </div>
 
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold leading-snug line-clamp-2 mb-1 text-slate-800">
                          {task.title}
                        </h3>
                        {project && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3 flex-shrink-0 text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[180px]">
                              {project.name}
                            </span>
                          </div>
                        )}
                      </div>
 
                      {/* Status chip — glassmorphic */}
                      <span
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full border border-white/30"
                        style={{ background: st.chipBg, color: st.chipText }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.dot }} />
                        {st.label}
                      </span>
                    </div>
 
                    {/* Progress */}
                    <div className="mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-black/5">
                          <div className="h-full rounded-full transition-all duration-700"
                               style={{ width: `${completion}%`, background: st.bar }} />
                        </div>
                        <span className="text-[10px] font-bold w-7 text-right flex-shrink-0 text-slate-700">
                          {completion}%
                        </span>
                      </div>
                    </div>
 
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-black/5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-450" />
                        <span className="text-[11px] font-medium text-slate-500">
                          Due: {formatDate(task.targetDate)}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-[10px] font-medium text-slate-450">
                          Assigned: {formatDate(task.assignedDate || task.createdAt)}
                        </span>
                        {task.status === 'overdue' && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                            {task.overdueDays}d late
                          </span>
                        )}
                        {task.status === 'completed' && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-0.5">
                            <Check className="h-2.5 w-2.5 stroke-[3px]" /> Done
                          </span>
                        )}
                      </div>
 
                      {/* View more — glassmorphic button */}
                      <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full bg-black/5 text-slate-600 hover:bg-black/10 active:scale-95 transition-all">
                        View more
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

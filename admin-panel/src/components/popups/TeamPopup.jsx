import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, ProgressBar, Badge } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, fmtDate, isToday, getInitials } from './popupUtils';

export default function TeamPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [users,     setUsers]     = useState([]);
  const [tasks,     setTasks]     = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [tools,     setTools]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubs = [
      onSnapshot(collection(db, 'users'),     s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'tasks'),     s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'projects'),  s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'enquiries'), s => setEnquiries(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'followups'), s => setFollowups(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'tools'),     s => setTools(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const members = useMemo(() => users.filter(u => u.role === 'member'), [users]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return members.map(m => {
      const mTasks    = tasks.filter(t => t.assignedTo === m.id);
      const completed = mTasks.filter(t => t.status === 'completed').length;
      const overdue   = mTasks.filter(t => t.status === 'overdue').length;
      const open      = mTasks.filter(t => t.status !== 'completed').length;
      const total     = mTasks.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Monthly: tasks completed this month
      const monthCompleted = mTasks.filter(t => {
        const d = t.completedAt?.toDate?.() || new Date(t.completedAt);
        return t.status === 'completed' && d >= monthStart;
      }).length;

      // Current task work (open tasks with project)
      const currentWork = mTasks.filter(t => t.status !== 'completed').slice(0, 3).map(t => ({
        ...t,
        projectName: projects.find(p => p.id === t.projectId)?.name || '—',
      }));

      // Other resources
      const mEnquiries = enquiries.filter(e => e.assignedTo === m.id && e.status !== 'closed');
      const mFollowups = followups.filter(f => f.assignedTo === m.id && !isToday(f.nextFollowupDate) && f.status !== 'closed');
      const fuToday    = followups.filter(f => f.assignedTo === m.id && isToday(f.nextFollowupDate));
      const mTools     = tools.filter(t => t.assignedTo === m.id || (t.assignedToId === m.id));

      return {
        ...m, completed, overdue, open, total, completionRate, monthCompleted, currentWork,
        enquiryCount: mEnquiries.length, followupCount: mFollowups.length, fuToday: fuToday.length,
        toolCount: mTools.length, toolNames: mTools.map(t => t.name).slice(0, 3).join(', '),
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [members, tasks, projects, enquiries, followups, tools]);

  const summary = useMemo(() => {
    const topPerformer = stats[0]?.name || '—';
    const mostOverdue  = stats.slice().sort((a, b) => b.overdue - a.overdue)[0];
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      topPerformer,
      mostOverdue: mostOverdue?.overdue > 0 ? mostOverdue?.name : '✅ None',
    };
  }, [stats, members]);

  // Radar data (top 5)
  const radarData = useMemo(() =>
    stats.slice(0, 5).map(m => ({
      member: m.name?.split(' ')[0] || m.name,
      Open: m.open, Completed: m.completed, Overdue: m.overdue,
    })), [stats]);

  const medals = ['🥇', '🥈', '🥉'];

  const sendWhatsApp = (m) => {
    const num = m.phone || m.whatsapp || '';
    if (num) window.open(`https://wa.me/91${num.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <BasePopup
      isOpen={isOpen} onClose={onClose}
      title="Team Performance Overview" badge
      footer={<FooterBtn label="Open Team Page" onClick={() => { navigate('/team'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <SummaryCard label="Total Members"  value={summary.total}        bg="#f0f9ff" color="#0369a1" />
            <SummaryCard label="Active 🟢"      value={summary.active}       bg="#f0fdf4" color="#10b981" />
            <SummaryCard label="Top Performer 🥇" value={summary.topPerformer} bg="#fffbeb" color="#f59e0b" />
            <SummaryCard label="Most Overdue ⚠️" value={summary.mostOverdue}  bg="#fef2f2" color="#ef4444" />
          </div>

          {/* Leaderboard */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>This Month's Rankings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.map((m, i) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: i < 3 ? ['#fffbeb', '#f9fafb', '#fff7f0'][i] : '#fafafa',
                  border: `1px solid ${i < 3 ? ['#fde68a', '#e5e7eb', '#fed7aa'][i] : '#e5e7eb'}`,
                  borderRadius: 12, padding: '14px 18px',
                }}>
                  <span style={{ fontSize: i < 3 ? 22 : 16, minWidth: 32, textAlign: 'center' }}>
                    {medals[i] || `#${i + 1}`}
                  </span>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0D9488', color: 'white', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getInitials(m.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{m.name}</span>
                      <Badge label={m.status || 'active'} color={m.status === 'active' ? '#10b981' : '#6b7280'} bg={m.status === 'active' ? '#dcfce7' : '#f3f4f6'} />
                      {m.designation && <span style={{ fontSize: 12, color: '#9ca3af' }}>{m.designation}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                      <span>📋 {m.total} tasks</span>
                      <span style={{ color: '#10b981' }}>✅ {m.completed} done</span>
                      <span style={{ color: m.overdue > 0 ? '#ef4444' : '#9ca3af' }}>⚠️ {m.overdue} overdue</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}><ProgressBar pct={m.completionRate} /></div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: m.completionRate >= 70 ? '#10b981' : m.completionRate >= 50 ? '#f59e0b' : '#ef4444', minWidth: 36 }}>
                        {m.completionRate}%
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => sendWhatsApp(m)} title="WhatsApp" style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', border: 'none', cursor: 'pointer', fontSize: 16 }}>📱</button>
                    <button onClick={() => { navigate('/projects'); onClose(); }} title="View Tasks" style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', border: 'none', cursor: 'pointer', fontSize: 14 }}>📋</button>
                  </div>
                </div>
              ))}
              {stats.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No team members found</div>}
            </div>
          </div>

          {/* Member detail cards */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>Member Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {stats.map(m => (
                <div key={m.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', background: 'white' }}>
                  <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0D9488', color: 'white', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getInitials(m.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{m.designation || 'Team Member'}</div>
                    </div>
                    <Badge label={`🟢 ${m.status || 'active'}`} color="#10b981" bg="#dcfce7" />
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#374151' }}>
                    {m.currentWork.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Current Work</div>
                        {m.currentWork.map(t => (
                          <div key={t.id} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px dashed #f3f4f6' }}>
                            <span style={{ color: '#9ca3af' }}>{t.projectName}: </span>
                            <span style={{ fontWeight: 500 }}>{t.title}</span>
                            <span style={{ color: '#0D9488', marginLeft: 6 }}>{t.completionPercentage || 0}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 16, paddingTop: 4, flexWrap: 'wrap' }}>
                      <span>Open: <strong style={{ color: '#3b82f6' }}>{m.open}</strong></span>
                      <span>Done: <strong style={{ color: '#10b981' }}>{m.completed}</strong></span>
                      <span>Overdue: <strong style={{ color: m.overdue > 0 ? '#ef4444' : '#9ca3af' }}>{m.overdue}</strong></span>
                    </div>
                    {m.toolNames && <div style={{ fontSize: 12, color: '#6b7280' }}>🔧 Tools: {m.toolNames}</div>}
                    {m.enquiryCount > 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>📝 Enquiries: {m.enquiryCount} open</div>}
                    {m.fuToday > 0 && <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>📅 {m.fuToday} follow-up{m.fuToday > 1 ? 's' : ''} due today!</div>}
                    <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
                      <button onClick={() => sendWhatsApp(m)} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>📱 WhatsApp</button>
                      <button onClick={() => { navigate('/projects'); onClose(); }} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #0D9488', background: '#f0fdfa', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0D9488' }}>📋 View Tasks</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workload radar chart */}
          {radarData.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Team Workload Radar</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="member" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Radar name="Open" dataKey="Open" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Radar name="Completed" dataKey="Completed" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Radar name="Overdue" dataKey="Overdue" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
                  <Tooltip contentStyle={{ borderRadius: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Work distribution table */}
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Current Work Distribution</h3>
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    {['Member', 'Project', 'Task', 'Progress', 'Due'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.flatMap(m => m.currentWork.map(t => {
                    const due = t.targetDate?.toDate?.() || new Date(t.targetDate);
                    const days = due ? Math.ceil((due - new Date()) / 86400000) : null;
                    return (
                      <tr key={`${m.id}-${t.id}`} style={{ background: t.status === 'overdue' ? '#fef2f2' : 'white', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name?.split(' ')[0]}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{t.projectName}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>{t.title}</td>
                        <td style={{ padding: '10px 14px', minWidth: 100 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1 }}><ProgressBar pct={t.completionPercentage || 0} /></div>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{t.completionPercentage || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          {t.status === 'overdue'
                            ? <span style={{ color: '#ef4444', fontWeight: 700 }}>Overdue</span>
                            : days === 0 ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>Today</span>
                            : days > 0 ? <span style={{ color: '#6b7280' }}>{days}d</span>
                            : <span style={{ color: '#9ca3af' }}>—</span>
                          }
                        </td>
                      </tr>
                    );
                  }))}
                  {stats.flatMap(m => m.currentWork).length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>No active work items</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </BasePopup>
  );
}

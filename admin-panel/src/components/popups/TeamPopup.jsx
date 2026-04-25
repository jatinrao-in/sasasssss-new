import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, ProgressBar } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, isToday } from './popupUtils';
import { RankBadge, StatusPill } from '../ui/TextIndicators';
import UserAvatar from '../UserAvatar';

function getMemberStatusPill(status) {
  if (status === 'active') {
    return {
      color: '#16A34A',
      background: '#dcfce7',
      borderColor: '#bbf7d0',
      label: 'Active',
    };
  }

  return {
    color: '#6b7280',
    background: '#f3f4f6',
    borderColor: '#d1d5db',
    label: status || 'Inactive',
  };
}

export default function TeamPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubs = [
      onSnapshot(collection(db, 'users'), s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'tasks'), s => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'projects'), s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'enquiries'), s => setEnquiries(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'followups'), s => setFollowups(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'tools'), s => setTools(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const members = useMemo(() => users.filter(u => u.role === 'member'), [users]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return members.map(m => {
      const memberTasks = tasks.filter(t => t.assignedTo === m.id);
      const completed = memberTasks.filter(t => t.status === 'completed').length;
      const overdue = memberTasks.filter(t => t.status === 'overdue').length;
      const open = memberTasks.filter(t => t.status !== 'completed').length;
      const total = memberTasks.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const monthCompleted = memberTasks.filter(t => {
        const doneDate = t.completedAt?.toDate?.() || new Date(t.completedAt);
        return t.status === 'completed' && doneDate >= monthStart;
      }).length;

      const currentWork = memberTasks.filter(t => t.status !== 'completed').slice(0, 3).map(t => ({
        ...t,
        projectName: projects.find(p => p.id === t.projectId)?.name || '-',
      }));

      const memberEnquiries = enquiries.filter(e => e.assignedTo === m.id && e.status !== 'closed');
      const memberFollowups = followups.filter(f => f.assignedTo === m.id && !isToday(f.nextFollowupDate) && f.status !== 'closed');
      const followupsToday = followups.filter(f => f.assignedTo === m.id && isToday(f.nextFollowupDate));
      const memberTools = tools.filter(t => t.assignedTo === m.id || t.assignedToId === m.id);

      return {
        ...m,
        completed,
        overdue,
        open,
        total,
        completionRate,
        monthCompleted,
        currentWork,
        enquiryCount: memberEnquiries.length,
        followupCount: memberFollowups.length,
        fuToday: followupsToday.length,
        toolCount: memberTools.length,
        toolNames: memberTools.map(t => t.name).slice(0, 3).join(', '),
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [members, tasks, projects, enquiries, followups, tools]);

  const summary = useMemo(() => {
    const topPerformer = stats[0]?.name || '-';
    const mostOverdue = stats.slice().sort((a, b) => b.overdue - a.overdue)[0];
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      topPerformer,
      mostOverdue: mostOverdue?.overdue > 0 ? mostOverdue.name : 'None',
    };
  }, [stats, members]);

  const radarData = useMemo(() =>
    stats.slice(0, 5).map(m => ({
      member: m.name?.split(' ')[0] || m.name,
      Open: m.open,
      Completed: m.completed,
      Overdue: m.overdue,
    })),
  [stats]);

  const sendWhatsApp = (member) => {
    const num = member.phone || member.whatsapp || '';
    if (num) window.open(`https://wa.me/91${num.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <BasePopup
      isOpen={isOpen}
      onClose={onClose}
      title="Team Performance Overview"
      badge
      footer={<FooterBtn label="Open Team Page" onClick={() => { navigate('/team'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <SummaryCard label="Total Members" value={summary.total} bg="#f0f9ff" color="#0369a1" />
            <SummaryCard label="Active Members" value={summary.active} bg="#f0fdf4" color="#10b981" />
            <SummaryCard label="Top Performer" value={summary.topPerformer} bg="#fffbeb" color="#D97706" />
            <SummaryCard label="Most Overdue" value={summary.mostOverdue} bg="#fef2f2" color="#DC2626" />
          </div>

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>This Month's Rankings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.map((member, index) => {
                const statusPill = getMemberStatusPill(member.status);
                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      background: index < 3 ? ['#fffbeb', '#f9fafb', '#fff7f0'][index] : '#fafafa',
                      border: `1px solid ${index < 3 ? ['#fde68a', '#e5e7eb', '#fed7aa'][index] : '#e5e7eb'}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                    }}
                  >
                    <RankBadge rank={index + 1} />
                    <UserAvatar user={member} size={40} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{member.name}</span>
                        <StatusPill {...statusPill} />
                        {member.designation && <span style={{ fontSize: 12, color: '#9ca3af' }}>{member.designation}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                        <span>{member.total} tasks</span>
                        <span style={{ color: '#10b981' }}>{member.completed} done</span>
                        <span style={{ color: member.overdue > 0 ? '#ef4444' : '#9ca3af' }}>{member.overdue} overdue</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}><ProgressBar pct={member.completionRate} /></div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: member.completionRate >= 70 ? '#10b981' : member.completionRate >= 50 ? '#f59e0b' : '#ef4444', minWidth: 36 }}>
                          {member.completionRate}%
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => sendWhatsApp(member)} title="WhatsApp" style={{ minWidth: 54, height: 32, borderRadius: 8, background: '#dcfce7', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#166534', padding: '0 10px' }}>Chat</button>
                      <button onClick={() => { navigate('/projects'); onClose(); }} title="View Tasks" style={{ minWidth: 54, height: 32, borderRadius: 8, background: '#dbeafe', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1d4ed8', padding: '0 10px' }}>Tasks</button>
                    </div>
                  </div>
                );
              })}
              {stats.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No team members found</div>}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>Member Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {stats.map(member => {
                const statusPill = getMemberStatusPill(member.status);
                return (
                  <div key={member.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', background: 'white' }}>
                    <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e5e7eb' }}>
                      <UserAvatar user={member} size={38} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{member.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{member.designation || 'Team Member'}</div>
                      </div>
                      <StatusPill {...statusPill} />
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#374151' }}>
                      {member.currentWork.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Current Work</div>
                          {member.currentWork.map(task => (
                            <div key={task.id} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px dashed #f3f4f6' }}>
                              <span style={{ color: '#9ca3af' }}>{task.projectName}: </span>
                              <span style={{ fontWeight: 500 }}>{task.title}</span>
                              <span style={{ color: '#0D9488', marginLeft: 6 }}>{task.completionPercentage || 0}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 16, paddingTop: 4, flexWrap: 'wrap' }}>
                        <span>Open: <strong style={{ color: '#3b82f6' }}>{member.open}</strong></span>
                        <span>Done: <strong style={{ color: '#10b981' }}>{member.completed}</strong></span>
                        <span>Overdue: <strong style={{ color: member.overdue > 0 ? '#ef4444' : '#9ca3af' }}>{member.overdue}</strong></span>
                      </div>
                      {member.toolNames && <div style={{ fontSize: 12, color: '#6b7280' }}>Tools: {member.toolNames}</div>}
                      {member.enquiryCount > 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>Enquiries: {member.enquiryCount} open</div>}
                      {member.fuToday > 0 && <div style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>{member.fuToday} follow-up{member.fuToday > 1 ? 's' : ''} due today</div>}
                      <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
                        <button onClick={() => sendWhatsApp(member)} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>Open WhatsApp</button>
                        <button onClick={() => { navigate('/projects'); onClose(); }} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #0D9488', background: '#f0fdfa', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#0D9488' }}>View Tasks</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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

          <div>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Current Work Distribution</h3>
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    {['Member', 'Project', 'Task', 'Progress', 'Due'].map(header => (
                      <th key={header} style={{ padding: '8px 14px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.flatMap(member => member.currentWork.map(task => {
                    const due = task.targetDate?.toDate?.() || new Date(task.targetDate);
                    const days = due ? Math.ceil((due - new Date()) / 86400000) : null;
                    return (
                      <tr key={`${member.id}-${task.id}`} style={{ background: task.status === 'overdue' ? '#fef2f2' : 'white', borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{member.name?.split(' ')[0]}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{task.projectName}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>{task.title}</td>
                        <td style={{ padding: '10px 14px', minWidth: 100 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1 }}><ProgressBar pct={task.completionPercentage || 0} /></div>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{task.completionPercentage || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12 }}>
                          {task.status === 'overdue'
                            ? <span style={{ color: '#ef4444', fontWeight: 700 }}>Overdue</span>
                            : days === 0 ? <span style={{ color: '#D97706', fontWeight: 700 }}>Today</span>
                            : days > 0 ? <span style={{ color: '#6b7280' }}>{days}d</span>
                            : <span style={{ color: '#9ca3af' }}>-</span>
                          }
                        </td>
                      </tr>
                    );
                  }))}
                  {stats.flatMap(member => member.currentWork).length === 0 && (
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

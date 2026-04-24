import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, ProgressBar, Badge } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, fmtDate, isToday, isThisWeek, getInitials } from './popupUtils';

const TABS = ['All', 'Overdue', 'Due Today', 'By Project', 'By Member'];

function getStatusBadge(task) {
  if (task.status === 'overdue') {
    return { label: `${task.overdueDays}d overdue`, color: '#DC2626', bg: '#fee2e2' };
  }

  if (task.status === 'open') {
    return { label: 'Open', color: '#2563eb', bg: '#dbeafe' };
  }

  return { label: task.status || 'In Progress', color: '#D97706', bg: '#fef3c7' };
}

export default function TasksPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubs = [
      onSnapshot(
        query(collection(db, 'tasks'), where('status', '!=', 'completed')),
        s => { setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      ),
      onSnapshot(collection(db, 'projects'), s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const enriched = useMemo(() => tasks.map(task => ({
    ...task,
    projectName: projects.find(p => p.id === task.projectId)?.name || '-',
    memberName: users.find(u => u.id === task.assignedTo)?.name || task.assignedToName || '-',
    overdueDays: task.status === 'overdue' ? (task.overdueDays || 0) : 0,
    dueToday: isToday(task.targetDate),
    dueThisWeek: isThisWeek(task.targetDate),
  })).sort((a, b) => (b.overdueDays - a.overdueDays)), [tasks, projects, users]);

  const summary = useMemo(() => ({
    total: enriched.length,
    overdue: enriched.filter(task => task.status === 'overdue').length,
    today: enriched.filter(task => task.dueToday).length,
    week: enriched.filter(task => task.dueThisWeek).length,
  }), [enriched]);

  const filtered = useMemo(() => {
    if (tab === 'Overdue') return enriched.filter(task => task.status === 'overdue');
    if (tab === 'Due Today') return enriched.filter(task => task.dueToday);
    return enriched;
  }, [enriched, tab]);

  const byProject = useMemo(() => {
    const map = {};
    enriched.forEach(task => {
      const key = task.projectName;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [enriched]);

  const byMember = useMemo(() => {
    const map = {};
    enriched.forEach(task => {
      const key = task.memberName;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [enriched]);

  const tdStyle = { padding: '10px 12px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' };
  const thStyle = { padding: '8px 12px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' };

  function TaskTable({ rows }) {
    if (!rows.length) return <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No tasks in this view</div>;

    return (
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              {['Task', 'Project', 'Assigned To', 'Target Date', 'Status', 'Progress'].map(header => (
                <th key={header} style={thStyle}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(task => {
              const rowBg = task.status === 'overdue' ? '#fff5f5' : task.dueToday ? '#fffbeb' : 'transparent';
              const badge = getStatusBadge(task);
              return (
                <tr key={task.id} style={{ background: rowBg, borderLeft: task.status === 'overdue' ? '3px solid #ef4444' : 'none' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#111827', maxWidth: 200 }}>
                    {task.dueToday && <Badge label="Due Today" color="#D97706" bg="#fef3c7" />}
                    <div style={{ marginTop: task.dueToday ? 4 : 0 }}>{task.title}</div>
                  </td>
                  <td style={tdStyle}>{task.projectName}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0D9488', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {getInitials(task.memberName)}
                      </div>
                      {task.memberName}
                    </div>
                  </td>
                  <td style={tdStyle}>{fmtDate(task.targetDate)}</td>
                  <td style={tdStyle}>
                    <Badge label={badge.label} color={badge.color} bg={badge.bg} />
                  </td>
                  <td style={{ ...tdStyle, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ProgressBar pct={task.completionPercentage || 0} />
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{task.completionPercentage || 0}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function GroupedView({ groups, groupType }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(groups).map(([name, groupTasks]) => {
          const overdue = groupTasks.filter(task => task.status === 'overdue').length;
          return (
            <div key={name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{groupType}: {name}</span>
                <Badge label={`${groupTasks.length} tasks`} color="#6b7280" bg="#e5e7eb" />
                {overdue > 0 && <Badge label={`${overdue} overdue`} color="#DC2626" bg="#fee2e2" />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
                {groupTasks.map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, borderLeft: task.status === 'overdue' ? '3px solid #ef4444' : '3px solid #e5e7eb' }}>
                    <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>{task.title}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {tab === 'By Project' ? task.memberName : task.projectName}
                    </span>
                    <div style={{ width: 80 }}><ProgressBar pct={task.completionPercentage || 0} /></div>
                    <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{task.completionPercentage || 0}%</span>
                    {task.status === 'overdue' && <Badge label="Overdue" color="#DC2626" bg="#fee2e2" />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {Object.keys(groups).length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No tasks</div>}
      </div>
    );
  }

  return (
    <BasePopup
      isOpen={isOpen}
      onClose={onClose}
      title="All Open Tasks"
      badge
      footer={<FooterBtn label="Open Tasks Page" onClick={() => { navigate('/projects'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <SummaryCard label="Total Open" value={summary.total} bg="#eff6ff" color="#3b82f6" />
            <SummaryCard label="Overdue" value={summary.overdue} bg="#fef2f2" color="#DC2626" />
            <SummaryCard label="Due Today" value={summary.today} bg="#fffbeb" color="#D97706" />
            <SummaryCard label="Due This Week" value={summary.week} bg="#fefce8" color="#ca8a04" />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
            {TABS.map(item => (
              <button
                key={item}
                onClick={() => setTab(item)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: tab === item ? 700 : 500,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: tab === item ? '#0D9488' : '#6b7280',
                  borderBottom: `2px solid ${tab === item ? '#0D9488' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {tab === 'By Project' ? <GroupedView groups={byProject} groupType="Project" /> :
           tab === 'By Member' ? <GroupedView groups={byMember} groupType="Member" /> :
           <TaskTable rows={filtered} />}
        </>
      )}
    </BasePopup>
  );
}

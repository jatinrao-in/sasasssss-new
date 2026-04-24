import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, ProgressBar, Badge } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, fmtDate, isToday, isThisWeek, getInitials } from './popupUtils';

const TABS = ['All', 'Overdue', 'Due Today', 'By Project', 'By Member'];

export default function TasksPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [tasks,    setTasks]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('All');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubs = [
      onSnapshot(query(collection(db, 'tasks'), where('status', '!=', 'completed')),
        s => { setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'projects'),
        s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'users'),
        s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const enriched = useMemo(() => tasks.map(t => ({
    ...t,
    projectName: projects.find(p => p.id === t.projectId)?.name || '—',
    memberName:  users.find(u => u.id === t.assignedTo)?.name || t.assignedToName || '—',
    overdueDays: t.status === 'overdue' ? (t.overdueDays || 0) : 0,
    dueToday:    isToday(t.targetDate),
    dueThisWeek: isThisWeek(t.targetDate),
  })).sort((a, b) => (b.overdueDays - a.overdueDays)), [tasks, projects, users]);

  const summary = useMemo(() => ({
    total:    enriched.length,
    overdue:  enriched.filter(t => t.status === 'overdue').length,
    today:    enriched.filter(t => t.dueToday).length,
    week:     enriched.filter(t => t.dueThisWeek).length,
  }), [enriched]);

  // Filtered list
  const filtered = useMemo(() => {
    if (tab === 'Overdue')   return enriched.filter(t => t.status === 'overdue');
    if (tab === 'Due Today') return enriched.filter(t => t.dueToday);
    return enriched;
  }, [enriched, tab]);

  // Grouped by project
  const byProject = useMemo(() => {
    const map = {};
    enriched.forEach(t => {
      const k = t.projectName;
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  }, [enriched]);

  // Grouped by member
  const byMember = useMemo(() => {
    const map = {};
    enriched.forEach(t => {
      const k = t.memberName;
      if (!map[k]) map[k] = [];
      map[k].push(t);
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
              {['Task', 'Project', 'Assigned To', 'Target Date', 'Status', 'Progress'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(t => {
              const rowBg = t.status === 'overdue' ? '#fff5f5' : t.dueToday ? '#fffbeb' : 'transparent';
              return (
                <tr key={t.id} style={{ background: rowBg, borderLeft: t.status === 'overdue' ? '3px solid #ef4444' : 'none' }}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#111827', maxWidth: 200 }}>
                    {t.dueToday && <Badge label="Urgent" color="#f59e0b" bg="#fef3c7" />}
                    <div style={{ marginTop: t.dueToday ? 4 : 0 }}>{t.title}</div>
                  </td>
                  <td style={tdStyle}>{t.projectName}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0D9488', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {getInitials(t.memberName)}
                      </div>
                      {t.memberName}
                    </div>
                  </td>
                  <td style={tdStyle}>{fmtDate(t.targetDate)}</td>
                  <td style={tdStyle}>
                    <Badge
                      label={t.status === 'overdue' ? `⚠️ ${t.overdueDays}d overdue` : t.status}
                      color={t.status === 'overdue' ? '#ef4444' : t.status === 'open' ? '#3b82f6' : '#f59e0b'}
                      bg={t.status === 'overdue' ? '#fee2e2' : t.status === 'open' ? '#dbeafe' : '#fef3c7'}
                    />
                  </td>
                  <td style={{ ...tdStyle, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ProgressBar pct={t.completionPercentage || 0} />
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{t.completionPercentage || 0}%</span>
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

  function GroupedView({ groups, icon }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.entries(groups).map(([name, gtasks]) => {
          const overdue = gtasks.filter(t => t.status === 'overdue').length;
          return (
            <div key={name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 10 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{name}</span>
                <Badge label={`${gtasks.length} tasks`} color="#6b7280" bg="#e5e7eb" />
                {overdue > 0 && <Badge label={`${overdue} overdue`} color="#ef4444" bg="#fee2e2" />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
                {gtasks.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, borderLeft: t.status === 'overdue' ? '3px solid #ef4444' : '3px solid #e5e7eb' }}>
                    <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 500 }}>{t.title}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {tab === 'By Project' ? t.memberName : t.projectName}
                    </span>
                    <div style={{ width: 80 }}><ProgressBar pct={t.completionPercentage || 0} /></div>
                    <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{t.completionPercentage || 0}%</span>
                    {t.status === 'overdue' && <Badge label="⚠️" color="#ef4444" bg="#fee2e2" />}
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
      isOpen={isOpen} onClose={onClose}
      title="All Open Tasks" badge
      footer={<FooterBtn label="Open Tasks Page" onClick={() => { navigate('/projects'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <SummaryCard label="Total Open"     value={summary.total}   bg="#eff6ff" color="#3b82f6" />
            <SummaryCard label="Overdue ⚠️"    value={summary.overdue} bg="#fef2f2" color="#ef4444" />
            <SummaryCard label="Due Today 🔔"   value={summary.today}   bg="#fffbeb" color="#f59e0b" />
            <SummaryCard label="Due This Week"  value={summary.week}    bg="#fefce8" color="#ca8a04" />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: tab === t ? 700 : 500,
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: tab === t ? '#0D9488' : '#6b7280',
                borderBottom: `2px solid ${tab === t ? '#0D9488' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>{t}</button>
            ))}
          </div>

          {/* Content */}
          {tab === 'By Project' ? <GroupedView groups={byProject} icon="📁" /> :
           tab === 'By Member'  ? <GroupedView groups={byMember}  icon="👤" /> :
           <TaskTable rows={filtered} />}
        </>
      )}
    </BasePopup>
  );
}

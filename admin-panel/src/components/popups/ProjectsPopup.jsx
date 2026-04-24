import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, ProgressBar } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, fmtCur } from './popupUtils';
import { StatusPill, getProjectHealthMeta } from '../ui/TextIndicators';

function getHealth(tasks) {
  const overdue = tasks.filter(t => t.status === 'overdue').length;
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (overdue >= 3 || pct === 0) return 'critical';
  if (overdue >= 1 || pct < 50) return 'at-risk';
  return 'on-track';
}

const HEALTH_ORDER = { critical: 0, 'at-risk': 1, 'on-track': 2 };

export default function ProjectsPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const unsubs = [
      onSnapshot(
        query(collection(db, 'projects'), where('status', '!=', 'completed')),
        s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(
        collection(db, 'tasks'),
        s => { setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
      ),
      onSnapshot(
        collection(db, 'users'),
        s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      ),
    ];

    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const enriched = useMemo(() => {
    return projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const overdue = projectTasks.filter(t => t.status === 'overdue').length;
      const open = projectTasks.filter(t => t.status === 'open' || t.status === 'in-progress').length;
      const pct = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
      const health = getHealth(projectTasks);
      const expense = Number(project.totalExpense || 0);
      const poValue = Number(project.poValue || 0);
      const expPct = poValue > 0 ? Math.min(100, Math.round((expense / poValue) * 100)) : 0;
      const memberIds = [...new Set(projectTasks.map(t => t.assignedTo).filter(Boolean))];
      const memberNames = memberIds.map(id => users.find(u => u.id === id)?.name || id);
      return {
        ...project,
        ptasks: projectTasks,
        completed,
        overdue,
        open,
        pct,
        health,
        expense,
        poValue,
        expPct,
        memberNames,
      };
    }).sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]);
  }, [projects, tasks, users]);

  const summary = useMemo(() => ({
    total: enriched.length,
    onTrack: enriched.filter(p => p.health === 'on-track').length,
    atRisk: enriched.filter(p => p.health === 'at-risk').length,
    critical: enriched.filter(p => p.health === 'critical').length,
  }), [enriched]);

  const chartData = enriched.slice(0, 10).map(project => ({ name: project.name?.substring(0, 20), pct: project.pct }));

  return (
    <BasePopup
      isOpen={isOpen}
      onClose={onClose}
      title="Active Projects Overview"
      badge
      footer={<FooterBtn label="Open Projects Page" onClick={() => { navigate('/projects'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <SummaryCard label="Total Active" value={summary.total} bg="#f0f9ff" color="#0369a1" />
            <SummaryCard label="On Track" value={summary.onTrack} bg="#f0fdf4" color="#16A34A" />
            <SummaryCard label="At Risk" value={summary.atRisk} bg="#fffbeb" color="#D97706" />
            <SummaryCard label="Critical" value={summary.critical} bg="#fef2f2" color="#DC2626" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
            {enriched.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 15 }}>
                No active projects right now
              </div>
            )}

            {enriched.map(project => {
              const healthMeta = getProjectHealthMeta(project.health);
              return (
                <div
                  key={project.id}
                  style={{
                    background: healthMeta.background,
                    border: `1px solid ${healthMeta.border}`,
                    borderRadius: 14,
                    padding: '18px 20px',
                    borderLeft: `4px solid ${healthMeta.color}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{project.name}</span>
                      <StatusPill
                        label={healthMeta.label}
                        color={healthMeta.color}
                        background={healthMeta.background}
                        borderColor={healthMeta.border}
                      />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 18, color: healthMeta.color }}>{project.pct}%</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 13, color: '#374151', marginBottom: 10 }}>
                    <span>PO Value: <strong>{fmtCur(project.poValue)}</strong></span>
                    <span>Expense: <strong>{fmtCur(project.expense)}</strong> ({project.expPct}% used)</span>
                  </div>

                  <ProgressBar pct={project.pct} />

                  <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
                    <span>Done: <strong style={{ color: '#10b981' }}>{project.completed}</strong></span>
                    <span>Open: <strong style={{ color: '#3b82f6' }}>{project.open}</strong></span>
                    <span>Overdue: <strong style={{ color: project.overdue > 0 ? '#ef4444' : '#9ca3af' }}>{project.overdue}</strong></span>
                    <span>Total: <strong>{project.ptasks.length}</strong></span>
                  </div>

                  {project.memberNames.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>Team:</span>
                      {project.memberNames.map((name, index) => (
                        <span
                          key={index}
                          style={{
                            background: '#e5e7eb',
                            borderRadius: 99,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#374151',
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {chartData.length > 0 && (
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Completion Chart</h3>
              <ResponsiveContainer width="100%" height={chartData.length * 38 + 40}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${value}%`} contentStyle={{ borderRadius: 10 }} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {chartData.map((item, index) => (
                      <Cell key={index} fill={item.pct >= 70 ? '#10b981' : item.pct >= 40 ? '#D97706' : '#DC2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </BasePopup>
  );
}

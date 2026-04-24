import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, ProgressBar, Badge } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, fmtDate, fmtCur, getInitials } from './popupUtils';

function getHealth(tasks) {
  const overdue = tasks.filter(t => t.status === 'overdue').length;
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (overdue >= 3 || pct === 0) return 'critical';
  if (overdue >= 1 || pct < 50) return 'at-risk';
  return 'on-track';
}

const HEALTH_CONFIG = {
  'on-track': { label: '🟢 On Track', color: '#10b981', bg: '#f0fdf4' },
  'at-risk':  { label: '🟡 At Risk',  color: '#f59e0b', bg: '#fffbeb' },
  'critical': { label: '🔴 Critical', color: '#ef4444', bg: '#fef2f2' },
};
const HEALTH_ORDER = { critical: 0, 'at-risk': 1, 'on-track': 2 };

export default function ProjectsPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const unsubs = [
      onSnapshot(query(collection(db, 'projects'), where('status', '!=', 'completed')),
        s => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'tasks'),
        s => { setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'users'),
        s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];

    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const enriched = useMemo(() => {
    return projects.map(p => {
      const ptasks = tasks.filter(t => t.projectId === p.id);
      const completed = ptasks.filter(t => t.status === 'completed').length;
      const overdue   = ptasks.filter(t => t.status === 'overdue').length;
      const open      = ptasks.filter(t => t.status === 'open' || t.status === 'in-progress').length;
      const pct = ptasks.length > 0 ? Math.round((completed / ptasks.length) * 100) : 0;
      const health = getHealth(ptasks);
      const expense = Number(p.totalExpense || 0);
      const poValue = Number(p.poValue || 0);
      const expPct  = poValue > 0 ? Math.min(100, Math.round((expense / poValue) * 100)) : 0;
      const memberIds = [...new Set(ptasks.map(t => t.assignedTo).filter(Boolean))];
      const memberNames = memberIds.map(id => users.find(u => u.id === id)?.name || id);
      return { ...p, ptasks, completed, overdue, open, pct, health, expense, poValue, expPct, memberNames };
    }).sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]);
  }, [projects, tasks, users]);

  const summary = useMemo(() => ({
    total:    enriched.length,
    onTrack:  enriched.filter(p => p.health === 'on-track').length,
    atRisk:   enriched.filter(p => p.health === 'at-risk').length,
    critical: enriched.filter(p => p.health === 'critical').length,
  }), [enriched]);

  const chartData = enriched.slice(0, 10).map(p => ({ name: p.name?.substring(0, 20), pct: p.pct }));

  return (
    <BasePopup
      isOpen={isOpen} onClose={onClose}
      title="Active Projects Overview" badge
      footer={<FooterBtn label="Open Projects Page" onClick={() => { navigate('/projects'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <SummaryCard label="Total Active" value={summary.total} bg="#f0f9ff" color="#0369a1" />
            <SummaryCard label="On Track 🟢" value={summary.onTrack} bg="#f0fdf4" color="#10b981" />
            <SummaryCard label="At Risk 🟡"  value={summary.atRisk}  bg="#fffbeb" color="#f59e0b" />
            <SummaryCard label="Critical 🔴" value={summary.critical} bg="#fef2f2" color="#ef4444" />
          </div>

          {/* Project cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
            {enriched.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40, fontSize: 15 }}>
                🎉 No active projects right now
              </div>
            )}
            {enriched.map(p => {
              const hc = HEALTH_CONFIG[p.health];
              return (
                <div key={p.id} style={{
                  background: hc.bg, border: `1px solid ${hc.color}33`,
                  borderRadius: 14, padding: '18px 20px',
                  borderLeft: `4px solid ${hc.color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{p.name}</span>
                      <Badge label={hc.label} color={hc.color} bg={`${hc.color}18`} />
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 18, color: hc.color }}>{p.pct}%</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 13, color: '#374151', marginBottom: 10 }}>
                    <span>💰 PO Value: <strong>{fmtCur(p.poValue)}</strong></span>
                    <span>📉 Expense: <strong>{fmtCur(p.expense)}</strong> ({p.expPct}% used)</span>
                  </div>

                  <ProgressBar pct={p.pct} />

                  <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                    <span>✅ Done: <strong style={{ color: '#10b981' }}>{p.completed}</strong></span>
                    <span>🔄 Open: <strong style={{ color: '#3b82f6' }}>{p.open}</strong></span>
                    <span>⚠️ Overdue: <strong style={{ color: p.overdue > 0 ? '#ef4444' : '#9ca3af' }}>{p.overdue}</strong></span>
                    <span>📋 Total: <strong>{p.ptasks.length}</strong></span>
                  </div>

                  {p.memberNames.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>👥 Team:</span>
                      {p.memberNames.map((n, i) => (
                        <span key={i} style={{
                          background: '#e5e7eb', borderRadius: 99, padding: '2px 8px',
                          fontSize: 11, fontWeight: 600, color: '#374151',
                        }}>{n}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Completion Chart</h3>
              <ResponsiveContainer width="100%" height={chartData.length * 38 + 40}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 10 }} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={20}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.pct >= 70 ? '#10b981' : d.pct >= 40 ? '#f59e0b' : '#ef4444'} />
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

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, ProgressBar, Badge } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, fmtDate, fmtCur } from './popupUtils';

const AGING_BUCKETS = [
  { label: '0–30 days',  min: 0,  max: 30,  color: '#10b981', bg: '#f0fdf4' },
  { label: '31–60 days', min: 31, max: 60,  color: '#f59e0b', bg: '#fffbeb' },
  { label: '61–90 days', min: 61, max: 90,  color: '#f97316', bg: '#fff7ed' },
  { label: '90+ days',   min: 91, max: 9999, color: '#ef4444', bg: '#fef2f2' },
];

const FILTER_OPTIONS = ['All', 'Overdue', 'Due This Week', 'Received', 'Partial'];

export default function PaymentsPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [payments,  setPayments]  = useState([]);
  const [outgoing,  setOutgoing]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('All');
  const [showOut,   setShowOut]   = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubs = [
      onSnapshot(collection(db, 'payments'),
        s => { setPayments(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'outgoing_payments'),
        s => setOutgoing(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const pending   = payments.filter(p => p.paymentStatus !== 'received');
  const received  = payments.filter(p => p.paymentStatus === 'received');

  const summary = useMemo(() => {
    const totalRec      = pending.reduce((s, p) => s + (Number(p.amount) || 0) - (Number(p.totalPaid) || 0), 0);
    const receivedMth   = received.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const overdueAmt    = pending.filter(p => (p.overdueDays || 0) > 0).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const partial       = payments.filter(p => p.paymentStatus === 'partial').length;
    const totalInvoices = pending.length;
    const collectionRate = payments.length > 0
      ? Math.round((received.length / payments.length) * 100) : 0;
    return { totalRec, receivedMth, overdueAmt, partial, collectionRate, totalInvoices };
  }, [payments, pending, received]);

  const agingBuckets = useMemo(() => {
    const total = pending.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return AGING_BUCKETS.map(b => {
      const items = pending.filter(p => {
        const d = p.overdueDays || 0;
        return d >= b.min && d <= b.max;
      });
      const amt = items.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      return { ...b, count: items.length, amount: amt, pct: total > 0 ? Math.round((amt / total) * 100) : 0 };
    });
  }, [pending]);

  const filtered = useMemo(() => {
    let list = payments;
    if (filter === 'Overdue')      list = payments.filter(p => (p.overdueDays || 0) > 0 && p.paymentStatus !== 'received');
    if (filter === 'Due This Week') list = payments.filter(p => {
      const d = p.targetPaymentDate?.toDate?.() || new Date(p.targetPaymentDate);
      const diff = (d - new Date()) / 86400000;
      return diff >= 0 && diff <= 7;
    });
    if (filter === 'Received') list = received;
    if (filter === 'Partial')  list = payments.filter(p => p.paymentStatus === 'partial');
    return list;
  }, [payments, filter, received]);

  const monthlyChart = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const m = d.getMonth(); const y = d.getFullYear();
      const amt = received.filter(p => {
        const pd = p.updatedAt?.toDate?.() || new Date(p.updatedAt);
        return pd && pd.getMonth() === m && pd.getFullYear() === y;
      }).reduce((s, p) => s + (Number(p.amount) || 0), 0);
      months.push({ name: label, amount: amt });
    }
    return months;
  }, [received]);

  const outPending = outgoing.filter(o => o.status !== 'paid').reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const netPosition = summary.totalRec - outPending;

  const tdStyle = { padding: '10px 12px', fontSize: 12, color: '#374151', borderBottom: '1px solid #f3f4f6' };
  const thStyle = { padding: '8px 12px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' };

  function rowColor(p) {
    if ((p.overdueDays || 0) > 30) return '#fef2f2';
    if ((p.overdueDays || 0) > 0)  return '#fff7ed';
    return 'transparent';
  }

  return (
    <BasePopup
      isOpen={isOpen} onClose={onClose}
      title="Payment Receivables Overview" badge
      footer={<FooterBtn label="Open Payments Page" onClick={() => { navigate('/payments'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            <SummaryCard label="Total Receivable"    value={fmtCur(summary.totalRec)}    bg="#fff7ed" color="#f59e0b" />
            <SummaryCard label="Received This Month" value={fmtCur(summary.receivedMth)} bg="#f0fdf4" color="#10b981" />
            <SummaryCard label="Overdue Amount"      value={fmtCur(summary.overdueAmt)}  bg="#fef2f2" color="#ef4444" />
            <SummaryCard label="Partial Payments"    value={summary.partial}              bg="#eff6ff" color="#3b82f6" />
            <SummaryCard label="Collection Rate"     value={`${summary.collectionRate}%`} bg="#f0fdfa" color="#0D9488" />
          </div>

          {/* Aging breakdown */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Aging Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agingBuckets.map(b => (
                <div key={b.label} style={{ background: b.bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${b.color}22` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: b.color }}>{b.label}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{b.count} invoices · <strong style={{ color: b.color }}>{fmtCur(b.amount)}</strong></span>
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${b.pct}%`, height: '100%', background: b.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter + Table */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', margin: 0 }}>Invoice List</h3>
              <select value={filter} onChange={e => setFilter(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', color: '#374151', background: 'white' }}>
                {FILTER_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr>
                    {['Customer', 'Invoice No', 'Amount', 'Paid', 'Pending', 'Overdue', 'Status', 'Assigned To'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>No payments in this view</td></tr>
                  )}
                  {filtered.map(p => {
                    const netPending = (Number(p.amount) || 0) - (Number(p.totalPaid) || 0);
                    const od = p.overdueDays || 0;
                    return (
                      <tr key={p.id} style={{ background: rowColor(p) }}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{p.customerName}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{p.invoiceNumber || '—'}</td>
                        <td style={tdStyle}>{fmtCur(p.amount)}</td>
                        <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>{fmtCur(p.totalPaid)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: netPending > 0 ? '#ef4444' : '#10b981' }}>{fmtCur(netPending)}</td>
                        <td style={tdStyle}>
                          {od > 0 ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{od}d</span> : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                        <td style={tdStyle}>
                          <Badge
                            label={p.paymentStatus || 'pending'}
                            color={p.paymentStatus === 'received' ? '#10b981' : p.paymentStatus === 'partial' ? '#3b82f6' : '#ef4444'}
                            bg={p.paymentStatus === 'received' ? '#dcfce7' : p.paymentStatus === 'partial' ? '#dbeafe' : '#fee2e2'}
                          />
                        </td>
                        <td style={tdStyle}>{p.assignedToName || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outgoing payments */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <button
              onClick={() => setShowOut(v => !v)}
              style={{ width: '100%', padding: '14px 20px', background: '#f9fafb', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 14, color: '#374151', display: 'flex', justifyContent: 'space-between' }}
            >
              {showOut ? '▲' : '▼'} Outgoing Payments Summary
            </button>
            {showOut && (
              <div style={{ padding: 20, display: 'flex', gap: 16, background: 'white', flexWrap: 'wrap' }}>
                <SummaryCard label="Total Outgoing Pending" value={fmtCur(outPending)} bg="#fef2f2" color="#ef4444" />
                <SummaryCard label="Net Cash Position" value={fmtCur(Math.abs(netPosition))} sub={netPosition >= 0 ? 'Surplus ✅' : 'Deficit ⚠️'} bg={netPosition >= 0 ? '#f0fdf4' : '#fef2f2'} color={netPosition >= 0 ? '#10b981' : '#ef4444'} />
              </div>
            )}
          </div>

          {/* Monthly chart */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Monthly Collections (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyChart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={v => fmtCur(v)} contentStyle={{ borderRadius: 10 }} />
                <Bar dataKey="amount" fill="#0D9488" radius={[6, 6, 0, 0]} name="Received" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </BasePopup>
  );
}

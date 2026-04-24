import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { db } from '../../lib/firebase';
import BasePopup, { SummaryCard, FooterBtn, Badge } from './BasePopup';
import { PopupSkeletonSummary, PopupSkeletonList, fmtCur } from './popupUtils';

const AGING_BUCKETS = [
  { label: '0-30 days', min: 0, max: 30, color: '#10b981', bg: '#f0fdf4' },
  { label: '31-60 days', min: 31, max: 60, color: '#f59e0b', bg: '#fffbeb' },
  { label: '61-90 days', min: 61, max: 90, color: '#f97316', bg: '#fff7ed' },
  { label: '90+ days', min: 91, max: 9999, color: '#ef4444', bg: '#fef2f2' },
];

const FILTER_OPTIONS = ['All', 'Overdue', 'Due This Week', 'Received', 'Partial'];

export default function PaymentsPopup({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showOut, setShowOut] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubs = [
      onSnapshot(collection(db, 'payments'), s => { setPayments(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'outgoing_payments'), s => setOutgoing(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => unsubs.forEach(u => u());
  }, [isOpen]);

  const pending = payments.filter(p => p.paymentStatus !== 'received');
  const received = payments.filter(p => p.paymentStatus === 'received');

  const summary = useMemo(() => {
    const totalRec = pending.reduce((sum, payment) => sum + (Number(payment.amount) || 0) - (Number(payment.totalPaid) || 0), 0);
    const receivedMth = received.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const overdueAmt = pending.filter(payment => (payment.overdueDays || 0) > 0).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const partial = payments.filter(payment => payment.paymentStatus === 'partial').length;
    const collectionRate = payments.length > 0 ? Math.round((received.length / payments.length) * 100) : 0;
    return { totalRec, receivedMth, overdueAmt, partial, collectionRate };
  }, [payments, pending, received]);

  const agingBuckets = useMemo(() => {
    const total = pending.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    return AGING_BUCKETS.map(bucket => {
      const items = pending.filter(payment => {
        const overdueDays = payment.overdueDays || 0;
        return overdueDays >= bucket.min && overdueDays <= bucket.max;
      });
      const amount = items.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      return {
        ...bucket,
        count: items.length,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      };
    });
  }, [pending]);

  const filtered = useMemo(() => {
    let list = payments;
    if (filter === 'Overdue') list = payments.filter(payment => (payment.overdueDays || 0) > 0 && payment.paymentStatus !== 'received');
    if (filter === 'Due This Week') {
      list = payments.filter(payment => {
        const date = payment.targetPaymentDate?.toDate?.() || new Date(payment.targetPaymentDate);
        const diff = (date - new Date()) / 86400000;
        return diff >= 0 && diff <= 7;
      });
    }
    if (filter === 'Received') list = received;
    if (filter === 'Partial') list = payments.filter(payment => payment.paymentStatus === 'partial');
    return list;
  }, [payments, filter, received]);

  const monthlyChart = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const label = date.toLocaleDateString('en-IN', { month: 'short' });
      const month = date.getMonth();
      const year = date.getFullYear();
      const amount = received.filter(payment => {
        const paymentDate = payment.updatedAt?.toDate?.() || new Date(payment.updatedAt);
        return paymentDate && paymentDate.getMonth() === month && paymentDate.getFullYear() === year;
      }).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      months.push({ name: label, amount });
    }
    return months;
  }, [received]);

  const outPending = outgoing.filter(item => item.status !== 'paid').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netPosition = summary.totalRec - outPending;

  const tdStyle = { padding: '10px 12px', fontSize: 12, color: '#374151', borderBottom: '1px solid #f3f4f6' };
  const thStyle = { padding: '8px 12px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' };

  function rowColor(payment) {
    if ((payment.overdueDays || 0) > 30) return '#fef2f2';
    if ((payment.overdueDays || 0) > 0) return '#fff7ed';
    return 'transparent';
  }

  return (
    <BasePopup
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Receivables Overview"
      badge
      footer={<FooterBtn label="Open Payments Page" onClick={() => { navigate('/payments'); onClose(); }} />}
    >
      {loading ? (
        <><PopupSkeletonSummary /><PopupSkeletonList /></>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            <SummaryCard label="Total Receivable" value={fmtCur(summary.totalRec)} bg="#fff7ed" color="#f59e0b" />
            <SummaryCard label="Received This Month" value={fmtCur(summary.receivedMth)} bg="#f0fdf4" color="#10b981" />
            <SummaryCard label="Overdue Amount" value={fmtCur(summary.overdueAmt)} bg="#fef2f2" color="#ef4444" />
            <SummaryCard label="Partial Payments" value={summary.partial} bg="#eff6ff" color="#3b82f6" />
            <SummaryCard label="Collection Rate" value={`${summary.collectionRate}%`} bg="#f0fdfa" color="#0D9488" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Aging Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agingBuckets.map(bucket => (
                <div key={bucket.label} style={{ background: bucket.bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${bucket.color}22` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: bucket.color }}>{bucket.label}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{bucket.count} invoices | <strong style={{ color: bucket.color }}>{fmtCur(bucket.amount)}</strong></span>
                  </div>
                  <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${bucket.pct}%`, height: '100%', background: bucket.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', margin: 0 }}>Invoice List</h3>
              <select value={filter} onChange={e => setFilter(e.target.value)} style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', color: '#374151', background: 'white' }}>
                {FILTER_OPTIONS.map(option => <option key={option}>{option}</option>)}
              </select>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr>
                    {['Customer', 'Invoice No', 'Amount', 'Paid', 'Pending', 'Overdue', 'Status', 'Assigned To'].map(header => (
                      <th key={header} style={thStyle}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 }}>No payments in this view</td></tr>
                  )}
                  {filtered.map(payment => {
                    const netPending = (Number(payment.amount) || 0) - (Number(payment.totalPaid) || 0);
                    const overdueDays = payment.overdueDays || 0;
                    return (
                      <tr key={payment.id} style={{ background: rowColor(payment) }}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{payment.customerName}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{payment.invoiceNumber || '-'}</td>
                        <td style={tdStyle}>{fmtCur(payment.amount)}</td>
                        <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>{fmtCur(payment.totalPaid)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: netPending > 0 ? '#ef4444' : '#10b981' }}>{fmtCur(netPending)}</td>
                        <td style={tdStyle}>
                          {overdueDays > 0 ? <span style={{ color: '#ef4444', fontWeight: 700 }}>{overdueDays}d</span> : <span style={{ color: '#9ca3af' }}>-</span>}
                        </td>
                        <td style={tdStyle}>
                          <Badge
                            label={payment.paymentStatus || 'pending'}
                            color={payment.paymentStatus === 'received' ? '#10b981' : payment.paymentStatus === 'partial' ? '#3b82f6' : '#ef4444'}
                            bg={payment.paymentStatus === 'received' ? '#dcfce7' : payment.paymentStatus === 'partial' ? '#dbeafe' : '#fee2e2'}
                          />
                        </td>
                        <td style={tdStyle}>{payment.assignedToName || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <button
              onClick={() => setShowOut(value => !value)}
              style={{ width: '100%', padding: '14px 20px', background: '#f9fafb', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 14, color: '#374151', display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Outgoing Payments Summary</span>
              <span>{showOut ? 'Hide' : 'Show'}</span>
            </button>
            {showOut && (
              <div style={{ padding: 20, display: 'flex', gap: 16, background: 'white', flexWrap: 'wrap' }}>
                <SummaryCard label="Total Outgoing Pending" value={fmtCur(outPending)} bg="#fef2f2" color="#ef4444" />
                <SummaryCard label="Net Cash Position" value={fmtCur(Math.abs(netPosition))} sub={netPosition >= 0 ? 'Surplus' : 'Deficit'} bg={netPosition >= 0 ? '#f0fdf4' : '#fef2f2'} color={netPosition >= 0 ? '#10b981' : '#ef4444'} />
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>Monthly Collections (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyChart}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={value => `Rs ${Math.round(value / 1000)}k`} />
                <Tooltip formatter={value => fmtCur(value)} contentStyle={{ borderRadius: 10 }} />
                <Bar dataKey="amount" fill="#0D9488" radius={[6, 6, 0, 0]} name="Received" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </BasePopup>
  );
}

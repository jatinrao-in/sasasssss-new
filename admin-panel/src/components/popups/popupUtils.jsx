// Shared utility functions for Dashboard popups
import { formatCurrency } from '../../lib/formatters';

export function fmtDate(val) {
  if (!val) return '-';
  const d = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtCur(v) {
  return formatCurrency(Number(v) || 0);
}

export function daysDiff(val) {
  if (!val) return null;
  const d = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
  if (isNaN(d)) return null;
  return Math.floor((new Date() - d) / 86400000);
}

export function daysUntil(val) {
  if (!val) return null;
  const d = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
  if (isNaN(d)) return null;
  return Math.ceil((d - new Date()) / 86400000);
}

export function isToday(val) {
  if (!val) return false;
  const d = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

export function isThisWeek(val) {
  if (!val) return false;
  const d = typeof val?.toDate === 'function' ? val.toDate() : new Date(val);
  const now = new Date();
  const diff = (d - now) / 86400000;
  return diff >= 0 && diff <= 7;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Skeleton shimmer block
export function Shimmer({ h = '20px', w = '100%', r = '8px', mb = '0' }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

export function PopupSkeletonSummary() {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ flex: 1, background: '#f8fafc', borderRadius: 12, padding: 16 }}>
          <Shimmer h="12px" w="60%" mb="10px" />
          <Shimmer h="28px" w="70%" mb="6px" />
          <Shimmer h="10px" w="80%" />
        </div>
      ))}
    </div>
  );
}

export function PopupSkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
          <Shimmer h="14px" w="40%" mb="10px" />
          <Shimmer h="10px" w="90%" mb="8px" />
          <Shimmer h="10px" w="70%" mb="8px" />
          <Shimmer h="8px" w="100%" r="99px" />
        </div>
      ))}
    </div>
  );
}

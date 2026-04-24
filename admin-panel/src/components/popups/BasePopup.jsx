import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function BasePopup({ isOpen, onClose, title, badge, footer, children }) {
  const overlayRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'popupBackdropIn 0.2s ease',
        }}
      >
        {/* Modal */}
        <div
          style={{
            width: '90vw',
            maxWidth: '1100px',
            height: '90vh',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-primary, #e5e7eb)',
            animation: 'popupModalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-primary, #e5e7eb)',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #0D9488 0%, #065F5B 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 700, color: 'white',
                fontFamily: 'Inter, sans-serif', margin: 0,
              }}>
                {title}
              </h2>
              {badge && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 99,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#4ade80',
                    animation: 'livePulse 1.5s ease-in-out infinite',
                    display: 'inline-block',
                  }} />
                  LIVE
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}>
            {children}
          </div>

          {/* ── Footer ── */}
          {footer && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-primary, #e5e7eb)',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-secondary, #f9fafb)',
            }}>
              {footer}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes popupBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popupModalIn {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );
}

// Reusable Summary Mini Card
export function SummaryCard({ label, value, sub, color = '#0D9488', bg = '#f0fdfb', icon }) {
  return (
    <div style={{
      flex: 1, background: bg, borderRadius: 14, padding: '14px 16px',
      border: `1px solid ${color}22`,
    }}>
      {icon && <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>}
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, marginTop: 2, fontFamily: 'Inter, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Teal footer button
export function FooterBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, #0D9488 0%, #065F5B 100%)',
        color: 'white', border: 'none', borderRadius: 10,
        padding: '10px 22px', fontWeight: 600, fontSize: 14,
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {label} →
    </button>
  );
}

// Progress bar
export function ProgressBar({ pct, color }) {
  const c = color || (pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444');
  return (
    <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: c, borderRadius: 99, transition: 'width 0.5s' }} />
    </div>
  );
}

// Badge
export function Badge({ label, color = '#6b7280', bg = '#f3f4f6' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 99, background: bg, color, display: 'inline-block',
    }}>
      {label}
    </span>
  );
}

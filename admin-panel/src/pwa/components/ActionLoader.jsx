/**
 * ActionLoader — Full-screen overlay shown while any async action
 * (save / delete / update) is in progress. Prevents duplicate taps.
 *
 * Usage:
 *   <ActionLoader visible={saving} message="Saving..." />
 */
import React from 'react';

export default function ActionLoader({ visible = false, message = 'Please wait...' }) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      aria-label="Loading"
      role="status"
    >
      {/* Card */}
      <div
        className="flex flex-col items-center gap-4 px-8 py-7 rounded-3xl shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.96)',
          minWidth: 160,
        }}
      >
        {/* Spinner */}
        <div className="relative w-12 h-12">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border-[3px] border-slate-100"
          />
          {/* Spinning arc */}
          <div
            className="absolute inset-0 rounded-full border-[3px] border-transparent"
            style={{
              borderTopColor: '#0f172a',
              animation: 'pwa-spin 0.75s linear infinite',
            }}
          />
          {/* Inner pulse dot */}
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-2.5 h-2.5 rounded-full bg-slate-900"
              style={{ animation: 'pwa-pulse 1.2s ease-in-out infinite' }}
            />
          </div>
        </div>

        {/* Message */}
        <p className="text-[13px] font-bold text-slate-800 tracking-tight text-center leading-snug">
          {message}
        </p>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes pwa-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pwa-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

// Ping a reliable, tiny endpoint to confirm real connectivity.
// We use the Firebase project's own hosting URL — it's always up when internet works.
const PING_URL = 'https://firestore.googleapis.com';
const PING_TIMEOUT_MS = 5000;

async function checkRealConnectivity() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const response = await fetch(PING_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    // 400 from Firebase = we reached the server = we're online
    return response.status < 600;
  } catch {
    return false;
  }
}

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const backOnlineTimer = useRef(null);

  const handleOfflineEvent = useCallback(async () => {
    // Don't trust browser event alone — verify with real ping
    const online = await checkRealConnectivity();
    if (!online) {
      setBackOnline(false);
      setIsOffline(true);
    }
  }, []);

  const handleOnlineEvent = useCallback(async () => {
    if (!isOffline) return; // Was never offline — ignore
    // Verify with real ping before declaring back online
    const online = await checkRealConnectivity();
    if (online) {
      setIsOffline(false);
      setBackOnline(true);
      clearTimeout(backOnlineTimer.current);
      backOnlineTimer.current = setTimeout(() => setBackOnline(false), 3000);
    }
  }, [isOffline]);

  useEffect(() => {
    // ✅ Critical: do NOT check on mount.
    // This prevents false "offline" on slow connections at startup.
    window.addEventListener('offline', handleOfflineEvent);
    window.addEventListener('online', handleOnlineEvent);
    return () => {
      window.removeEventListener('offline', handleOfflineEvent);
      window.removeEventListener('online', handleOnlineEvent);
      clearTimeout(backOnlineTimer.current);
    };
  }, [handleOfflineEvent, handleOnlineEvent]);

  // Show nothing when app starts — only react to actual events
  if (!isOffline && !backOnline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '76px',     // just above bottom nav (64px) + 12px gap
        left: '12px',
        right: '12px',
        zIndex: 9997,
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: isOffline
          ? 'linear-gradient(135deg, #3B0000 0%, #450A0A 100%)'
          : 'linear-gradient(135deg, #052e16 0%, #14532D 100%)',
        color: 'white',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        border: `1px solid ${isOffline ? 'rgba(255,100,100,0.2)' : 'rgba(100,255,150,0.2)'}`,
        animation: 'offlineSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        willChange: 'transform, opacity',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: isOffline ? 'rgba(255,100,100,0.15)' : 'rgba(100,255,150,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isOffline
          ? <WifiOff size={15} color={isOffline ? '#fca5a5' : '#86efac'} />
          : <Wifi size={15} color="#86efac" />
        }
      </div>

      {/* Text */}
      <div>
        <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.2 }}>
          {isOffline ? 'No Internet Connection' : 'Back Online ✓'}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
          {isOffline
            ? 'Some features may be unavailable'
            : 'Everything is connected again'
          }
        </div>
      </div>

      {/* Dismiss (offline only) */}
      {isOffline && (
        <button
          onClick={() => setIsOffline(false)}
          style={{
            marginLeft: 'auto',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 26,
            height: 26,
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '16px',
            lineHeight: '26px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}

      <style>{`
        @keyframes offlineSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

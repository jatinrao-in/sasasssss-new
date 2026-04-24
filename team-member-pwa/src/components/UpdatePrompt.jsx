import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export default function UpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 30 minutes in the background
      if (r) {
        setInterval(() => {
          r.update();
        }, 30 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await updateServiceWorker(true); // true = reload after SW activates
    } catch (e) {
      // fallback: force reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!needRefresh || dismissed) return null;

  return (
    <>
      {/* Backdrop blur overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)',
        }}
        onClick={handleDismiss}
      />

      {/* Update Banner */}
      <div
        style={{
          position: 'fixed',
          bottom: '80px', // above bottom nav
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '420px',
          zIndex: 9999,
          animation: 'slideUpBanner 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #0D9488 0%, #065F5B 100%)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 20px 60px rgba(6, 95, 91, 0.45), 0 4px 16px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glow circles */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '100px',
            height: '100px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-20px',
            left: '-20px',
            width: '70px',
            height: '70px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '50%',
          }} />

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <X size={14} />
          </button>

          {/* Content */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            {/* Icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <Sparkles size={22} color="white" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: 'white',
                fontWeight: 700,
                fontSize: '15px',
                margin: '0 0 4px 0',
                fontFamily: 'Inter, sans-serif',
              }}>
                New Update Available! 🚀
              </p>
              <p style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: '13px',
                margin: '0 0 14px 0',
                fontFamily: 'Inter, sans-serif',
                lineHeight: '1.4',
              }}>
                A newer version of Saya Team App is ready. Tap update to get the latest features.
              </p>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: 'white',
                    color: '#0D9488',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: updating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontFamily: 'Inter, sans-serif',
                    opacity: updating ? 0.8 : 1,
                    transition: 'transform 0.15s, opacity 0.15s',
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {updating ? (
                    <>
                      <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Update Now
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes slideUpBanner {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}

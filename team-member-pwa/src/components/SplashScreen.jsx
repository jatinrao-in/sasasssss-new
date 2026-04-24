import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function SplashScreen() {
  const { loading } = useAuth();
  const [show, setShow] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 800); // ✅ 800ms — fast enough to feel snappy
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && minTimePassed) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShow(false);
      }, 500); // Wait for fadeOut animation
      return () => clearTimeout(timer);
    }
  }, [loading, minTimePassed]);

  if (!show) return null;

  return (
    <div className={`splash-overlay ${isFadingOut ? 'splash-fade-out' : ''}`}>
      <div className="splash-content">
        <svg className="splash-logo" width="80" height="80" viewBox="0 0 80 80">
          <polygon 
            points="40,8 72,68 8,68"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeDasharray="300"
            strokeDashoffset="300"
            style={{ animation: 'drawTriangle 1s ease-in-out forwards, pulse 2s ease-in-out 1s infinite' }}
          />
        </svg>
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', justifyContent: 'center' }}>
          <div className="splash-dot" style={{ animationDelay: '0ms' }}></div>
          <div className="splash-dot" style={{ animationDelay: '150ms' }}></div>
          <div className="splash-dot" style={{ animationDelay: '300ms' }}></div>
        </div>
        <div className="splash-text" style={{ animation: 'fadeIn 0.5s ease-in-out forwards', animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
          Saya Industrial
        </div>
      </div>
    </div>
  );
}

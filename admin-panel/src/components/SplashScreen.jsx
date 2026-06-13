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
    }, 2000);
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
        <img
          src="/logo.jpg"
          alt="Logo"
          className="splash-logo"
          style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover', animation: 'pulse 2s ease-in-out infinite' }}
        />
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

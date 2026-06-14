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
    }, 1500); // 1.5s to show off the beautiful heart animation
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
        <svg className="heart" viewBox="0 0 32 32" width="64px" height="64px" role="img" aria-label="Heart beating with red lines running down the outside and veins inside">
          <defs>
            <symbol id="heart-border">
              <path d="M 15.9 7.75 C 15.9 7.75 11.639 2.996 6.785 5.85 C 4.652 7.105 2.992 9.667 3 12.5 C 3.017 18.716 7.878 22.041 9.5 23.547 C 14.398 27.547 16.088 27.5 16 27.5" strokeDasharray="39 39" />
            </symbol>
            <symbol id="heart-vein1">
              <path d="M 11.095 7.744 C 11.095 7.744 9.119 10.295 9.5 12.5 C 9.835 14.441 11.089 14.417 12.929 15.896 C 14.638 17.269 14.431 19.507 14.431 19.507" strokeDasharray="14.1 39" />
            </symbol>
            <symbol id="heart-vein2">
              <path d="M 9.5 12.5 C 9.5 12.5 9.667 13.781 9.209 14.895 C 8.796 15.901 7.872 16.561 7.872 16.561" strokeDasharray="4.6 39" />
            </symbol>
            <symbol id="heart-vein3">
              <path d="M 10.2 14 C 12.133 16.433 12.095 18.427 12 19.4 C 11.829 21.153 10.4 22.2 10.4 22.2" strokeDasharray="9.1 39" />
            </symbol>
            <symbol id="heart-vein4">
              <path d="M 12 19.3 C 12 19.3 12 20.572 12.551 21.726 C 13.012 22.692 13.535 22.974 13.535 22.974" strokeDasharray="4.1 39" />
            </symbol>
          </defs>
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1">
            <g opacity="0.25">
              <g>
                <use className="heart__border heart__border--pulse" href="#heart-border" />
                <g className="heart__vein-group">
                  <use className="heart__vein heart__vein--pulse1" href="#heart-vein1" />
                  <use className="heart__vein heart__vein--pulse2" href="#heart-vein2" />
                  <use className="heart__vein heart__vein--pulse3" href="#heart-vein3" />
                  <use className="heart__vein heart__vein--pulse4" href="#heart-vein4" />
                </g>
              </g>
              <g transform="scale(-1,1)" style={{ transformOrigin: '16px 16px' }}>
                <use className="heart__border heart__border--pulse" href="#heart-border" />
                <g className="heart__vein-group">
                  <use className="heart__vein heart__vein--pulse1" href="#heart-vein1" />
                  <use className="heart__vein heart__vein--pulse2" href="#heart-vein2" />
                  <use className="heart__vein heart__vein--pulse3" href="#heart-vein3" />
                  <use className="heart__vein heart__vein--pulse4" href="#heart-vein4" />
                </g>
              </g>
            </g>
            <g>
              <g className="heart__border heart__border--fade">
                <g>
                  <use className="heart__border heart__border--offset-pulse" href="#heart-border" />
                </g>
                <g transform="scale(-1,1)" style={{ transformOrigin: '16px 16px' }}>
                  <use className="heart__border heart__border--offset-pulse" href="#heart-border" />
                </g>
              </g>
              <g>
                <g className="heart__vein-group">
                  <use className="heart__vein heart__vein--all1" href="#heart-vein1" />
                  <use className="heart__vein heart__vein--all2" href="#heart-vein2" />
                  <use className="heart__vein heart__vein--all3" href="#heart-vein3" />
                  <use className="heart__vein heart__vein--all4" href="#heart-vein4" />
                </g>
              </g>
              <g transform="scale(-1,1)" style={{ transformOrigin: '16px 16px' }}>
                <g className="heart__vein-group">
                  <use className="heart__vein heart__vein--all1" href="#heart-vein1" />
                  <use className="heart__vein heart__vein--all2" href="#heart-vein2" />
                  <use className="heart__vein heart__vein--all3" href="#heart-vein3" />
                  <use className="heart__vein heart__vein--all4" href="#heart-vein4" />
                </g>
              </g>
            </g>
          </g>
        </svg>
        <div className="splash-text">
          Saya Industrial
        </div>
      </div>
    </div>
  );
}

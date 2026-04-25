import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { getAccessiblePages, getFirstAccessiblePath, MEMBER_PAGE_OPTIONS } from '../../lib/accessControl';

const iconByKey = {
  dashboard: 'home',
  tasks: 'tasks',
  enquiry: 'search',
  followups: 'followups',
  payments: 'payments',
  rgp: 'rgp',
  profile: 'profile',
};

function NavIcon({ iconKey, active }) {
  const classes = `h-5 w-5 ${active ? 'stroke-[2.5px]' : ''}`;

  switch (iconKey) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={classes}>
          <path d="M3 10.5 12 3l9 7.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 9.5V20h13V9.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'tasks':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={classes}>
          <path d="M8 6h12" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 12h12" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 18h12" strokeWidth="2" strokeLinecap="round" />
          <path d="m3 6 1.5 1.5L6.5 5.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m3 12 1.5 1.5L6.5 11.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m3 18 1.5 1.5L6.5 17.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={classes}>
          <circle cx="11" cy="11" r="6.5" strokeWidth="2" />
          <path d="m16 16 4 4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'followups':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={classes}>
          <path d="M5 7h14" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 12h10" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 17h8" strokeWidth="2" strokeLinecap="round" />
          <path d="m17 11 2 2 3-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'payments':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={classes}>
          <rect x="3" y="6" width="18" height="12" rx="3" strokeWidth="2" />
          <path d="M3 10h18" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 15h4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'rgp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={classes}>
          <path d="M7 7h11a2 2 0 0 1 2 2v8H7a2 2 0 0 0-2 2V9a2 2 0 0 1 2-2Z" strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 17h13" strokeWidth="2" strokeLinecap="round" />
          <path d="m10 10 2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'profile':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={classes}>
          <circle cx="12" cy="8" r="3.5" strokeWidth="2" />
          <path d="M5 19c1.8-3 4-4.5 7-4.5s5.2 1.5 7 4.5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { unreadCount } = useNotifications(userData?.uid);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const visibleTabs = useMemo(() => {
    const accessiblePages = getAccessiblePages(currentUser, 'member');
    return MEMBER_PAGE_OPTIONS.filter((page) => accessiblePages.some((item) => item.key === page.key));
  }, [currentUser]);

  const fallbackPath = getFirstAccessiblePath(currentUser, 'member') || '/login';
  const profileTab = visibleTabs.find((page) => page.key === 'profile');
  const minSwipeDistance = 80;

  const onTouchStart = (event) => {
    setTouchEnd(null);

    if (event.targetTouches[0].clientX < 30) {
      setTouchStart(event.targetTouches[0].clientX);
      return;
    }

    setTouchStart(null);
  };

  const onTouchMove = (event) => {
    if (!touchStart) {
      return;
    }

    setTouchEnd(event.targetTouches[0].clientX);
  };

  const onTouchEndCallback = () => {
    if (!touchStart || !touchEnd) {
      return;
    }

    if (touchEnd - touchStart > minSwipeDistance) {
      navigate(-1);
    }
  };

  const getInitials = (name) => {
    if (!name) {
      return 'TM';
    }

    const parts = name.split(' ');

    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="flex h-full flex-col bg-white"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndCallback}
    >
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-[var(--bg-card)] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-base font-semibold text-[var(--text-primary)]">Saya Industrial</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 active:bg-gray-200"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate(profileTab?.path || fallbackPath, { replace: true })}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0D9488] bg-[#0D9488] ring-2 ring-teal-100 transition-opacity hover:opacity-90"
          >
            <span className="text-xs font-bold text-white">{getInitials(userData?.name)}</span>
          </button>
        </div>
      </header>

      <main className="scroll-area flex-1 overflow-y-auto">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      <nav
        className="flex-shrink-0 border-t border-gray-100 bg-[var(--bg-card)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
      >
        <div className="no-scrollbar flex h-16 items-center gap-1 overflow-x-auto px-2">
          {visibleTabs.map((item) => {
            const isActive = item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.key}
                to={item.path}
                replace
                className={`flex h-full min-w-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors ${
                  isActive ? 'bg-teal-50 text-teal-600' : 'text-gray-400'
                }`}
              >
                <NavIcon iconKey={iconByKey[item.key]} active={isActive} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                  {item.navLabel || item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

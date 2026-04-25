import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Bell, CheckSquare, Home, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { getAccessiblePages } from '../../lib/accessControl';
import UserAvatar from '../UserAvatar';

const bottomNavItems = [
  {
    key: 'dashboard',
    label: 'Home',
    path: '/dashboard',
    icon: Home,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    icon: CheckSquare,
  },
  {
    key: 'enquiry',
    label: 'Enquiries',
    path: '/enquiries',
    icon: Search,
  },
  {
    key: 'rgp',
    label: 'RGP',
    path: '/rgp',
    icon: ArrowLeftRight,
  },
];

export default function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { unreadCount } = useNotifications(userData?.uid);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const accessiblePageKeys = useMemo(() => {
    if (!currentUser) {
      return new Set();
    }

    return new Set(getAccessiblePages(currentUser, 'member').map((page) => page.key));
  }, [currentUser]);
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
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <UserAvatar
            user={currentUser || userData}
            size={36}
            onClick={() => navigate('/profile')}
          />
        </div>
      </header>

      <main className="scroll-area flex-1 overflow-y-auto">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      <nav
        className="flex-shrink-0 border-t border-gray-100 bg-[var(--bg-card)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}
      >
        <div className="grid h-16 grid-cols-4 items-center px-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const hasAccess = accessiblePageKeys.has(item.key);
            const isActive = item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path);

            return (
              <button
                key={item.key}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={`flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors ${
                  isActive ? 'text-teal-600' : hasAccess ? 'text-gray-400' : 'text-gray-300'
                }`}
                disabled={!hasAccess}
                onClick={() => navigate(item.path, { replace: true })}
                type="button"
              >
                <Icon className={`h-[22px] w-[22px] ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-teal-600' : hasAccess ? 'text-gray-400' : 'text-gray-300'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

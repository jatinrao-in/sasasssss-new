import React, { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Bell, CheckSquare, Home, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { getAccessiblePages } from '../../lib/accessControl';
import UserAvatar from '../UserAvatar';
import logoImg from '../../assets/logo.jpg';

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate('/pwa/notifications')}
      style={{ position: 'relative', cursor: 'pointer', padding: '8px' }}
    >
      <Bell size={22} color="var(--text-secondary)" />
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute', top: '2px', right: '2px', background: '#DC2626', color: 'white', borderRadius: '50%',
          minWidth: '18px', height: '18px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '0 3px'
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
};

const bottomNavItems = [
  {
    key: 'dashboard',
    label: 'Home',
    path: '/pwa/dashboard',
    icon: Home,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    path: '/pwa/tasks',
    icon: CheckSquare,
  },
  {
    key: 'enquiry',
    label: 'Enquiries',
    path: '/pwa/enquiries',
    icon: Search,
  },
  {
    key: 'rgp',
    label: 'RGP',
    path: '/pwa/rgp',
    icon: ArrowLeftRight,
  },
];

export default function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();


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
      <header className="flex h-14 flex-shrink-0 items-center justify-between px-4 glass-header sticky top-0 z-[50]">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-base font-semibold text-[var(--text-primary)]">Saya Industrial</span>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />

          <UserAvatar
            user={currentUser || userData}
            size={36}
            onClick={() => navigate('/pwa/profile')}
          />
        </div>
      </header>

      <main className="scroll-area flex-1 overflow-y-auto">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      <nav
        className="flex-shrink-0 glass-nav sticky bottom-0 z-[50]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}
      >
        <div className="grid h-16 grid-cols-4 items-center px-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const hasAccess = accessiblePageKeys.has(item.key);
            const isActive = item.path === '/pwa/dashboard'
              ? location.pathname === '/pwa/dashboard'
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

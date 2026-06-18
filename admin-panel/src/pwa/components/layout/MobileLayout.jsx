import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Bell, CheckSquare, Home, Search, Plus, CalendarClock, CreditCard, User, Menu, HelpCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { getAccessiblePages } from '../../lib/accessControl';
import UserAvatar from '../UserAvatar';
import logoImg from '../../assets/logo.jpg';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';

const NotificationBell = () => {
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate('/pwa/notifications')}
      style={{ position: 'relative', cursor: 'pointer', padding: '8px' }}
    >
      <Bell size={22} color="var(--text-secondary)" className="notif-bell-shake" />
      {unreadCount > 0 && (
        <span className="notif-badge-pulse" style={{
          position: 'absolute', top: '2px', right: '2px', background: '#DC2626', color: 'white', borderRadius: '50%',
          minWidth: '18px', height: '18px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '0 3px', zIndex: 10
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
];

const menuItems = [
  {
    key: 'followups',
    label: 'Follow-Ups',
    path: '/pwa/follow-ups',
    icon: CalendarClock,
    colorClass: 'bg-orange-50 text-orange-600',
  },
  {
    key: 'payments',
    label: 'Payments',
    path: '/pwa/payments',
    icon: CreditCard,
    colorClass: 'bg-green-50 text-green-600',
  },
  {
    key: 'rgp',
    label: 'RGP Challans',
    path: '/pwa/rgp',
    icon: ArrowLeftRight,
    colorClass: 'bg-[#F0EAF5] text-[#8B6FB3]',
  },
  {
    key: 'profile',
    label: 'My Profile',
    path: '/pwa/profile',
    icon: User,
    colorClass: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  },
  {
    key: 'support',
    label: 'Support & Help',
    path: '/pwa/support',
    icon: HelpCircle,
    colorClass: 'bg-purple-50 text-purple-600',
  },
];

export default function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const accessiblePageKeys = useMemo(() => {
    if (!currentUser) {
      return new Set();
    }

    return new Set(getAccessiblePages(currentUser, 'member').map((page) => page.key));
  }, [currentUser]);

  const visibleNavItems = useMemo(() => {
    return bottomNavItems.filter((item) => accessiblePageKeys.has(item.key));
  }, [accessiblePageKeys]);

  const visibleMenuItems = useMemo(() => {
    return menuItems.filter((item) => item.key === 'support' || accessiblePageKeys.has(item.key));
  }, [accessiblePageKeys]);
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

  const renderNavItem = (item) => {
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
        className="flex h-full flex-1 flex-col items-center justify-center relative active:scale-95 transition-transform duration-100 cursor-pointer px-0.5"
        disabled={!hasAccess}
        onClick={() => navigate(item.path, { replace: true })}
        type="button"
      >
        <div className="flex flex-col items-center justify-center transition-all duration-300">
          <Icon className={`h-[18px] w-[18px] mb-0.5 transition-all duration-300 ${
            isActive 
              ? 'text-[var(--color-primary)] stroke-[2.5px]' 
              : hasAccess 
                ? 'text-[var(--color-text-secondary)] stroke-[2px]' 
                : 'text-slate-300'
          }`} />
          <span className={`text-[8.5px] font-semibold tracking-wide transition-colors duration-300 ${
            isActive 
              ? 'text-[var(--color-primary)] font-bold' 
              : hasAccess 
                ? 'text-[var(--color-text-secondary)]' 
                : 'text-slate-300'
          }`}>
            {item.label}
          </span>
        </div>
      </button>
    );
  };

  // Hide header + bottom nav on task detail pages
  const isTaskDetail = /^\/pwa\/tasks\/.+/.test(location.pathname);

  return (
    <div
      className="fixed inset-0 md:left-1/2 md:-translate-x-1/2 md:max-w-[430px] md:shadow-[0_8px_40px_rgba(0,0,0,0.12)] md:border-x md:border-[var(--color-border)] flex flex-col bg-[var(--color-bg)] overflow-hidden pwa-theme"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEndCallback}
    >
      {!isTaskDetail && (
        <header className="flex h-14 flex-shrink-0 items-center justify-between px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-[50]">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-base text-[var(--color-text-primary)] tracking-tight pwa-headline font-semibold">Saya Industrial</span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <UserAvatar
              user={currentUser || userData}
              size={36}
              onClick={accessiblePageKeys.has('profile') ? () => navigate('/pwa/profile') : undefined}
            />
          </div>
        </header>
      )}

      <main ref={mainRef} className="scroll-area flex-1 overflow-y-auto">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Edge-to-Edge Bottom Nav with 3 main items and Menu button */}
      {!isTaskDetail && (
        <nav
          className="flex-shrink-0 z-[50] bg-[var(--color-surface)] border-t border-[var(--color-border)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex h-14 items-center justify-around px-1 relative bg-[var(--color-surface)]">
            {/* Main 3 items */}
            {visibleNavItems.map(renderNavItem)}

            {/* 4th Menu Item */}
            <button
              aria-label="Menu"
              className={`flex h-full flex-1 flex-col items-center justify-center relative active:scale-95 transition-transform duration-100 cursor-pointer px-0.5`}
              onClick={() => setShowMenu(true)}
              type="button"
            >
              <div className="flex flex-col items-center justify-center transition-all duration-300">
                <Menu className={`h-[18px] w-[18px] mb-0.5 transition-all duration-300 ${
                  showMenu 
                    ? 'text-[var(--color-primary)] stroke-[2.5px]' 
                    : 'text-[var(--color-text-secondary)] stroke-[2px]'
                }`} />
                <span className={`text-[8.5px] font-semibold tracking-wide transition-colors duration-300 ${
                  showMenu 
                    ? 'text-[var(--color-primary)] font-bold' 
                    : 'text-[var(--color-text-secondary)]'
                }`}>
                  Menu
                </span>
              </div>
            </button>
          </div>
        </nav>
      )}

      {/* Menu Drawer Sheet */}
      <Sheet open={showMenu} onOpenChange={setShowMenu}>
        <SheetContent className="bg-[var(--color-bg)] border-t border-[var(--color-border)] rounded-t-[28px]">
          <SheetHeader className="text-center pb-2">
            <SheetTitle className="text-base font-bold text-[var(--color-text-primary)]">Application Menu</SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            {visibleMenuItems.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => { setShowMenu(false); navigate(action.path); }}
                  className="flex flex-col items-center justify-center bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] active:scale-95 transition-all text-[var(--color-text-primary)] shadow-sm cursor-pointer"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2.5 ${action.colorClass}`}>
                    {action.key === 'profile' ? (
                      <UserAvatar size={24} user={currentUser || userData} />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  <span className="text-xs font-bold">{action.label}</span>
                </button>
              );
            })}
          </div>
          

        </SheetContent>
      </Sheet>
    </div>
  );
}

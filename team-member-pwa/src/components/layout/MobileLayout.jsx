import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Home, ClipboardList, Search, RefreshCw, User, Bell, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

const allNavItems = [
 { path: '/dashboard', label: 'Home', icon: Home, permKey: 'dashboard' },
 { path: '/tasks', label: 'My Tasks', icon: ClipboardList, permKey: 'projects' },
 { path: '/enquiries', label: 'Enquiries', icon: Search, permKey: 'enquiry' },
 { path: '/rgp', label: 'RGP', icon: ArrowLeftRight, permKey: 'rgp' },
];

// Profile always shown separately
const profileNavItem = { path: '/profile', label: 'Profile', icon: User, permKey: null };

export default function MobileLayout() {
 const location = useLocation();
 const navigate = useNavigate();
 const { userData } = useAuth();
 const { unreadCount } = useNotifications(userData?.uid);

 const [touchStart, setTouchStart] = useState(null);
 const [touchEnd, setTouchEnd] = useState(null);

 // Minimum swipe distance
 const minSwipeDistance = 80;

 const onTouchStart = (e) => {
   setTouchEnd(null);
   // Only capture swipe if started from the left edge (within 30px)
   if (e.targetTouches[0].clientX < 30) {
     setTouchStart(e.targetTouches[0].clientX);
   } else {
     setTouchStart(null);
   }
 };

 const onTouchMove = (e) => {
   if (!touchStart) return;
   setTouchEnd(e.targetTouches[0].clientX);
 };

 const onTouchEndCallback = () => {
   if (!touchStart || !touchEnd) return;
   const distance = touchEnd - touchStart;
   if (distance > minSwipeDistance) {
     navigate(-1);
   }
 };

 const getInitials = (name) => {
   if (!name) return 'TM';
   const parts = name.split(' ');
   if (parts.length > 1) {
     return (parts[0][0] + parts[1][0]).toUpperCase();
   }
   return name.substring(0, 2).toUpperCase();
 };

 // Filter nav items based on permissions
 const permissions = userData?.permissions || [];

 // ✅ Fix P5: Profile is always included — filter permission-based items first,
 // then slice to 4, then add Profile so it's NEVER cut off
 const permissionItems = allNavItems.filter(item => {
 if (!permissions.length) return true; // show all if no permissions set
 return permissions.includes(item.permKey);
 });

 // Limit to max 4 permission-based items + always include Profile = max 5 total
 const displayItems = [...permissionItems.slice(0, 4), profileNavItem];

 return (
 <div 
   className="flex flex-col h-full bg-white"
   onTouchStart={onTouchStart}
   onTouchMove={onTouchMove}
   onTouchEnd={onTouchEndCallback}
 >
 {/* Fixed Top Header */}
 <header className="flex-shrink-0 flex items-center justify-between px-4 h-14 bg-[var(--bg-card)] border-b border-gray-100 z-20">
 <div className="flex items-center gap-2">
 <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center">
 <span className="text-white font-bold text-sm">S</span>
 </div>
 {/* ✅ Fix P18: Changed "Enterprise" to actual company name "Saya Industrial" */}
 <span className="font-semibold text-[var(--text-primary)] text-base">Saya Industrial</span>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => navigate('/notifications')}
 className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
 >
 <Bell className="h-5 w-5 text-gray-600" />
 {unreadCount > 0 && (
 <span className="absolute top-1 right-1 h-4.5 min-w-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
 {unreadCount}
 </span>
 )}
 </button>
 <button
 onClick={() => navigate('/profile', { replace: true })}
 className="h-8 w-8 rounded-full bg-[#0D9488] flex items-center justify-center border border-[#0D9488] ring-2 ring-teal-100 hover:opacity-90 transition-opacity"
 >
 <span className="text-white font-bold text-xs">
 {getInitials(userData?.name)}
 </span>
 </button>
 </div>
 </header>

 {/* Scrollable Content */}
 <main className="flex-1 overflow-y-auto scroll-area">
 <div className="page-enter">
 <Outlet />
 </div>
 </main>

 {/* Fixed Bottom Navigation */}
 <nav
 className="flex-shrink-0 bg-[var(--bg-card)] border-t border-gray-100 z-20"
 style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
 >
 <div className="flex items-center justify-around h-16">
 {displayItems.map((item) => {
 const isActive =
 item.path === '/dashboard'
 ? location.pathname === '/dashboard'
 : location.pathname.startsWith(item.path);
 const Icon = item.icon;

 return (
 <Link
 key={item.path}
 to={item.path}
 replace={true}
 className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
 isActive ? 'text-teal-600' : 'text-gray-400'
 }`}
 >
 <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
 <span className={`text-[10px] font-medium ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
 {item.label}
 </span>
 </Link>
 );
 })}
 </div>
 </nav>
 </div>
 );
}

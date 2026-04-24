import { useState } from 'react';
import { Bell, Search, ChevronDown, X, CheckCheck, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useDarkMode } from '../../hooks/useDarkMode';
import { getInitials } from '../../lib/formatters';

const notificationBadges = {
 task: 'Task',
 payment: 'Pay',
 followup: 'FU',
 enquiry: 'Enq',
 rgp: 'RGP',
};

export default function Header({ collapsed }) {
 const { userData, logout } = useAuth();
 const { notifications, markAsRead, markAllRead, unreadCount } = useNotifications(userData?.uid);
 const { dark, toggle } = useDarkMode();
 const [showNotifications, setShowNotifications] = useState(false);
 const [showProfile, setShowProfile] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

 const formatTime = (timestamp) => {
 if (!timestamp) return 'Just now';
 const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
 const diff = Date.now() - date.getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 60) return `${mins}m ago`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `${hours}h ago`;
 return `${Math.floor(hours / 24)}d ago`;
 };

 const handleLogout = async () => {
 try { await logout(); } catch (error) { console.error(error); }
 };

 return (
 <>
 <header
 className={`fixed top-0 right-0 h-16 bg-[var(--bg-card)] border-b border-gray-100 z-30 flex items-center px-6 gap-4 transition-all duration-300 ${
 collapsed ? 'left-16' : 'left-60'
 }`}
 >
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input
 type="text"
 placeholder="Search projects, tasks, members..."
 value={searchQuery}
 onChange={(event) => setSearchQuery(event.target.value)}
 data-search-input
 className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-[var(--bg-card)] transition-all"
 />
 </div>

 <div className="flex items-center gap-3 ml-auto">
 {/* Dark mode toggle */}
 <button
 onClick={toggle}
 className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
 title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
 >
 {dark ? (
 <Sun className="w-5 h-5 text-amber-400" />
 ) : (
 <Moon className="w-5 h-5 text-gray-500" />
 )}
 </button>

 {/* Notification bell */}
 <button
 id="notification-bell"
 onClick={() => setShowNotifications(!showNotifications)}
 className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
 >
 <Bell className="w-5 h-5 text-gray-600" />
 {unreadCount > 0 && (
 <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold leading-none notification-pulse">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 </button>

 <div className="w-px h-6 bg-gray-200" />

 {/* Profile */}
 <div className="relative">
 <div
 onClick={() => setShowProfile(!showProfile)}
 className="flex items-center gap-2.5 cursor-pointer group"
 >
 <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
 <span className="text-white text-xs font-semibold">{getInitials(userData?.name || 'AD')}</span>
 </div>
 <div className="hidden sm:block">
 <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{userData?.name || 'Admin'}</p>
 <p className="text-xs text-gray-400">{userData?.role === 'admin' ? 'Super Admin' : 'Member'}</p>
 </div>
 <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
 </div>
 {showProfile && (
 <div className="absolute right-0 top-12 w-48 bg-[var(--bg-card)] rounded-xl shadow-lg border border-[var(--border-primary)] py-2 z-50">
 <div className="px-4 py-2 border-b border-gray-50">
 <p className="text-sm font-medium text-[var(--text-primary)]">{userData?.name}</p>
 <p className="text-xs text-gray-400">{userData?.email}</p>
 </div>
 <button
 onClick={handleLogout}
 className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-danger)] hover:bg-[var(--bg-hover)] transition-colors"
 >
 <LogOut className="w-4 h-4" /> Sign Out
 </button>
 </div>
 )}
 </div>
 </div>
 </header>

 {showProfile && <div className="fixed inset-0 z-20" onClick={() => setShowProfile(false)} />}

 {showNotifications && (
 <>
 <div className="fixed inset-0 z-40 modal-overlay" onClick={() => setShowNotifications(false)} />
 <div className="fixed top-0 right-0 h-screen w-96 bg-[var(--bg-card)] shadow-2xl z-50 flex flex-col notification-drawer">
 <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
 <div>
 <h3 className="font-semibold text-[var(--text-primary)]">Notifications</h3>
 <p className="text-xs text-gray-400 mt-0.5">{unreadCount} unread</p>
 </div>
 <div className="flex items-center gap-2">
 {unreadCount > 0 && (
 <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
 <CheckCheck className="w-3.5 h-3.5" /> Mark all read
 </button>
 )}
 <button onClick={() => setShowNotifications(false)} className="p-1 rounded hover:bg-[var(--bg-hover)]">
 <X className="w-4 h-4 text-gray-500" />
 </button>
 </div>
 </div>
 <div className="flex-1 overflow-y-auto">
 {notifications.length === 0 ? (
 <div className="py-16 text-center text-gray-400 text-sm">No notifications yet.</div>
 ) : (
 notifications.map((notification) => (
 <div
 key={notification.id}
 onClick={() => markAsRead(notification.id)}
 className={`px-5 py-4 border-b border-[var(--border-primary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${!notification.read ? 'bg-[var(--accent-light)]' : ''}`}
 >
 <div className="flex items-start gap-3">
 <span className="text-[11px] font-semibold leading-none mt-0.5 text-[var(--accent-primary)]">
 {notificationBadges[notification.type] || 'Info'}
 </span>
 <div className="flex-1 min-w-0">
 <p className={`text-sm ${!notification.read ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
 {notification.message}
 </p>
 <p className="text-xs text-gray-400 mt-1">{formatTime(notification.createdAt)}</p>
 </div>
 {!notification.read && <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1.5" />}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </>
 )}
 </>
 );
}

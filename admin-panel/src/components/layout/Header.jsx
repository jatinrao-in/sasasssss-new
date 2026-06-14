import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Search, ChevronDown, X, CheckCheck, LogOut,
  Menu, Home, BellRing, Trash2, CheckCircle2,
  CreditCard, MessageSquare, Wrench, FileText, Users, AlertCircle,
  Volume2, VolumeX,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useToast } from '../../hooks/useToast';
import useDelete from '../../hooks/useDelete';
import { getInitials } from '../../lib/formatters';
import DeleteConfirmDialog from '../DeleteConfirmDialog';
import UserAvatar from '../UserAvatar';

// ── Notification type config ──────────────────────────────────
const NOTIF_CONFIG = {
  task:     { label: 'Task',    icon: CheckCircle2, bg: 'bg-blue-100',   text: 'text-blue-600',   ring: 'ring-blue-200'   },
  payment:  { label: 'Payment', icon: CreditCard,   bg: 'bg-green-100',  text: 'text-green-600',  ring: 'ring-green-200'  },
  followup: { label: 'Follow-Up', icon: MessageSquare, bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200' },
  enquiry:  { label: 'Enquiry', icon: FileText,     bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-200' },
  rgp:      { label: 'RGP',     icon: Wrench,       bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-200' },
  salary:   { label: 'Salary',  icon: CreditCard,   bg: 'bg-teal-100',   text: 'text-teal-600',   ring: 'ring-teal-200'   },
  team:     { label: 'Team',    icon: Users,        bg: 'bg-indigo-100', text: 'text-indigo-600', ring: 'ring-indigo-200' },
  default:  { label: 'Info',    icon: AlertCircle,  bg: 'bg-gray-100',   text: 'text-gray-600',   ring: 'ring-gray-200'   },
};

function getConfig(type) {
  return NOTIF_CONFIG[type] || NOTIF_CONFIG.default;
}

// ── Relative time formatter ───────────────────────────────────
function formatTime(timestamp) {
  if (!timestamp) return 'Just now';
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ── Sound player ─────────────────────────────────────────────
function playNotificationSound() {
  const soundEnabled = localStorage.getItem('notification_sound_enabled') !== 'false';
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* browser may block AudioContext */ }
}

// ── Single notification item ──────────────────────────────────
function NotifItem({ notif, onRead, onDelete }) {
  const cfg = getConfig(notif.type);
  const Icon = cfg.icon;
  const isUnread = !notif.read;

  return (
    <div
      onClick={() => onRead(notif.id)}
      className={`group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-gray-50 last:border-0 ${
        isUnread
          ? 'bg-gradient-to-r from-teal-50/60 to-transparent hover:from-teal-50'
          : 'hover:bg-gray-50/60'
      }`}
    >
      {/* Unread bar */}
      {isUnread && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-teal-500 rounded-r" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center ring-1 ${cfg.ring} mt-0.5`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
            {cfg.label}
          </span>
          {isUnread && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
          )}
        </div>
        <p className={`text-sm leading-snug ${isUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
          {notif.message}
        </p>
        <p className="text-[11px] text-gray-400 mt-1">{formatTime(notif.createdAt)}</p>
      </div>

      {/* Delete button — shows on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notif); }}
        className="absolute right-3 top-3.5 p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Notification Drawer ───────────────────────────────────────
function NotificationDrawer({ notifications, unreadCount, onClose, onRead, onDelete, onMarkAllRead, onClearAll }) {
  const navigate = useNavigate();
  const tabs = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
  ];
  const [activeTab, setActiveTab] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('notification_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('notification_sound_enabled', String(newVal));
  };

  const visible = activeTab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-screen w-full max-w-[380px] flex flex-col bg-white shadow-2xl notif-drawer">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <BellRing className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Notifications</h3>
                <p className="text-teal-100 text-xs">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 p-1 bg-white/10 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-teal-100 hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-white/20 text-white'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions bar */}
        {notifications.length > 0 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/80">
            <button
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-teal-300" />
              </div>
              <p className="font-semibold text-gray-500 text-sm">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab === 'unread'
                  ? 'You are all caught up!'
                  : 'New alerts will appear here'}
              </p>
            </div>
          ) : (
            visible.map((notif) => (
              <NotifItem
                key={notif.id}
                notif={notif}
                onRead={onRead}
                onDelete={onDelete}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex flex-col gap-1.5">
          <button
            onClick={() => {
              onClose();
              navigate('/admin/notifications');
            }}
            className="w-full text-center text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline py-0.5 transition-all"
          >
            Open Notification Center
          </button>
          <p className="text-[10px] text-center text-gray-400">
            Notifications are real-time
          </p>
        </div>
      </div>
    </>
  );
}

// ── Main Header ───────────────────────────────────────────────
export default function Header({ collapsed, onMenuToggle }) {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();
  const {
    notifications,
    markAsRead,
    markAllRead,
    unreadCount,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications(userData?.uid);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const prevUnreadCount = useRef(unreadCount);
  const hasMounted = useRef(false);

  // Play sound when new notification arrives
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      prevUnreadCount.current = unreadCount;
      return;
    }
    if (unreadCount > prevUnreadCount.current) {
      playNotificationSound();
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  const handleLogout = async () => {
    try { await logout(); } catch (error) { console.error(error); }
  };

  const handleDeleteNotification = useCallback((notif) => {
    confirmDelete({
      title: 'Delete Notification',
      description: `Remove "${notif.message?.substring(0, 60)}…"?`,
      onConfirm: async () => {
        await deleteNotification(notif.id);
        toast.success('Notification deleted');
      },
    });
  }, [confirmDelete, deleteNotification, toast]);

  const handleClearAll = useCallback(() => {
    confirmDelete({
      title: 'Clear All Notifications',
      description: `Remove all ${notifications.length} notifications? This cannot be undone.`,
      onConfirm: async () => {
        await clearAllNotifications();
        toast.success('All notifications cleared');
      },
    });
  }, [confirmDelete, clearAllNotifications, notifications.length, toast]);

  return (
    <>
      <header
        className={`fixed top-0 right-0 left-0 z-30 flex h-16 items-center gap-3 border-b border-gray-100 bg-white/95 backdrop-blur-sm px-3 transition-all duration-300 sm:px-4 lg:gap-4 lg:px-6 ${
          collapsed ? 'lg:left-16' : 'lg:left-60'
        }`}
      >
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="relative min-w-0 flex-1 max-w-none sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects, tasks, members…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-search-input
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Website button */}
          <button
            onClick={() => { window.location.href = '/?from=panel'; }}
            title="Go to Landing Page"
            className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-2 text-gray-600 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-transparent hover:border-teal-100"
          >
            <Home className="w-4 h-4" />
            <span className="text-xs font-semibold">Website</span>
          </button>

          {/* ── Notification Bell ── */}
          <button
            id="notification-bell"
            onClick={() => setShowNotifications((v) => !v)}
            className={`relative rounded-xl p-2.5 transition-all ${
              showNotifications
                ? 'bg-teal-50 text-teal-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            {/* Bell icon with shake when unread */}
            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'notif-bell-shake' : ''}`} />

            {/* Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none notif-badge-pulse">
                {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="hidden h-6 w-px bg-gray-200 sm:block" />

          {/* Profile */}
          <div className="relative">
            <div
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2.5 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <UserAvatar user={userData || currentUser} size={32} />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {userData?.name || 'Admin'}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight">
                  {currentUser?.isMainAdmin ? 'Main Admin' : currentUser?.role === 'admin' ? 'Admin' : 'Team Member'}
                </p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </div>

            {showProfile && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar user={userData || currentUser} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{userData?.name || 'Admin'}</p>
                      <p className="text-[11px] text-gray-400 truncate">{userData?.email}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Click-away for profile dropdown */}
      {showProfile && (
        <div className="fixed inset-0 z-20" onClick={() => setShowProfile(false)} />
      )}

      {/* Notification Drawer */}
      {showNotifications && (
        <NotificationDrawer
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setShowNotifications(false)}
          onRead={(id) => markAsRead(id)}
          onDelete={handleDeleteNotification}
          onMarkAllRead={markAllRead}
          onClearAll={handleClearAll}
        />
      )}

      <DeleteConfirmDialog
        isOpen={deleteState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={deleteState.title}
        description={deleteState.description}
        isDeleting={deleteState.isDeleting}
      />
    </>
  );
}

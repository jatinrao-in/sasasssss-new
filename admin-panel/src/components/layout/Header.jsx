import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Search, ChevronDown, X, CheckCheck, LogOut,
  Menu, Home, BellRing, Trash2, CheckCircle2,
  CreditCard, MessageSquare, Wrench, FileText, Users, AlertCircle,
  Volume2, VolumeX, CalendarDays, Plus, Phone, Calendar, DollarSign,
  Briefcase, Shield, ShieldCheck, Eye, EyeOff, RefreshCw, Info, Wallet
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useToast } from '../../hooks/useToast';
import useDelete from '../../hooks/useDelete';
import { useProjects } from '../../hooks/useProjects';
import { useEnquiries } from '../../hooks/useEnquiries';
import { useFollowups } from '../../hooks/useFollowUps';
import { useTeam } from '../../hooks/useTeam';
import { useSalaryActions } from '../../hooks/useSalary';
import { usePayments } from '../../hooks/usePayments';
import { createTeamMember } from '../../lib/backendApi';
import { Timestamp } from 'firebase/firestore';
import { getInitials } from '../../lib/formatters';
import DeleteConfirmDialog from '../DeleteConfirmDialog';
import UserAvatar from '../UserAvatar';
import ProjectsPopup from '../popups/ProjectsPopup';
import PaymentsPopup from '../popups/PaymentsPopup';
import TeamPopup from '../popups/TeamPopup';
import {
  notifyWelcome,
  notifyEnquiryAssigned,
  notifyFollowupAssigned,
  notifyPaymentAssigned,
  notifySalaryPaid
} from '../../lib/notify';

// ── Notification type config ──────────────────────────────────
const NOTIF_CONFIG = {
  task:     { label: 'Task Assigned',      icon: CheckCircle2 },
  payment:  { label: 'Payment Overdue',    icon: CreditCard },
  followup: { label: 'Follow-Up Assigned', icon: MessageSquare },
  enquiry:  { label: 'Lead Assigned',      icon: FileText },
  rgp:      { label: 'RGP Challan',        icon: Wrench },
  salary:   { label: 'Salary Paid',        icon: CreditCard },
  team:     { label: 'Team Update',        icon: Users },
  default:  { label: 'Notification',       icon: AlertCircle },
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

// ── Priority helper ──────────────────────────────────────────
function getNotificationPriority(notif) {
  if (notif.read) return 'read';
  if (notif.priority) return notif.priority.toLowerCase();
  
  const title = (notif.title || '').toLowerCase();
  const msg = (notif.message || notif.body || '').toLowerCase();
  const combined = `${title} ${msg}`;
  
  if (
    combined.includes('critical') || 
    combined.includes('overdue') || 
    combined.includes('urgent') || 
    combined.includes('invoice #')
  ) {
    return 'critical';
  }
  
  if (
    combined.includes('high') || 
    combined.includes('warning') || 
    combined.includes('reschedule') ||
    combined.includes('delayed')
  ) {
    return 'high';
  }
  
  return 'normal';
}

// ── Chronological Grouping helper ──────────────────────────────
function groupNotifications(list) {
  const today = [];
  const yesterday = [];
  const earlier = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  list.forEach((notif) => {
    const date = notif.createdAt?.toDate?.()
      ? notif.createdAt.toDate()
      : notif.createdAt
        ? new Date(notif.createdAt)
        : new Date();

    if (date >= startOfToday) {
      today.push(notif);
    } else if (date >= startOfYesterday) {
      yesterday.push(notif);
    } else {
      earlier.push(notif);
    }
  });

  return { today, yesterday, earlier };
}

// ── Single notification item ──────────────────────────────────
function NotifItem({ notif, onRead, onDelete }) {
  const cfg = getConfig(notif.type);
  const Icon = cfg.icon;
  const isUnread = !notif.read;
  const priority = getNotificationPriority(notif);

  const dotColorClass = 
    priority === 'critical' ? 'bg-red-500 animate-pulse' :
    priority === 'high' ? 'bg-orange-500' :
    priority === 'normal' ? 'bg-blue-600' :
    'bg-slate-300';

  // Support both title/body (PWA format) and message (Admin-panel format)
  const displayTitle = notif.title || cfg.label;
  const displayDescription = notif.message || notif.body || 'No description';

  return (
    <div
      onClick={() => onRead(notif.id)}
      className="group relative flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-all border-b border-slate-100/60 last:border-0 hover:bg-[#F8FAFC]"
      style={{ minHeight: '56px', maxHeight: '72px' }}
    >
      {/* Priority Dot Column */}
      <div className="flex-shrink-0 flex items-center h-5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
      </div>

      {/* Icon Column */}
      <div className="flex-shrink-0 flex items-center h-5 text-slate-400">
        <Icon className="w-[18px] h-[18px]" />
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900 truncate">
            {displayTitle}
          </span>
          <span className="text-xs text-slate-400 font-medium flex-shrink-0">
            {formatTime(notif.createdAt)}
          </span>
        </div>
        <p className="text-[13px] text-slate-500 font-normal leading-tight truncate mt-0.5" title={displayDescription}>
          {displayDescription}
        </p>
      </div>

      {/* Delete button — shows on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(notif); }}
        className="absolute right-2 top-2 p-1 rounded hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
        title="Delete notification"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Notification Drawer ───────────────────────────────────────
function NotificationDrawer({ notifications, unreadCount, onClose, onRead, onDelete, onMarkAllRead, onClearAll }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('notification_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('notification_sound_enabled', String(newVal));
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'unread') return notifications.filter((n) => !n.read);
    if (activeTab === 'enquiry') return notifications.filter((n) => n.type === 'enquiry');
    if (activeTab === 'task') return notifications.filter((n) => n.type === 'task');
    if (activeTab === 'payment') return notifications.filter((n) => n.type === 'payment' || n.type === 'salary');
    if (activeTab === 'followup') return notifications.filter((n) => n.type === 'followup');
    return notifications;
  };

  const getTabCount = (tabKey) => {
    if (tabKey === 'all') return notifications.length;
    if (tabKey === 'unread') return unreadCount;
    if (tabKey === 'enquiry') return notifications.filter((n) => n.type === 'enquiry').length;
    if (tabKey === 'task') return notifications.filter((n) => n.type === 'task').length;
    if (tabKey === 'payment') return notifications.filter((n) => n.type === 'payment' || n.type === 'salary').length;
    if (tabKey === 'followup') return notifications.filter((n) => n.type === 'followup').length;
    return 0;
  };

  const visible = getFilteredNotifications();

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'enquiry', label: 'Enquiries' },
    { key: 'task', label: 'Tasks' },
    { key: 'payment', label: 'Payments' },
    { key: 'followup', label: 'Followups' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[0.5px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-screen w-full max-w-[420px] flex flex-col bg-white border-l border-[#E2E8F0] shadow-2xl notif-drawer">
        {/* Header */}
        <div className="flex-shrink-0 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
          <div>
            <h3 className="text-sm font-bold text-slate-950">Notifications</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {unreadCount > 0 ? `${unreadCount} Unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Mark All Read
              </button>
            )}
            <button
              onClick={toggleSound}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              title={soundEnabled ? 'Mute Sound (Notification Settings)' : 'Unmute Sound (Notification Settings)'}
            >
              {soundEnabled ? <Volume2 className="w-[18px] h-[18px]" /> : <VolumeX className="w-[18px] h-[18px]" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              title="Close"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-white">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {tabs.map((tab) => {
              const count = getTabCount(tab.key);
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 h-8 flex items-center justify-center gap-1.5 px-3 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions bar */}
        {notifications.length > 0 && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-1.5 border-b border-slate-100 bg-slate-50/50">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Actions</span>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto bg-white">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-8">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 text-slate-400 border border-slate-100">
                <Bell className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-800 text-sm">
                No Notifications
              </p>
              <p className="text-xs text-slate-500 mt-1">
                You're all caught up.
              </p>
            </div>
          ) : (
            (() => {
              const grouped = groupNotifications(visible);
              return (
                <>
                  {grouped.today.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm px-4 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/80">
                        Today
                      </div>
                      {grouped.today.map((notif) => (
                        <NotifItem
                          key={notif.id}
                          notif={notif}
                          onRead={onRead}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  )}

                  {grouped.yesterday.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm px-4 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/80">
                        Yesterday
                      </div>
                      {grouped.yesterday.map((notif) => (
                        <NotifItem
                          key={notif.id}
                          notif={notif}
                          onRead={onRead}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  )}

                  {grouped.earlier.length > 0 && (
                    <div>
                      <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm px-4 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100/80">
                        Earlier
                      </div>
                      {grouped.earlier.map((notif) => (
                        <NotifItem
                          key={notif.id}
                          notif={notif}
                          onRead={onRead}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Header ───────────────────────────────────────────────
export default function Header({ collapsed, onMenuToggle, dateRange = '30', setDateRange = () => {} }) {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Initialize hooks for all entities
  const { addProject } = useProjects();
  const { addEnquiry } = useEnquiries();
  const { addFollowup } = useFollowups();
  const { addPayment } = usePayments();
  const { saveSalary } = useSalaryActions();
  const { members } = useTeam({ includeAdmins: true });

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [quickAction, setQuickAction] = useState(null); // 'project', 'enquiry', 'followup', 'payment', 'team', 'salary'

  const [searchQuery, setSearchQuery] = useState('');
  const prevUnreadCount = useRef(unreadCount);
  const hasMounted = useRef(false);

  const searchInputRef = useRef(null);

  // OS search shortcut detection
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const searchShortcutHint = isMac ? '⌘ K' : 'Ctrl K';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const pageLabels = {
    '/admin/dashboard': 'Dashboard',
    '/admin/payments': 'Payments',
    '/admin/enquiry': 'Enquiries',
    '/admin/projects': 'Projects',
    '/admin/followups': 'Follow-Ups',
    '/admin/outgoing-payments': 'Outgoing Payments',
    '/admin/team': 'Team',
    '/admin/settings': 'Settings',
    '/admin/reports': 'Reports',
    '/admin/salary': 'Salary',
    '/admin/outgoing-payments/salary': 'Salary Management',
    '/admin/tools': 'Tools',
    '/admin/rgp': 'RGP Challan',
  };
  const currentPageLabel = pageLabels[location.pathname] || 'Dashboard';

  const dateRangeLabels = {
    '1': 'Today',
    '7': 'Last 7 Days',
    '30': 'Last 30 Days',
    'this_month': 'This Month',
    'this_quarter': 'This Quarter',
    'all': 'Custom Range'
  };

  // Creation Action Handlers
  const handleCreateProject = async (data) => {
    await addProject(data);
    toast.success('Project created successfully!');
  };

  const handleCreateEnquiry = async (data) => {
    const enquiryRef = await addEnquiry(data);
    if (data.assignedTo) {
      const member = members.find(m => m.id === data.assignedTo);
      if (member?.whatsapp) {
        try { await notifyEnquiryAssigned(member, { ...data, id: enquiryRef.id }); } catch (e) { console.error(e); }
      }
    }
    toast.success('Enquiry created successfully!');
  };

  const handleCreateFollowup = async (data) => {
    const followupRef = await addFollowup(data);
    if (data.assignedTo) {
      const member = members.find(m => m.id === data.assignedTo);
      if (member?.whatsapp) {
        try { await notifyFollowupAssigned(member, { ...data, id: followupRef.id }); } catch (e) { console.error(e); }
      }
    }
    toast.success('Follow-up created successfully!');
  };

  const handleCreatePayment = async (data) => {
    const paymentRef = await addPayment(data);
    if (data.assignedTo) {
      const member = members.find(m => m.id === data.assignedTo);
      if (member?.whatsapp) {
        try { await notifyPaymentAssigned(member, { ...data, id: paymentRef.id }); } catch (e) { console.error(e); }
      }
    }
    toast.success('Payment created successfully!');
  };

  const handleCreateTeamMember = async (data) => {
    await createTeamMember(data);
    notifyWelcome(data);
    toast.success(`${data.name} created as ${data.role}!`);
  };

  const handleCreateSalary = async (uid, month, data) => {
    await saveSalary(uid, month, data);
    const member = members.find(m => m.id === uid);
    if (data.status === 'paid' && member?.whatsapp) {
      try { await notifySalaryPaid(member, data, month); } catch (e) { console.error(e); }
    }
    toast.success('Salary entry saved!');
  };

  return (
    <>
      <header
        className={`fixed top-0 right-0 left-0 z-30 flex h-16 items-center border-b border-[#E5E7EB] bg-[#FFFFFF] px-6 transition-all duration-300 ${
          collapsed ? 'lg:left-[72px]' : 'lg:left-[280px]'
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

        {/* LEFT SECTION: Breadcrumbs & Search */}
        <div className="flex items-center gap-6 flex-1 min-w-0">
          {/* Breadcrumb Navigation */}
          <div className="hidden md:flex items-center gap-2 text-base font-semibold text-[#0F172A] flex-shrink-0 font-sans tracking-tight">
            <span className="text-[#64748B] font-medium text-sm">Operations</span>
            <span className="text-slate-200">/</span>
            <span className="text-[#0F172A] font-semibold text-sm">{currentPageLabel}</span>
          </div>

          {/* Global Search command palette bar */}
          <div className="relative flex-1 max-w-[320px] w-[320px] h-11 border border-[#E2E8F0] rounded-[12px] bg-[#F8FAFC] focus-within:ring-2 focus-within:ring-[#2563EB]/10 focus-within:border-[#2563EB] focus-within:bg-white transition-all flex items-center px-3">
            <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="⌘ K Search projects, tasks, members, payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 placeholder:text-slate-400 text-slate-900 h-full focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-450 font-sans shadow-sm pointer-events-none flex-shrink-0 ml-1">
              {searchShortcutHint}
            </kbd>
          </div>
        </div>

        {/* CENTER SECTION: Quick Actions Button */}
        <div className="relative mx-3">
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            className="h-11 px-[18px] rounded-[12px] bg-[#2563EB] text-white text-xs font-semibold shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 transition-all flex items-center gap-1.5 focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickCreate ? 'rotate-180' : ''}`} />
          </button>

          {showQuickCreate && (
            <>
              <div className="fixed inset-0 z-45" onClick={() => setShowQuickCreate(false)} />
              <div className="absolute left-1/2 -translate-x-1/2 top-13 w-52 bg-white rounded-[12px] shadow-xl border border-slate-100 py-1.5 z-50 animate-scaleUp overflow-hidden">
                {[
                  { label: 'Create Project', action: 'project', icon: Briefcase },
                  { label: 'Create Enquiry', action: 'enquiry', icon: FileText },
                  { label: 'Create Follow-Up', action: 'followup', icon: MessageSquare },
                  { label: 'Create Payment', action: 'payment', icon: DollarSign },
                  { label: 'Create Team Member', action: 'team', icon: Users },
                  { label: 'Create Salary Entry', action: 'salary', icon: Wallet }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.action}
                      onClick={() => { setQuickAction(item.action); setShowQuickCreate(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* RIGHT SECTION: Date Filter, Bell, Profile */}
        <div className="flex items-center gap-3">
          {/* Global Date Filter dropdown */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="h-11 px-4 rounded-[12px] border border-[#E2E8F0] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 focus:outline-none"
              style={{ minWidth: '150px' }}
            >
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <span className="flex-1 text-left text-xs font-semibold">{dateRangeLabels[dateRange] || 'Select range'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDateDropdown && (
              <>
                <div className="fixed inset-0 z-45" onClick={() => setShowDateDropdown(false)} />
                <div className="absolute right-0 top-13 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-scaleUp overflow-hidden">
                  {Object.entries(dateRangeLabels).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => { setDateRange(val); setShowDateDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${
                        dateRange === val ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>



          {/* ── Notification Bell ── */}
          <button
            id="notification-bell"
            onClick={() => setShowNotifications((v) => !v)}
            className={`relative rounded-xl p-2.5 transition-all ${
              showNotifications
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            {/* Bell icon with shake when unread */}
            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'notif-bell-shake' : ''}`} />

            {/* Badge positioned correctly (Badge size: 18px) */}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none notif-badge-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="hidden h-6 w-px bg-gray-200 sm:block" />

          {/* Profile Menu Dropdown */}
          <div className="relative">
            <div
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2.5 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 flex-shrink-0 rounded-full overflow-hidden border border-slate-100">
                <UserAvatar user={userData || currentUser} size={36} />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {userData?.name || 'Rao Jatin'}
                </p>
                <p className="text-xs font-medium text-[#64748B] leading-tight mt-0.5">
                  {currentUser?.isMainAdmin ? 'Administrator' : currentUser?.role === 'admin' ? 'Admin' : 'Team Member'}
                </p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-405 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </div>

            {showProfile && (
              <div className="absolute right-0 top-13 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 overflow-hidden animate-scaleUp">
                <div className="px-4 py-3 border-b border-gray-50 bg-slate-50/40">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar user={userData || currentUser} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{userData?.name || 'Rao Jatin'}</p>
                      <p className="text-[11px] text-gray-450 truncate">{userData?.email}</p>
                    </div>
                  </div>
                </div>
                {[
                  { label: 'My Profile', path: '/admin/settings' },
                  { label: 'Company Settings', path: '/admin/settings' },
                  { label: 'Theme Settings', path: '/admin/settings' }
                ].map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => { navigate(opt.path); setShowProfile(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors font-bold"
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

      {/* Quick Create Modals */}
      <QuickProjectModal
        isOpen={quickAction === 'project'}
        onClose={() => setQuickAction(null)}
        onSubmit={handleCreateProject}
      />
      <QuickEnquiryModal
        isOpen={quickAction === 'enquiry'}
        onClose={() => setQuickAction(null)}
        onSubmit={handleCreateEnquiry}
        members={members}
      />
      <QuickFollowupModal
        isOpen={quickAction === 'followup'}
        onClose={() => setQuickAction(null)}
        onSubmit={handleCreateFollowup}
        members={members}
      />
      <QuickPaymentModal
        isOpen={quickAction === 'payment'}
        onClose={() => setQuickAction(null)}
        onSubmit={handleCreatePayment}
        members={members}
      />
      <QuickTeamModal
        isOpen={quickAction === 'team'}
        onClose={() => setQuickAction(null)}
        onSubmit={handleCreateTeamMember}
      />
      <QuickSalaryModal
        isOpen={quickAction === 'salary'}
        onClose={() => setQuickAction(null)}
        onSubmit={handleCreateSalary}
        members={members}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Quick Create Modals Subcomponents
// ──────────────────────────────────────────────────────────────

function QuickProjectModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    client: '',
    poNumber: '',
    poValue: '',
    status: 'planning',
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    projectManager: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        client: form.client.trim(),
        poNumber: form.poNumber.trim(),
        poValue: Number(form.poValue) || 0,
        status: form.status,
        startDate: form.startDate ? Timestamp.fromDate(new Date(form.startDate)) : null,
        deadline: form.deadline ? Timestamp.fromDate(new Date(form.deadline)) : null,
        projectManager: form.projectManager.trim(),
        description: form.description.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Create Project</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Name *</label>
            <input
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
              placeholder="e.g. Website Redesign"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Client name"
                value={form.client}
                onChange={e => setForm({ ...form, client: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">PO Number</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="e.g. PO-12345"
                value={form.poNumber}
                onChange={e => setForm({ ...form, poNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">PO Value (INR)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="0"
                value={form.poValue}
                onChange={e => setForm({ ...form, poValue: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deadline</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Manager</label>
            <input
              className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
              placeholder="e.g. Rao Jatin"
              value={form.projectManager}
              onChange={e => setForm({ ...form, projectManager: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={3}
              placeholder="Brief details about the project..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickEnquiryModal({ isOpen, onClose, onSubmit, members }) {
  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    contactPhone: '',
    description: '',
    taskType: '',
    assignedTo: '',
    assignedToName: '',
    targetDate: '',
    nextFollowupDate: '',
    amount: '',
    pipelineStage: 'new',
    priority: 'medium',
    source: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        contactPhone: form.contactPhone.trim(),
        description: form.description.trim(),
        taskType: form.taskType,
        assignedTo: form.assignedTo,
        assignedToName: form.assignedToName,
        targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
        nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
        amount: Number(form.amount) || 0,
        pipelineStage: form.pipelineStage,
        priority: form.priority,
        source: form.source.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Create Enquiry (Lead)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name *</label>
            <input
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
              placeholder="e.g. Acme Corp"
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Person</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Name"
                value={form.contactPerson}
                onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Phone</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Phone"
                value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lead Value (INR)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.taskType}
                onChange={e => setForm({ ...form, taskType: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="Quotation">Quotation</option>
                <option value="Visit">Visit</option>
                <option value="Costing">Costing</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pipeline Stage</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.pipelineStage}
                onChange={e => setForm({ ...form, pipelineStage: e.target.value })}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="quoted">Quoted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.targetDate}
                onChange={e => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Follow-up Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.nextFollowupDate}
                onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign To</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.assignedTo}
                onChange={e => {
                  const m = members.find(x => x.id === e.target.value);
                  setForm({ ...form, assignedTo: e.target.value, assignedToName: m ? m.name : '' });
                }}
              >
                <option value="">Select team member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Source</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="e.g. Website, Referral"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={2}
              placeholder="Details about the lead..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create Enquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickFollowupModal({ isOpen, onClose, onSubmit, members }) {
  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    contactPhone: '',
    description: '',
    taskType: '',
    assignedTo: '',
    assignedToName: '',
    targetDate: new Date().toISOString().split('T')[0],
    nextFollowupDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim(),
        contactPhone: form.contactPhone.trim(),
        description: form.description.trim(),
        taskType: form.taskType,
        assignedTo: form.assignedTo,
        assignedToName: form.assignedToName,
        targetDate: form.targetDate ? Timestamp.fromDate(new Date(form.targetDate)) : null,
        nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Create Follow-Up</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name *</label>
            <input
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
              placeholder="e.g. Acme Corp"
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Person</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Name"
                value={form.contactPerson}
                onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Phone</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Phone"
                value={form.contactPhone}
                onChange={e => setForm({ ...form, contactPhone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Activity *</label>
            <textarea
              required
              className="w-full p-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={3}
              placeholder="What needs to be done..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Task Type</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.taskType}
                onChange={e => setForm({ ...form, taskType: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="Quotation">Quotation</option>
                <option value="Visit">Visit</option>
                <option value="Costing">Costing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.targetDate}
                onChange={e => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign To</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.assignedTo}
                onChange={e => {
                  const m = members.find(x => x.id === e.target.value);
                  setForm({ ...form, assignedTo: e.target.value, assignedToName: m ? m.name : '' });
                }}
              >
                <option value="">Select team member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Follow-up Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.nextFollowupDate}
                onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create Follow-Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickPaymentModal({ isOpen, onClose, onSubmit, members }) {
  const [form, setForm] = useState({
    customerName: '',
    invoiceNumber: '',
    amount: '',
    totalPaid: 0,
    paymentStatus: 'pending',
    targetPaymentDate: '',
    nextFollowupDate: '',
    assignedTo: '',
    assignedToName: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.amount) return;
    setSaving(true);
    try {
      let finalTotalPaid = 0;
      let finalStatus = form.paymentStatus;
      
      if (form.paymentStatus === 'received') {
        finalTotalPaid = Number(form.amount) || 0;
      } else if (form.paymentStatus === 'partial') {
        finalTotalPaid = Number(form.totalPaid) || 0;
      } else {
        finalTotalPaid = 0;
      }

      if (finalTotalPaid >= Number(form.amount) && Number(form.amount) > 0) {
        finalStatus = 'received';
      } else if (finalTotalPaid > 0) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'pending';
      }

      const netPendingVal = Math.max(0, Number(form.amount) - finalTotalPaid);

      await onSubmit({
        customerName: form.customerName.trim(),
        invoiceNumber: form.invoiceNumber.trim(),
        amount: Number(form.amount),
        totalPaid: finalTotalPaid,
        paymentStatus: finalStatus,
        targetPaymentDate: form.targetPaymentDate ? Timestamp.fromDate(new Date(form.targetPaymentDate)) : null,
        nextFollowupDate: form.nextFollowupDate ? Timestamp.fromDate(new Date(form.nextFollowupDate)) : null,
        assignedTo: form.assignedTo,
        assignedToName: form.assignedToName,
        remarks: form.remarks.trim(),
        netPendingAmount: netPendingVal,
        netPending: netPendingVal,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Create Payment</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer *</label>
              <input
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Customer Name"
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Invoice No.</label>
              <input
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="INV-001"
                value={form.invoiceNumber}
                onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Amount (INR) *</label>
              <input
                required
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="0"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.paymentStatus}
                onChange={e => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
              </select>
            </div>
          </div>
          
          {form.paymentStatus === 'partial' && (
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
              <label className="block text-xs font-semibold text-blue-700 mb-1.5">Initial Paid Amount (INR)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-blue-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-white"
                placeholder="Enter paid amount"
                value={form.totalPaid}
                onChange={e => setForm({ ...form, totalPaid: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.targetPaymentDate}
                onChange={e => setForm({ ...form, targetPaymentDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Next Follow-up</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.nextFollowupDate}
                onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign To</label>
            <select
              className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
              value={form.assignedTo}
              onChange={e => {
                const m = members.find(x => x.id === e.target.value);
                setForm({ ...form, assignedTo: e.target.value, assignedToName: m ? m.name : '' });
              }}
            >
              <option value="">Select team member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Remarks</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={2}
              placeholder="Any payment notes..."
              value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickTeamModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    designation: '',
    role: 'member',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.phone || !form.whatsapp || !form.designation.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    setError('');
    
    const defaultPermissions = form.role === 'admin'
      ? ['dashboard','projects','enquiry','followups','payments','outgoing_payments','rgp','salary','tools','team','settings']
      : ['dashboard','tasks','enquiry','followups','payments','rgp','profile'];

    try {
      await onSubmit({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        designation: form.designation.trim(),
        role: form.role,
        permissions: defaultPermissions,
        status: form.status,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Add Team Member</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-medium text-red-600">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name *</label>
              <input
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Full Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email *</label>
              <input
                required
                type="email"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="email@company.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password *</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="w-full h-10 pl-3 pr-10 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                  placeholder="Min 8 chars"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Designation *</label>
              <input
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="e.g. Site Engineer"
                value={form.designation}
                onChange={e => setForm({ ...form, designation: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone *</label>
              <input
                required
                type="tel"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="Phone number"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">WhatsApp *</label>
              <input
                required
                type="tel"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="WhatsApp number"
                value={form.whatsapp}
                onChange={e => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              >
                <option value="member">Team Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Create Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickSalaryModal({ isOpen, onClose, onSubmit, members }) {
  const getMonthOptions = () => {
    const opts = [];
    const now = new Date();
    for (let i = -1; i <= 11; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      opts.push({ val, label });
    }
    return opts;
  };

  const [form, setForm] = useState({
    uid: '',
    month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    workingDays: 26,
    presentDays: 26,
    basicSalary: '',
    overtime: 0,
    allowances: 0,
    remarks: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.uid || !form.month) return;
    setSaving(true);
    try {
      const selectedMember = members.find(m => m.id === form.uid);
      const data = {
        memberName: selectedMember ? selectedMember.name : '',
        designation: selectedMember ? selectedMember.designation : '',
        basicSalary: Number(form.basicSalary) || 0,
        workingDays: Number(form.workingDays) || 0,
        presentDays: Number(form.presentDays) || 0,
        overtime: Number(form.overtime) || 0,
        allowances: Number(form.allowances) || 0,
        remarks: form.remarks.trim(),
        status: form.status,
        paidDate: form.status === 'paid' ? Timestamp.now() : null,
      };
      await onSubmit(form.uid, form.month, data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Create Salary Entry</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Member *</label>
              <select
                required
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.uid}
                onChange={e => setForm({ ...form, uid: e.target.value })}
              >
                <option value="">Select team member</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Month *</label>
              <select
                required
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.month}
                onChange={e => setForm({ ...form, month: e.target.value })}
              >
                {getMonthOptions().map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Working Days</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.workingDays}
                onChange={e => setForm({ ...form, workingDays: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Present Days</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.presentDays}
                onChange={e => setForm({ ...form, presentDays: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Basic Salary (INR)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                placeholder="0"
                value={form.basicSalary}
                onChange={e => setForm({ ...form, basicSalary: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Overtime (INR)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                value={form.overtime}
                onChange={e => setForm({ ...form, overtime: e.target.value })}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Allowances (INR)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30"
                value={form.allowances}
                onChange={e => setForm({ ...form, allowances: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                className="w-full h-10 px-2 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 font-semibold"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <div className="text-xs text-slate-500 mb-1 font-medium">Net Salary</div>
              <div className="h-10 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800">
                INR {((Number(form.basicSalary) || 0) + (Number(form.overtime) || 0) + (Number(form.allowances) || 0)).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Remarks</label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-205 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm bg-slate-50/30 resize-none"
              rows={2}
              placeholder="Any salary notes..."
              value={form.remarks}
              onChange={e => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

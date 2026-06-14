import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Search, Check, CheckCheck, Trash2, Filter,
  ArrowLeft, ExternalLink, Clock, AlertCircle, Calendar,
  ChevronRight, CreditCard, MessageSquare, Wrench, FileText,
  Users, CheckCircle2, Volume2, VolumeX
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../hooks/useToast';
import useDelete from '../hooks/useDelete';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

const NOTIF_CONFIG = {
  task:     { label: 'Task',      icon: CheckCircle2,  bg: 'bg-blue-100',   text: 'text-blue-600',   ring: 'ring-blue-200',   route: (notif) => notif.relatedId ? `/admin/projects` : '/admin/projects' },
  payment:  { label: 'Payment',   icon: CreditCard,    bg: 'bg-green-100',  text: 'text-green-600',  ring: 'ring-green-200',  route: (notif) => '/admin/payments' },
  followup: { label: 'Follow-Up', icon: MessageSquare, bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200', route: (notif) => '/admin/followups' },
  enquiry:  { label: 'Enquiry',   icon: FileText,      bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-200', route: (notif) => '/admin/enquiry' },
  rgp:      { label: 'RGP',       icon: Wrench,        bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-200', route: (notif) => '/admin/rgp' },
  salary:   { label: 'Salary',    icon: CreditCard,    bg: 'bg-teal-100',   text: 'text-teal-600',   ring: 'ring-teal-200',   route: (notif) => '/admin/salary' },
  team:     { label: 'Team',      icon: Users,         bg: 'bg-indigo-100', text: 'text-indigo-600', ring: 'ring-indigo-200', route: (notif) => '/admin/team' },
  default:  { label: 'Info',      icon: AlertCircle,   bg: 'bg-gray-100',   text: 'text-gray-600',   ring: 'ring-gray-200',   route: (notif) => null },
};

function getConfig(type) {
  return NOTIF_CONFIG[type] || NOTIF_CONFIG.default;
}

function formatRelativeTime(timestamp) {
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

function formatFullTime(timestamp) {
  if (!timestamp) return '-';
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { userData } = useAuth();
  const { deleteState, confirmDelete, handleConfirm, handleClose } = useDelete();

  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications(userData?.uid);

  // Filter and Search states
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifs, setSelectedNotifs] = useState([]);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('notification_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('notification_sound_enabled', String(newVal));
  };

  // Filter and search logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Tab filter
      if (activeTab === 'unread' && notif.read) return false;

      // Type filter
      if (selectedType !== 'all' && notif.type !== selectedType) return false;

      // Search query
      if (searchQuery.trim()) {
        const text = (notif.message || '').toLowerCase();
        const category = getConfig(notif.type).label.toLowerCase();
        return text.includes(searchQuery.toLowerCase()) || category.includes(searchQuery.toLowerCase());
      }

      return true;
    });
  }, [notifications, activeTab, selectedType, searchQuery]);

  // Handle single read
  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (err) {
      toast.error('Failed to mark notification as read');
    }
  };

  // Bulk mark read
  const handleMarkSelectedRead = async () => {
    if (selectedNotifs.length === 0) return;
    try {
      await Promise.all(selectedNotifs.map((id) => markAsRead(id)));
      setSelectedNotifs([]);
      toast.success('Selected notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark selected notifications as read');
    }
  };

  // Bulk delete
  const handleDeleteSelected = () => {
    if (selectedNotifs.length === 0) return;
    confirmDelete({
      title: 'Delete Selected Notifications',
      description: `Are you sure you want to delete the ${selectedNotifs.length} selected notifications?`,
      onConfirm: async () => {
        await Promise.all(selectedNotifs.map((id) => deleteNotification(id)));
        setSelectedNotifs([]);
        toast.success('Selected notifications deleted');
      },
    });
  };

  // Clear all
  const handleClearAll = () => {
    confirmDelete({
      title: 'Clear All Notifications',
      description: `Remove all ${notifications.length} notifications? This cannot be undone.`,
      onConfirm: async () => {
        await clearAllNotifications();
        setSelectedNotifs([]);
        setSelectedItemDetail(null);
        toast.success('All notifications cleared');
      },
    });
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedNotifs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedNotifs.length === filteredNotifications.length) {
      setSelectedNotifs([]);
    } else {
      setSelectedNotifs(filteredNotifications.map((n) => n.id));
    }
  };

  // Navigate to target
  const handleNavigateToTarget = (notif) => {
    const cfg = getConfig(notif.type);
    const destination = cfg.route(notif);
    if (destination) {
      navigate(destination);
    } else {
      toast.info('No direct link for this notification type.');
    }
  };

  return (
    <div className="space-y-6 page-transition">
      {/* Header Banner */}
      <div className="welcome-banner animated-gradient p-6 text-white rounded-2xl relative overflow-hidden shadow-md">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white mr-1"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <p className="text-teal-200 text-sm font-medium">Notification Center</p>
            </div>
            <h1 className="text-2xl font-bold">Personal Alerts & Inbox</h1>
            <p className="text-white/70 text-sm mt-1">
              Manage your personal tasks, approvals, payments, and system updates
            </p>
          </div>
          <Bell className="w-14 h-14 text-white/20 hidden sm:block" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle: Notification list & filters */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls Card */}
          <div className="card p-4 space-y-3.5">
            {/* Search and filter row */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notification messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-semibold text-gray-700"
                >
                  <option value="all">All Categories</option>
                  <option value="task">Tasks</option>
                  <option value="payment">Payments</option>
                  <option value="followup">Follow-Ups</option>
                  <option value="enquiry">Enquiries</option>
                  <option value="rgp">RGP</option>
                  <option value="salary">Salary</option>
                  <option value="team">Team updates</option>
                  <option value="default">Other Info</option>
                </select>
              </div>

              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  soundEnabled
                    ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100/70'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
                title={soundEnabled ? 'Disable new alert sound' : 'Enable new alert sound'}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-teal-600" />
                    <span>Sound On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-gray-400" />
                    <span>Muted</span>
                  </>
                )}
              </button>
            </div>

            {/* Tab views & mark all actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 flex-wrap gap-2">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {[
                  { key: 'all', label: 'All', count: notifications.length },
                  { key: 'unread', label: 'Unread', count: unreadCount },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setActiveTab(t.key);
                      setSelectedNotifs([]);
                    }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === t.key
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {t.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeTab === t.key ? 'bg-teal-50 text-teal-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {notifications.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bulk actions bar (if selected) */}
          {selectedNotifs.length > 0 && (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-100 px-4 py-3 rounded-2xl animate-fade-in shadow-sm">
              <span className="text-xs font-semibold text-teal-800">
                {selectedNotifs.length} item{selectedNotifs.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMarkSelectedRead}
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-teal-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Read
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Notification List Container */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p className="font-semibold">Syncing alerts...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30 text-teal-600" />
                <p className="font-semibold text-gray-600">No matching notifications found</p>
                <p className="text-xs mt-1">Try switching filters or typing another keyword</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Select All Checkbox Header */}
                <div className="px-4 py-2.5 bg-gray-50/50 flex items-center justify-between text-xs font-semibold text-gray-500">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={
                        filteredNotifications.length > 0 &&
                        selectedNotifs.length === filteredNotifications.length
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-teal-600 border-gray-300 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Select All in list</span>
                  </div>
                  <span>Showing {filteredNotifications.length} items</span>
                </div>

                {filteredNotifications.map((notif) => {
                  const cfg = getConfig(notif.type);
                  const Icon = cfg.icon;
                  const isUnread = !notif.read;
                  const isSelected = selectedNotifs.includes(notif.id);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => setSelectedItemDetail(notif)}
                      className={`group relative flex items-start gap-3 px-4 py-4 cursor-pointer transition-all border-l-2 hover:bg-gray-50/75 ${
                        isUnread
                          ? 'border-teal-500 bg-teal-50/20'
                          : 'border-transparent'
                      } ${isSelected ? 'bg-teal-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="mt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(notif.id)}
                          className="w-4 h-4 rounded text-teal-600 border-gray-300 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </div>

                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center ring-1 ${cfg.ring} mt-0.5`}>
                        <Icon className={`w-4.5 h-4.5 ${cfg.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          {isUnread && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
                          )}
                        </div>
                        <p className={`text-sm leading-snug break-words ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline">{formatFullTime(notif.createdAt)}</span>
                        </div>
                      </div>

                      {/* Mark read button & details chevron */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        {isUnread && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(notif.id);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Notification detail pane */}
        <div className="space-y-4">
          <div className="card p-5 h-full min-h-[350px] flex flex-col justify-between sticky top-24">
            {selectedItemDetail ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  {/* Category and details header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${getConfig(selectedItemDetail.type).bg} flex items-center justify-center`}>
                        {(() => {
                          const Icon = getConfig(selectedItemDetail.type).icon;
                          return <Icon className={`w-4 h-4 ${getConfig(selectedItemDetail.type).text}`} />;
                        })()}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${getConfig(selectedItemDetail.type).text}`}>
                        {getConfig(selectedItemDetail.type).label}
                      </span>
                    </div>

                    {!selectedItemDetail.read && (
                      <span className="bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        New Alert
                      </span>
                    )}
                  </div>

                  {/* Body text */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Message</p>
                    <p className="text-sm text-gray-800 leading-relaxed break-words font-medium bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                      {selectedItemDetail.message}
                    </p>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-50 text-xs">
                    <div>
                      <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mb-0.5">Received</p>
                      <p className="font-medium text-gray-700">{formatRelativeTime(selectedItemDetail.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] mb-0.5">Date & Time</p>
                      <p className="font-medium text-gray-700">{formatFullTime(selectedItemDetail.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-6 border-t border-gray-100">
                  {getConfig(selectedItemDetail.type).route(selectedItemDetail) && (
                    <button
                      onClick={() => handleNavigateToTarget(selectedItemDetail)}
                      className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm hover:shadow transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Related Record
                    </button>
                  )}

                  <div className="flex gap-2">
                    {!selectedItemDetail.read && (
                      <button
                        onClick={() => {
                          handleMarkRead(selectedItemDetail.id);
                          setSelectedItemDetail((prev) => ({ ...prev, read: true }));
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-teal-200 hover:bg-teal-50 text-teal-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Mark Read
                      </button>
                    )}

                    <button
                      onClick={() => {
                        confirmDelete({
                          title: 'Delete Notification',
                          description: 'Remove this notification from your list?',
                          onConfirm: async () => {
                            await deleteNotification(selectedItemDetail.id);
                            setSelectedItemDetail(null);
                            toast.success('Notification deleted');
                          },
                        });
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Alert
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12 flex-1">
                <Bell className="w-12 h-12 mb-3 text-gray-300 animate-pulse" />
                <h3 className="font-semibold text-gray-700 text-sm">Select an Alert</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">
                  Click on any notification in the list to view full details and take action
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={deleteState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={deleteState.title}
        description={deleteState.description}
        isDeleting={deleteState.isDeleting}
      />
    </div>
  );
}

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ClipboardList, CreditCard, RefreshCw, Bell, BellOff, CheckCheck, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { logInfo } from '../lib/firestoreDebug';

export default function NotificationsPage() {
 const navigate = useNavigate();
 const { userData } = useAuth();
 const { notifications, loading, markAsRead, markAllRead } = useNotifications(userData?.uid);
 const unreadCount = notifications.filter(n => !n.read).length;

 useEffect(() => {
  logInfo('NotificationsPage', 'Render state:', {
   uid: userData?.uid || null,
   notifications: notifications.length,
   unreadCount,
   loading,
  });
 }, [loading, notifications.length, unreadCount, userData?.uid]);

 const getIcon = (type) => {
 const icons = {
 task: <ClipboardList className="h-4 w-4 text-teal-600" />,
 payment: <CreditCard className="h-4 w-4 text-blue-600" />,
 followup: <RefreshCw className="h-4 w-4 text-amber-600" />,
 enquiry: <RefreshCw className="h-4 w-4 text-purple-600" />,
 rgp: <Bell className="h-4 w-4 text-indigo-600" />,
 };
 return icons[type] || <Bell className="h-4 w-4 text-gray-500" />;
 };

 const getIconBg = (type) => {
 const bgs = {
 task: 'bg-teal-50',
 payment: 'bg-blue-50',
 followup: 'bg-amber-50',
 enquiry: 'bg-purple-50',
 rgp: 'bg-indigo-50',
 };
 return bgs[type] || 'bg-gray-50';
 };

 const formatTime = (ts) => {
 if (!ts) return 'Just now';
 const date = ts.toDate ? ts.toDate() : new Date(ts);
 const diff = Date.now() - date.getTime();
 const mins = Math.floor(diff / 60000);
 if (mins < 60) return `${mins}m ago`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `${hours}h ago`;
 const days = Math.floor(hours / 24);
 return `${days}d ago`;
 };

 return (
 <div className="pb-4">
 <div className="px-4 pt-4 pb-3 flex items-center justify-between">
 <div className="flex items-center gap-3">
   <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
     <ChevronLeft className="h-6 w-6 text-[var(--text-primary)]" />
   </button>
   <div>
     <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
     {unreadCount > 0 && <p className="text-xs text-[var(--text-muted)] mt-0.5">{unreadCount} unread</p>}
   </div>
 </div>
 {unreadCount > 0 && (
 <Button variant="ghost" size="sm" onClick={markAllRead} className="text-teal-600"><CheckCheck className="h-4 w-4 mr-1" />Mark all read</Button>
 )}
 </div>

 {loading ? (
 <div className="py-12 text-center text-gray-400"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Loading...</div>
 ) : notifications.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20">
 <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4"><BellOff className="h-8 w-8 text-gray-300" /></div>
 <p className="text-gray-400 font-medium">No notifications yet.</p>
 <p className="text-xs text-gray-300 mt-1">You're all caught up!</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-50">
 {notifications.map(notif => (
 <div key={notif.id} onClick={() => markAsRead(notif.id)} className={`flex items-start gap-3 px-4 py-3.5 transition-colors cursor-pointer ${!notif.read ? 'bg-teal-50/50' : ''}`}>
 <div className={`h-9 w-9 rounded-full ${getIconBg(notif.type)} flex items-center justify-center flex-shrink-0 mt-0.5`}>{getIcon(notif.type)}</div>
 <div className="flex-1 min-w-0">
 <p className={`text-sm ${!notif.read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{notif.message}</p>
 <p className="text-xs text-gray-400 mt-1">{formatTime(notif.createdAt)}</p>
 </div>
 {!notif.read && <div className="h-2 w-2 rounded-full bg-teal-500 flex-shrink-0 mt-2" />}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

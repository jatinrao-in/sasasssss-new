import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Package, CreditCard, Phone, Calendar, ClipboardList, Megaphone, Wrench, X, ArrowLeft } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../hooks/useToast';

export default function NotificationsPage() {
  const {
    notifications, loading,
    markRead, markAllRead, deleteNotif,
    unreadCount
  } = useNotifications();

  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'read'

  const getIcon = (type) => {
    const icons = {
      task: ClipboardList,
      payment: CreditCard,
      followup: Calendar,
      enquiry: Phone,
      general: Megaphone,
      salary: CreditCard,
      rgp: Package,
      tool: Wrench,
    };
    const Icon = icons[type] || Bell;
    const colors = {
      task: 'bg-[#E8F0FE] text-[#1a73e8]',
      payment: 'bg-[#D1FAE5] text-[#059669]',
      followup: 'bg-[#F3E8FF] text-[#9333EA]',
      enquiry: 'bg-[#ECFEFF] text-[#0891B2]',
      salary: 'bg-[#E8F5E9] text-[#2E7D32]',
      rgp: 'bg-[#FFE0B2] text-[#E65100]',
      tool: 'bg-[#ECEFF1] text-[#37474F]',
      general: 'bg-[#FCE7F3] text-[#DB2777]',
    };
    const titles = {
      task: 'Task Updated',
      payment: 'Payment Updated',
      followup: 'Follow-Up Alert',
      enquiry: 'Client Enquiry',
      salary: 'Salary Updated',
      rgp: 'RGP Challan Update',
      tool: 'Locker Tool Update',
      general: 'Notice Alert',
    };
    return { 
      Icon, 
      color: colors[type] || 'bg-[#F2ECE1] text-[#A68F6D]',
      defaultTitle: titles[type] || 'System Notification'
    };
  };

  const timeAgo = (date) => {
    if (!date) return 'Just now';
    const timestamp = date.getTime ? date.getTime() : new Date(date).getTime();
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'unread') return !notif.read;
    if (activeTab === 'read') return notif.read;
    return true;
  });

  const handleNotificationTap = async (notif) => {
    try {
      if (!notif.read) {
        await markRead(notif.id);
      }
      
      const routes = {
        task: '/pwa/tasks',
        tool: '/pwa/tasks',
        followup: '/pwa/follow-ups',
        payment: '/pwa/payments',
        rgp: '/pwa/rgp',
        enquiry: '/pwa/enquiries',
      };
      
      const path = routes[notif.type];
      if (path) {
        navigate(path);
      }
    } catch (err) {
      console.error('Failed to handle notification tap:', err);
    }
  };



  const readCount = notifications.filter(n => n.read).length;

  if (loading) {
    return (
      <div 
        className="min-h-screen font-sans pb-24"
        style={{ background: 'linear-gradient(180deg, #FAF6EE 0%, #EAE4D9 100%)' }}
      >
        <div className="px-4 pt-5 pb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FAF6EE] border border-[#DFD5C6] text-[#A68F6D] active:scale-95 transition-all shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[20px] font-black text-slate-800 tracking-tight">Notifications</h1>
        </div>
        <div className="px-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-[#F2ECE1] rounded-2xl border border-[#DFD5C6]/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen font-sans pb-24 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FAF6EE 0%, #EAE4D9 100%)' }}
    >
      {/* Background wave */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-[200px] pointer-events-none z-0 opacity-40" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path d="M0,280 C150,280 200,200 420,200 C640,200 700,320 1020,320 C1220,320 1350,220 1440,200 L1440,320 L0,320 Z" fill="#DFD8CC" />
      </svg>

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="px-4 pt-5 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FAF6EE] border border-[#DFD5C6] text-[#A68F6D] active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <h1 className="text-[20px] font-black text-slate-800 tracking-tight leading-none">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-[10px] text-slate-500 font-semibold mt-1">{unreadCount} unread messages</p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-4">
          <div className="flex gap-1.5 p-1 bg-[#F2ECE1]/80 border border-[#DFD5C6] rounded-xl shadow-sm">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-[#FAF6EE] text-[var(--color-text-primary)] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button 
              onClick={() => setActiveTab('unread')} 
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'unread' 
                  ? 'bg-[#FAF6EE] text-[var(--color-text-primary)] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[14px] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('read')} 
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                activeTab === 'read' 
                  ? 'bg-[#FAF6EE] text-[var(--color-text-primary)] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Read ({readCount})
            </button>
          </div>
        </div>

        {/* Action Row */}
        {filteredNotifications.length > 0 && (
          <div className="px-4 flex justify-between items-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Showing {filteredNotifications.length} items
            </p>
            {activeTab !== 'read' && unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF6EE] border border-[#DFD5C6] text-[#3E362E] text-[9px] font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer shadow-sm hover:bg-[#F2ECE1]"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                Mark Read
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <div className="px-4 pt-6">
            <div className="text-center py-16 bg-[#F2ECE1] border border-[#DFD5C6] rounded-2xl p-6 shadow-sm flex flex-col items-center">
              <div className="h-16 w-16 bg-[#FAF6EE] border border-[#DFD5C6] rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Bell className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-slate-800 font-extrabold text-sm">No notifications found</p>
              <p className="text-slate-500 text-[10px] mt-1.5 max-w-[200px] mx-auto leading-relaxed">
                {activeTab === 'unread' 
                  ? 'All caught up! You have no unread notifications.'
                  : activeTab === 'read'
                    ? 'No read notifications. Tap on unread cards to mark them read.'
                    : 'You will be notified about tasks, payments, and follow-ups here.'}
              </p>
            </div>
          </div>
        )}

        {/* Notification List */}
        <div className="px-4 space-y-3">
          {filteredNotifications.map(notif => {
            const { Icon, color, defaultTitle } = getIcon(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationTap(notif)}
                className={`relative rounded-2xl border p-4 cursor-pointer flex gap-3 items-start transition-all active:scale-[0.98] hover:shadow-md ${
                  notif.read 
                    ? 'bg-[#FAF6EE]/75 border-[#DFD5C6]/60' 
                    : 'bg-[#F2ECE1] border-[#DFD5C6] shadow-sm border-l-4 border-l-[#A68F6D]'
                }`}
              >
                {/* Icon wrapper */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color} border border-white/20 shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-xs truncate ${notif.read ? 'font-semibold text-slate-600' : 'font-black text-slate-800'}`}>
                      {notif.title || defaultTitle}
                    </p>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A68F6D] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-2">
                    {notif.message || notif.body || 'No details provided'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

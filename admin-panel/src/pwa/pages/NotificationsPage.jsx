import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';

const SkeletonList = () => (
  <div style={{ padding: '16px' }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{ height: '80px', background: '#f3f4f6', borderRadius: '12px', marginBottom: '10px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
    ))}
  </div>
);

export default function NotificationsPage() {
  const {
    notifications, loading,
    markRead, markAllRead, deleteNotif,
    unreadCount
  } = useNotifications();

  const navigate = useNavigate();

  const getIcon = (type) => {
    const icons = {
      task: '📋',
      payment: '💰',
      followup: '🔔',
      enquiry: '📩',
      salary: '💳',
      rgp: '📦',
      tool: '🔧',
      general: '📢'
    };
    return icons[type] || '🔔';
  };

  const timeAgo = (date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  if (loading) return <SkeletonList />;

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '0 8px 0 0' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: '8px', background: '#DC2626', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '12px' }}>
                {unreadCount} new
              </span>
            )}
          </h2>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px' }}>🔔</div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '12px', fontSize: '15px' }}>
            No notifications yet
          </p>
        </div>
      )}

      {/* Notification List */}
      {notifications.map(notif => (
        <div
          key={notif.id}
          onClick={() => markRead(notif.id)}
          style={{
            background: notif.read ? 'var(--bg-card)' : 'var(--accent-light)',
            border: '1px solid',
            borderColor: notif.read ? 'var(--border-primary)' : 'var(--accent-primary)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '10px',
            cursor: 'pointer',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            position: 'relative'
          }}
        >
          {/* Icon */}
          <div style={{ fontSize: '24px', flexShrink: 0 }}>
            {getIcon(notif.type)}
          </div>

          {/* Content */}
          <div style={{ flex: 1, paddingRight: '20px' }}>
            <p style={{ fontWeight: notif.read ? '400' : '600', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '4px', margin: 0 }}>
              {notif.title}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
              {notif.body}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', margin: 0 }}>
              {timeAgo(notif.createdAt)}
            </p>
          </div>

          {/* Unread dot */}
          {!notif.read && (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: '4px' }} />
          )}

          {/* Delete button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteNotif(notif.id);
            }} 
            style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

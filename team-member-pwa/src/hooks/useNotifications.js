import { useEffect, useState } from 'react';
import {
  addDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';
import {
  buildNotificationPayload,
  getNotificationItemDoc,
  getNotificationItemsCollection,
} from '../lib/firestore-helpers';

export function useNotifications(userId) {
  const realtime = useRealtime();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (realtime && userId) {
      setNotifications(realtime.notifications || []);
      setUnreadCount(realtime.unreadCount || 0);
      setLoading(Boolean(realtime.loading?.notifications));
      return undefined;
    }

    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    const notificationQuery = query(
      getNotificationItemsCollection(db, userId),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      notificationQuery,
      (snapshot) => {
        const nextNotifications = snapshot.docs.map((notificationDoc) => ({
          id: notificationDoc.id,
          ...notificationDoc.data(),
        }));

        setNotifications(nextNotifications);
        setUnreadCount(nextNotifications.filter((notification) => !notification.read).length);
        setLoading(false);
      },
      (error) => {
        console.error('Notifications listener error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [realtime, userId]);

  const markAsRead = async (notificationId) => {
    if (!userId) {
      return;
    }

    return updateDoc(getNotificationItemDoc(db, userId, notificationId), { read: true });
  };

  const markAllRead = async () => {
    if (!userId) {
      return;
    }

    await Promise.all(
      notifications
        .filter((notification) => !notification.read)
        .map((notification) => updateDoc(getNotificationItemDoc(db, userId, notification.id), { read: true })),
    );
  };

  const addNotification = async (targetUserId, notification) => addDoc(
    getNotificationItemsCollection(db, targetUserId),
    buildNotificationPayload(notification),
  );

  return { notifications, loading, unreadCount, markAsRead, markAllRead, addNotification };
}

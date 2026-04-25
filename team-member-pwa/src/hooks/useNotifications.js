import { useEffect, useState } from 'react';
import {
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRealtime } from '../context/RealtimeContext';
import {
  logError,
  logFetch,
  logInfo,
  logSkip,
  logSnapshot,
} from '../lib/firestoreDebug';
import {
  addDocumentToCollection,
  buildNotificationPayload,
  getNotificationItemDoc,
  getNotificationItemsCollection,
  updateDocumentRef,
} from '../lib/firestore-helpers';

export function useNotifications(userId) {
  const realtime = useRealtime();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (realtime && userId) {
      logInfo('useNotifications', 'Using realtime notifications:', realtime.notifications?.length || 0);
      setNotifications(realtime.notifications || []);
      setUnreadCount(realtime.unreadCount || 0);
      setLoading(Boolean(realtime.loading?.notifications));
      return undefined;
    }

    if (!userId) {
      logSkip('useNotifications');
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return undefined;
    }

    logFetch('useNotifications', userId);

    const notificationQuery = query(
      getNotificationItemsCollection(db, userId),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      notificationQuery,
      (snapshot) => {
        logSnapshot('useNotifications', snapshot);
        const nextNotifications = snapshot.docs.map((notificationDoc) => ({
          id: notificationDoc.id,
          ...notificationDoc.data(),
        }));

        setNotifications(nextNotifications);
        setUnreadCount(nextNotifications.filter((notification) => !notification.read).length);
        setLoading(false);
      },
      (error) => {
        logError('useNotifications', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [realtime, userId]);

  const markAsRead = async (notificationId) => {
    if (!userId) {
      return;
    }

    return updateDocumentRef(
      getNotificationItemDoc(db, userId, notificationId),
      { read: true },
      { action: 'mark notification read', collectionName: 'notification_items' },
    );
  };

  const markAllRead = async () => {
    if (!userId) {
      return;
    }

    await Promise.all(
      notifications
        .filter((notification) => !notification.read)
        .map((notification) => updateDocumentRef(
          getNotificationItemDoc(db, userId, notification.id),
          { read: true },
          { action: 'mark notification read', collectionName: 'notification_items' },
        )),
    );
  };

  const addNotification = async (targetUserId, notification) => addDocumentToCollection(
    getNotificationItemsCollection(db, targetUserId),
    buildNotificationPayload(notification),
    { action: 'save notification', collectionName: 'notification_items' },
  );

  return { notifications, loading, unreadCount, markAsRead, markAllRead, addNotification };
}

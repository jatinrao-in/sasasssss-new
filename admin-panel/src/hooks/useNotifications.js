import { useEffect, useState } from 'react';
import {
 getDocs,
 onSnapshot,
 orderBy,
 query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import {
 addDocumentToCollection,
 buildNotificationPayload,
 deleteDocumentRef,
 getNotificationItemDoc,
 getNotificationItemsCollection,
 updateDocumentRef,
} from '../lib/firestore-helpers';

export function useNotifications(userId) {
 const [notifications, setNotifications] = useState([]);
 const [loading, setLoading] = useState(true);
 const [unreadCount, setUnreadCount] = useState(0);
 const { log } = useAuditLog();

 useEffect(() => {
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
 }, [userId]);

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

 const addNotification = async (targetUserId, notification) => {
  const notificationRef = await addDocumentToCollection(
   getNotificationItemsCollection(db, targetUserId),
   buildNotificationPayload(notification),
   { action: 'save notification', collectionName: 'notification_items' },
  );
  await log('notification_created', {
   notificationId: notificationRef.id,
   targetUserId,
   type: notification.type || '',
   relatedId: notification.relatedId || '',
  });
  return notificationRef;
 };

 const deleteNotification = async (notificationId) => {
 if (!userId) {
 return;
 }

 await deleteDocumentRef(
  getNotificationItemDoc(db, userId, notificationId),
  { action: 'delete notification', collectionName: 'notification_items' },
 );
 await log('notification_deleted', { notificationId, targetUserId: userId });
 };

 const clearAllNotifications = async () => {
 if (!userId) {
 return;
 }

 const snapshot = await getDocs(getNotificationItemsCollection(db, userId));
 await Promise.all(snapshot.docs.map((notificationDoc) => deleteDocumentRef(
  notificationDoc.ref,
  { action: 'delete notification', collectionName: 'notification_items' },
 )));
 await log('notifications_cleared', { targetUserId: userId, count: snapshot.docs.length });
 };

 return {
 notifications,
 loading,
 unreadCount,
 markAsRead,
 markAllRead,
 addNotification,
 deleteNotification,
 clearAllNotifications,
 };
}

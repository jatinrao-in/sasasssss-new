import { useEffect, useState } from 'react';
import {
 addDoc,
 deleteDoc,
 getDocs,
 onSnapshot,
 orderBy,
 query,
 updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuditLog from './useAuditLog';
import {
 buildNotificationPayload,
 getNotificationItemDoc,
 getNotificationItemsCollection,
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

 const addNotification = async (targetUserId, notification) => {
  const notificationRef = await addDoc(
   getNotificationItemsCollection(db, targetUserId),
   buildNotificationPayload(notification),
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

 await deleteDoc(getNotificationItemDoc(db, userId, notificationId));
 await log('notification_deleted', { notificationId, targetUserId: userId });
 };

 const clearAllNotifications = async () => {
 if (!userId) {
 return;
 }

 const snapshot = await getDocs(getNotificationItemsCollection(db, userId));
 await Promise.all(snapshot.docs.map((notificationDoc) => deleteDoc(notificationDoc.ref)));
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

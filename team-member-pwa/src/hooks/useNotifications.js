import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications', currentUser.uid, 'items'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q,
      (snap) => {
        const list = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date()
        }));
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.read).length);
        setLoading(false);
      },
      (error) => {
        console.error('Notif:', error);
        setLoading(false);
      }
    );

    return unsub;
  }, [currentUser?.uid]);

  const markRead = async (notifId) => {
    if (!currentUser?.uid) return;
    await updateDoc(
      doc(db, 'notifications', currentUser.uid, 'items', notifId),
      { read: true }
    );
  };

  const markAllRead = async () => {
    if (!currentUser?.uid) return;
    const unread = notifications.filter(n => !n.read);
    await Promise.all(
      unread.map(n => updateDoc(
        doc(db, 'notifications', currentUser.uid, 'items', n.id),
        { read: true }
      ))
    );
  };

  const deleteNotif = async (notifId) => {
    if (!currentUser?.uid) return;
    await deleteDoc(doc(db, 'notifications', currentUser.uid, 'items', notifId));
  };

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    deleteNotif
  };
};

import { useEffect, useRef, useState } from 'react';
import { doc, serverTimestamp } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, messaging } from '../lib/firebase';
import { COLLECTIONS, updateDocumentRef } from '../lib/firestore-helpers';
import { playNotificationSound } from '../lib/soundPlayer';
import { useToast } from './useToast';
import { useAuth } from './useAuth';

function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

const VAPID_KEY = String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '')
  .replace(/\\[rn]/g, '')
  .replace(/[\r\n]+/g, '')
  .trim() || null;

const URL_MAP = {
  task: '/tasks',
  task_complete: '/tasks',
  payment: '/payments',
  enquiry: '/enquiries',
  followup: '/follow-ups',
  rgp: '/rgp',
};

export function usePushNotifications() {
  const { userData } = useAuth();
  const toast = useToast();
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState(getNotificationPermission());
  const [showPrompt, setShowPrompt] = useState(false);
  const setupDoneRef = useRef(false);

  useEffect(() => {
    if (getNotificationPermission() === 'default') {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (!userData?.uid || permission !== 'granted' || !messaging || setupDoneRef.current) {
      return;
    }

    if (!VAPID_KEY) {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY not set, skipping token registration');
      return;
    }

    setupDoneRef.current = true;

    const setupFCM = async () => {
      try {
        const swReg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (!token) {
          console.warn('[FCM] No token returned');
          return;
        }

        setFcmToken(token);

        await updateDocumentRef(doc(db, COLLECTIONS.users, userData.uid), {
          fcmToken: token,
          fcmTokenUpdatedAt: serverTimestamp(),
        }, { action: 'save fcm token', collectionName: COLLECTIONS.users });
      } catch (err) {
        console.error('[FCM] Setup failed:', err?.code, err?.message);
        setupDoneRef.current = false;
      }
    };

    void setupFCM();
  }, [permission, userData?.uid]);

  useEffect(() => {
    if (!messaging || permission !== 'granted') {
      return undefined;
    }

    const unsubscribe = onMessage(messaging, async (payload) => {
      playNotificationSound();

      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || '';
      const type = payload.data?.type;

      try {
        const swReg = await navigator.serviceWorker.ready;
        await swReg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `saya-fg-${Date.now()}`,
          data: { ...payload.data, url: URL_MAP[type] || '/dashboard' },
          vibrate: [200, 100, 200],
        });
      } catch {
        toast.info(body ? `${title}: ${body}` : title);
      }
    });

    return () => unsubscribe();
  }, [permission, toast]);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === 'granted') {
        setupDoneRef.current = false;
        toast.success('Notifications enabled!');
      }

      return result;
    } catch (err) {
      console.error('[FCM] Permission request failed:', err);
      setShowPrompt(false);
      return 'denied';
    }
  };

  return { fcmToken, permission, showPrompt, requestPermission, setShowPrompt };
}

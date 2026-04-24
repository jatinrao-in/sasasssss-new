import { useState, useEffect, useRef } from 'react';
import { messaging, db } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { playNotificationSound } from '../lib/soundPlayer';

function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || null;

// URL map matching firebase-messaging-sw.js
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

  // Show permission prompt 3s after load if not yet decided
  useEffect(() => {
    if (getNotificationPermission() === 'default') {
      const t = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Setup FCM: fires once user is logged in + permission granted
  useEffect(() => {
    if (!userData?.uid || permission !== 'granted' || !messaging || setupDoneRef.current) return;
    if (!VAPID_KEY) {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY not set — skipping token registration');
      return;
    }

    setupDoneRef.current = true;

    const setupFCM = async () => {
      try {
        // The generated Workbox SW imports firebase-messaging-sw.js so the app
        // can use one root service worker for caching, updates, and FCM.
        const swReg = await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (!token) {
          console.warn('[FCM] No token returned — SW may need refresh');
          return;
        }

        console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
        setFcmToken(token);

        // Save to Firestore with timestamp for debugging
        await updateDoc(doc(db, 'users', userData.uid), {
          fcmTokens: arrayUnion(token),
          fcmUpdatedAt: serverTimestamp(),
          fcmDevice: navigator.userAgent.substring(0, 100),
        });

        console.log('[FCM] Token saved to Firestore for uid:', userData.uid);
      } catch (err) {
        console.error('[FCM] Setup failed:', err?.code, err?.message);
        // Reset so it can retry on next render
        setupDoneRef.current = false;
      }
    };

    setupFCM();
  }, [userData?.uid, permission]);

  // Foreground message listener
  useEffect(() => {
    if (!messaging || permission !== 'granted') return;

    const unsubscribe = onMessage(messaging, async (payload) => {
      console.log('[FCM] Foreground message:', payload);
      playNotificationSound();

      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || '';
      const type = payload.data?.type;

      // ✅ Show native OS notification even when app is open (via SW)
      // This makes it appear in the notification shade on Android
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
        // Fallback: just show toast if SW notification fails
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
        // Reset setupDone so FCM initializes now
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

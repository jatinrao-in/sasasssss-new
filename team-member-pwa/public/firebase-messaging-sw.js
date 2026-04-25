// Firebase Messaging Service Worker
// Must stay in /public/ so it is served from the app root.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const ACTIVE_CACHE_PREFIXES = [
  'google-fonts-cache',
  'gstatic-fonts-cache',
  'static-assets-v1',
  'html-nav-cache',
  'workbox-precache',
];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => !ACTIVE_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)))
          .map((cacheName) => caches.delete(cacheName)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

firebase.initializeApp({
  apiKey: 'AIzaSyAdUkbJTH1yPNGz1yZ2vyC0dXHWgnSabgg',
  authDomain: 'saya-industrial.firebaseapp.com',
  projectId: 'saya-industrial',
  storageBucket: 'saya-industrial.firebasestorage.app',
  messagingSenderId: '256650571457',
  appId: '1:256650571457:web:454afbda01bebeab886e40',
});

const messaging = firebase.messaging();

const URL_MAP = {
  task: '/tasks',
  task_complete: '/tasks',
  payment: '/payments',
  enquiry: '/enquiries',
  followup: '/follow-ups',
  rgp: '/rgp',
  general: '/dashboard',
};

messaging.onBackgroundMessage((payload) => {
  const title =
    payload.notification?.title ||
    payload.data?.title ||
    'Saya Industrial';

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    'You have a new update.';

  const type = payload.data?.type || 'general';
  const targetUrl = URL_MAP[type] || '/dashboard';

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `saya-${type}-${Date.now()}`,
    data: { ...payload.data, url: targetUrl },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/dashboard';
  const fullUrl = self.registration.scope.replace(/\/$/, '') + targetUrl;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }

        return undefined;
      }),
  );
});

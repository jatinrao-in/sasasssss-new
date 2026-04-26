import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

async function recoverAdminRouteFromPwaShell() {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/admin')) {
    return false;
  }

  const registrations = ('serviceWorker' in navigator)
    ? await navigator.serviceWorker.getRegistrations()
    : [];

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  window.location.replace('/admin/');
  return true;
}

void recoverAdminRouteFromPwaShell().then((handled) => {
  if (handled) {
    return;
  }

  // Aggressive auto-update polling for Service Worker
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      // Poll every 1 minute for a new Service Worker
      r && setInterval(async () => {
        if (r.installing || !navigator.onLine) return;

        try {
          // Fetch sw.js with cache busting
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache': 'no-store', 'cache-control': 'no-cache' },
          });
          if (resp?.status === 200) {
            await r.update();
          }
        } catch {
          // Ignore fetch errors (offline, etc)
        }
      }, 60 * 1000);
    },
  });

  // Force reload when a new service worker takes over
  let refreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

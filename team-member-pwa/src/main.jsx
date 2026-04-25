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

  registerSW({ immediate: true });

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

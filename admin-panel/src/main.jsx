import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register Service Worker with automatic update checks
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, r) {
    r && setInterval(async () => {
      if (r.installing || !navigator.onLine) return;
      try {
        const resp = await fetch(swUrl, {
          cache: 'no-store',
          headers: { 'cache': 'no-store', 'cache-control': 'no-cache' },
        });
        if (resp?.status === 200) {
          await r.update();
        }
      } catch (err) {
        // ignore errors
      }
    }, 60 * 1000);
  },
});

// Force reload when new service worker takes over
let refreshing = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')).render(
 <StrictMode>
 <App />
 </StrictMode>,
)

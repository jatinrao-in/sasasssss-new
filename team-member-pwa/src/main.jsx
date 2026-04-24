import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ✅ firebase-messaging-sw.js is registered inside usePushNotifications.js
// with explicit serviceWorkerRegistration passed to getToken().
// The Workbox PWA SW (sw.js) is registered by vite-plugin-pwa automatically.
// Do NOT call registerSW here — UpdatePrompt in App.jsx owns that lifecycle.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

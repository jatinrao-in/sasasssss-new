import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

const updateSW = registerSW({
  onNeedRefresh() {
    void updateSW(true);
  },
  onOfflineReady() {
    // Silent install: no popup or toast.
  },
  onRegistered(swRegistration) {
    if (swRegistration) {
      window.setInterval(() => {
        void swRegistration.update();
      }, 60 * 1000);
    }
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

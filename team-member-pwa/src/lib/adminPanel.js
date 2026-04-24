const LOCAL_ADMIN_PANEL_URL = 'http://localhost:5173/admin/';
const FIREBASE_PWA_HOST = 'saya-industrial-pwa.web.app';
const FIREBASE_ADMIN_PANEL_URL = 'https://saya-industrial.web.app';

export function getAdminPanelUrl() {
  const configuredUrl = import.meta.env.VITE_ADMIN_PANEL_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return FIREBASE_ADMIN_PANEL_URL;
  }

  const { hostname, origin } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_ADMIN_PANEL_URL;
  }

  if (hostname === FIREBASE_PWA_HOST) {
    return FIREBASE_ADMIN_PANEL_URL;
  }

  return new URL('/admin/', origin).toString();
}

export function redirectToAdminPanel() {
  if (typeof window === 'undefined') {
    return;
  }

  const adminPanelUrl = getAdminPanelUrl();

  if (window.location.href !== adminPanelUrl) {
    window.location.replace(adminPanelUrl);
  }
}

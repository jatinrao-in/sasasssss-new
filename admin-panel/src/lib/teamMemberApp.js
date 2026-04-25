export function getPwaUrl() {
  const configuredUrl = import.meta.env.VITE_PWA_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return '/';
  }

  return new URL('/', window.location.origin).toString();
}

export function redirectToPwa() {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.replace(getPwaUrl());
}

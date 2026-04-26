import { useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 60 * 1000;
const INITIAL_DELAY_MS = 15 * 1000;
const RELOAD_TARGET_KEY = 'saya:auto-update:admin-target';

function getVersionUrl() {
  return new URL(`version.json?t=${Date.now()}`, window.location.origin + import.meta.env.BASE_URL);
}

async function fetchLatestBuildId() {
  const response = await fetch(getVersionUrl(), {
    cache: 'no-store',
    headers: {
      'cache-control': 'no-cache',
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return String(payload?.buildId || '').trim() || null;
}

export default function AutoUpdateHandler() {
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const currentBuildId = String(__APP_BUILD_ID__ || '').trim();

    const clearReloadTarget = () => {
      if (window.sessionStorage.getItem(RELOAD_TARGET_KEY) === currentBuildId) {
        window.sessionStorage.removeItem(RELOAD_TARGET_KEY);
      }
    };

    let disposed = false;

    const checkForUpdate = async () => {
      if (
        disposed
        || inFlightRef.current
        || document.visibilityState === 'hidden'
        || import.meta.env.DEV
      ) {
        return;
      }

      inFlightRef.current = true;

      try {
        const latestBuildId = await fetchLatestBuildId();

        if (!latestBuildId || latestBuildId === currentBuildId) {
          clearReloadTarget();
          return;
        }

        if (window.sessionStorage.getItem(RELOAD_TARGET_KEY) === latestBuildId) {
          return;
        }

        window.sessionStorage.setItem(RELOAD_TARGET_KEY, latestBuildId);

        if (!disposed) {
          window.location.reload();
        }
      } catch (error) {
        console.warn('Auto-update check failed:', error);
      } finally {
        inFlightRef.current = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      }
    };

    clearReloadTarget();

    const intervalId = window.setInterval(() => {
      void checkForUpdate();
    }, CHECK_INTERVAL_MS);

    const timeoutId = window.setTimeout(() => {
      void checkForUpdate();
    }, INITIAL_DELAY_MS);

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}

import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export default function UpdatePrompt() {
  useEffect(() => {
    let updateTimerId;

    const updateSW = registerSW({
      onNeedRefresh() {
        void updateSW(true).catch(() => {
          window.location.reload();
        });
      },
      onOfflineReady() {
        // Silent install: no popup or toast.
      },
      onRegistered(registration) {
        if (registration) {
          updateTimerId = window.setInterval(() => {
            void registration.update();
          }, 30 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.error('SW registration error:', error);
      },
    });

    return () => {
      if (updateTimerId) {
        window.clearInterval(updateTimerId);
      }
    };
  }, []);

  return null;
}

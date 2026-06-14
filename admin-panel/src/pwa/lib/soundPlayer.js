export const playNotificationSound = () => {
  try {
    const isMuted = localStorage.getItem('pwa_notification_sound_disabled') === 'true';
    if (isMuted) return;

    const audio = new Audio('/sounds/notification.mp3');
    // Volume control and play
    audio.volume = 1.0;
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
          (function(){})('Notification sound played');
        })
        .catch(error => {
          // Auto-play was prevented
          (function(){})('Audio playback prevented by browser policy:', error);
        });
    }
  } catch (err) {
    console.error('Error playing sound:', err);
  }
};

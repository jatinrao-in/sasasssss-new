export const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    // Volume control and play
    audio.volume = 1.0;
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
          console.log('Notification sound played');
        })
        .catch(error => {
          // Auto-play was prevented
          console.log('Audio playback prevented by browser policy:', error);
        });
    }
  } catch (err) {
    console.error('Error playing sound:', err);
  }
};

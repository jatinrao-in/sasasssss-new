// Shared Firebase configuration for both Vite clients.
//
// Firebase Console setup checklist:
// 1. Authentication -> Sign-in method -> enable Email/Password.
// 2. Firestore Database -> create the database and deploy /firestore.rules.
// 3. Functions -> deploy the callable and trigger functions from /functions.
// 4. Hosting -> confirm the admin and PWA targets in /.firebaserc.
export const firebaseConfig = {
  apiKey: 'AIzaSyAdUkbJTH1yPNGz1yZ2vyC0dXHWgnSabgg',
  authDomain: 'saya-industrial.firebaseapp.com',
  databaseURL: 'https://saya-industrial-default-rtdb.firebaseio.com',
  projectId: 'saya-industrial',
  storageBucket: 'saya-industrial.firebasestorage.app',
  messagingSenderId: '256650571457',
  appId: '1:256650571457:web:454afbda01bebeab886e40',
};

export const firebaseEmulatorConfig = {
  authPort: 9099,
  firestorePort: 8080,
  functionsPort: 5001,
  host: '127.0.0.1',
};

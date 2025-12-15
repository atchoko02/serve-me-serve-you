// Firebase Client SDK configuration (for frontend)
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase configuration
// In production, these would come from environment variables
// For now, using the same project ID as backend
// Note: In Vite, use import.meta.env instead of process.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "serve-me-serve-you.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "serve-me-serve-you",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "serve-me-serve-you.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123",
};

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth
export const auth: Auth = getAuth(app);
// Ensure auth persists across tabs/reloads
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Failed to set auth persistence, falling back to default:', err);
});

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Connect to emulators if in development
// In development mode, always try to use emulators unless explicitly disabled
const isDev = import.meta.env.DEV;
const emulatorEnv = import.meta.env.VITE_USE_FIREBASE_EMULATOR;
const useEmulator = emulatorEnv === 'true' || (isDev && emulatorEnv !== 'false');

if (useEmulator) {
  // Try to connect to emulators, but don't fail if they're not running
  // The app will fall back to localStorage-based IDs if emulator is unavailable
  try {
    // Check if already connected
    const authConfig = (auth as any)._delegate?._config;
    if (!authConfig?.emulator) {
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        console.log('✅ Connected to Firebase Auth emulator at http://localhost:9099');
      } catch (connectError: any) {
        if (connectError?.message?.includes('already been called')) {
          console.log('Firebase Auth emulator already connected');
        } else {
          throw connectError;
        }
      }
    }
  } catch (error: any) {
    // Emulator connection failed - app will use fallback authentication
    console.info('ℹ️ Firebase Auth emulator not available (app will use fallback authentication)');
    console.info('   To use emulator, run: cd backend && firebase emulators:start');
  }

  try {
    const dbSettings = (db as any)._delegate?._settings;
    if (!dbSettings?.host?.includes('localhost')) {
      try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('✅ Connected to Firestore emulator at localhost:8080');
      } catch (connectError: any) {
        if (connectError?.message?.includes('already been called')) {
          console.log('Firestore emulator already connected');
        } else {
          throw connectError;
        }
      }
    }
  } catch (error: any) {
    // Emulator connection failed - app will use fallback
    console.info('ℹ️ Firestore emulator not available (app will use fallback)');
  }
} else {
  console.log('Using production Firebase (emulator disabled)');
}

export { app };


/**
 * Firebase JS SDK initialization for Nook.
 *
 * The values below are the Web config from Firebase Console — they are NOT
 * secrets in the credentials sense (they ship in every Firebase web app) and
 * are safe to commit. Security comes from Firebase Auth rules and OAuth
 * client restrictions, not from hiding the API key.
 *
 * One prerequisite before this works at runtime:
 *   npx expo install @react-native-async-storage/async-storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCGXcxGPfxMceR2UHFau_IJYy6f1zl6mHc',
  authDomain: 'nook-dev-mobile.firebaseapp.com',
  projectId: 'nook-dev-mobile',
  storageBucket: 'nook-dev-mobile.firebasestorage.app',
  messagingSenderId: '989000273329',
  appId: '1:989000273329:web:d66701e846dcbac2f2c190',
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth wires the AsyncStorage persistence layer so signed-in users
// remain signed in across app restarts. It throws if called more than once
// (e.g. on Fast Refresh) — the catch falls back to the existing instance.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { app, auth };

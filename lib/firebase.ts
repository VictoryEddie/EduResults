import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getPerformance } from "firebase/performance";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Use modern persistent cache with multi-tab support
const dbInstance = (() => {
  if (typeof window !== "undefined") {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      console.warn("Firestore initialization with persistence failed, falling back:", e);
      return getFirestore(app);
    }
  }
  return getFirestore(app);
})();

export const db = dbInstance;

// Analytics and Performance only run in the browser (not during SSR)
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      try {
        getAnalytics(app);
        getPerformance(app);
      } catch (e) {
        console.warn("Firebase Analytics/Performance failed to initialize:", e);
      }
    }
  });
}

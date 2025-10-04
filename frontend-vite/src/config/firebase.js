import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Determine authDomain dynamically: prefer environment variable, but in
// production use the current hostname (useful when deploying to Railway)
const envAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
let computedAuthDomain = envAuthDomain;

if (!import.meta.env.DEV) {
  try {
    const host =
      typeof window !== "undefined" ? window.location.hostname : null;
    // If the app is running on a Railway host (or other custom host) and the
    // env auth domain is a firebaseapp domain, prefer the current hostname
    // so that Firebase's referer checks accept the request — assuming you
    // added the hostname to Authorized Domains in the Firebase Console.
    if (host && host.includes("railway.app")) {
      computedAuthDomain = host;
      console.log("🔥 Using runtime host as authDomain:", computedAuthDomain);
    }
  } catch (err) {
    console.warn(
      "⚠️ Could not compute runtime hostname for authDomain fallback:",
      err
    );
  }
}

// Firebase config using Vite environment variables (with computed authDomain)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: envAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Production/Development mode logging
if (import.meta.env.DEV) {
  console.log("🔥 Firebase initialized in development mode");
  console.log("📍 Auth Domain:", firebaseConfig.authDomain);
} else {
  console.log("🔥 Firebase initialized in production mode");
  console.log("📍 Auth Domain:", firebaseConfig.authDomain);
  console.log(
    "🌐 Current URL:",
    typeof window !== "undefined" ? window.location.origin : "(no window)"
  );
}

// Runtime check: if in production and the current host doesn't match the
// configured authDomain (or is not listed as an authorized domain), log a
// clear actionable warning to the console for the developer / deployer.
if (!import.meta.env.DEV) {
  try {
    const host =
      typeof window !== "undefined" ? window.location.hostname : null;
    if (
      host &&
      envAuthDomain &&
      !host.includes(envAuthDomain) &&
      !envAuthDomain.includes(host)
    ) {
      console.warn(
        `⚠️ Firebase authDomain (${envAuthDomain}) does not match current host (${host}). If login fails, add the host (${host}) to Authorized Domains in the Firebase Console.`
      );
    }
  } catch (err) {
    console.warn("⚠️ Error while checking runtime host vs authDomain:", err);
  }
}

export default app;

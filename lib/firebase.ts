// Firebase client singleton for passwordless auth. The web config is public by
// design (it identifies the project, it is not a secret) and comes from
// NEXT_PUBLIC_FIREBASE_* env vars so the same code runs locally and on Vercel.
//
// Auth product status: the project (homing-app-40894) is provisioned and this
// config is live, but the Authentication product must be enabled once in the
// Firebase console ("Get started") — free-tier projects cannot enable it via
// API. Until then, getFirebaseAuth() still returns a client; the sign-in calls
// will surface a clear CONFIGURATION_NOT_FOUND until the product is on.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// True only when the public config is actually present — lets the UI degrade
// gracefully (and the existing flow keep working) if env is missing.
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

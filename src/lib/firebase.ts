import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
} from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missingKeys = requiredKeys.filter((key) => !import.meta.env[key]);

/** True when all Firebase web config vars are set in .env */
export const isFirebaseConfigured = missingKeys.length === 0;

function getFirebaseConfig() {
  if (isFirebaseConfigured) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
  }

  console.warn(
    `[Itemile] Firebase env not configured (${missingKeys.join(", ")}). ` +
      "Add VITE_FIREBASE_* variables in Vercel → Settings → Environment Variables, then redeploy."
  );
  return {
    apiKey: "demo-api-key",
    authDomain: "itemile-dev.firebaseapp.com",
    projectId: "itemile-dev",
    storageBucket: "itemile-dev.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:000000000000",
  };
}

const app: FirebaseApp = initializeApp(getFirebaseConfig());

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app);

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
if (useEmulators && import.meta.env.DEV && isFirebaseConfigured) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export { serverTimestamp, httpsCallable };
export default app;

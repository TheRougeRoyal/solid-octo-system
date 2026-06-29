const admin = require("firebase-admin");
const path = require("path");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

let auth = null;
let db = null;

const hasCredentials = firebaseConfig.projectId && !firebaseConfig.projectId.includes("your_");

if (hasCredentials) {
  try {
    if (!admin.apps.length) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (serviceAccountPath) {
        const resolvedPath = path.resolve(serviceAccountPath);
        console.log(`[firebase] Loading service account from: ${resolvedPath}`);
        const serviceAccount = require(resolvedPath);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } else {
        admin.initializeApp({ projectId: firebaseConfig.projectId });
      }
    }
    auth = admin.auth();
    db = admin.firestore();
    console.log("[firebase] Admin SDK initialized successfully");
  } catch (err) {
    console.warn("[firebase] Admin SDK init failed, running without Firestore:", err.message);
  }
} else {
  console.warn("[firebase] No credentials found — running without Firestore (DB operations skipped)");
}

module.exports = { admin, auth, db, firebaseConfig };

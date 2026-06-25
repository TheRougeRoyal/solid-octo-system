const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// Uses the project credentials from your Firebase project.
// In production, use environment variables or a service account JSON file.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize the app with Application Default Credentials (ADC)
// This works locally with `gcloud auth application-default login`
// and in production via GOOGLE_APPLICATION_CREDENTIALS env var.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const auth = admin.auth();

module.exports = { admin, auth, firebaseConfig };

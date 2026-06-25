const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };

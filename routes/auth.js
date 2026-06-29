const express = require("express");
const { auth } = require("../config/firebase");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
//
// Register a new user with email and password.
// The client should call Firebase's createUserWithEmailAndPassword() and
// then POST the resulting idToken here for server-side verification.
//
// Request:  { idToken: "<firebase id token>" }
// Response: { uid, email, displayName }
// ---------------------------------------------------------------------------

router.post("/api/auth/register", async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Missing idToken in request body" });
    }

    if (!auth) {
      return res.json({
        uid: "dev-user-local",
        email: "dev@localhost",
        displayName: "Dev User",
        photoURL: null,
      });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const userRecord = await auth.getUser(decoded.uid);

    return res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
    });
  } catch (err) {
    console.error("[auth/register] Error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
//
// Verify an existing user's token (login is handled client-side via
// Firebase SDK, then we verify here).
//
// Request:  { idToken: "<firebase id token>" }
// Response: { uid, email, displayName }
// ---------------------------------------------------------------------------

router.post("/api/auth/login", async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Missing idToken in request body" });
    }

    if (!auth) {
      return res.json({
        uid: "dev-user-local",
        email: "dev@localhost",
        displayName: "Dev User",
        photoURL: null,
      });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const userRecord = await auth.getUser(decoded.uid);

    return res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
    });
  } catch (err) {
    console.error("[auth/login] Error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
//
// Return the current authenticated user's profile.
// Requires: Authorization: Bearer <idToken>
// ---------------------------------------------------------------------------

router.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    if (!auth) {
      return res.json({
        uid: req.user.uid,
        email: req.user.email,
        displayName: "Dev User",
        photoURL: null,
        emailVerified: false,
      });
    }

    const userRecord = await auth.getUser(req.user.uid);

    return res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
    });
  } catch (err) {
    console.error("[auth/me] Error:", err.message);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
//
// Revoke the user's refresh token so all sessions are invalidated.
// Requires: Authorization: Bearer <idToken>
// ---------------------------------------------------------------------------

router.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    if (!auth) {
      return res.json({ message: "Logged out successfully" });
    }

    await auth.revokeRefreshTokens(req.user.uid);
    return res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("[auth/logout] Error:", err.message);
    return res.status(500).json({ error: "Failed to revoke tokens" });
  }
});

module.exports = router;

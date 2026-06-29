const { auth } = require("../lib/firebase");
const { requireAuth } = require("../lib/auth");
const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.searchParams.get("path") || url.pathname.replace(/^\/api\/auth/, "").replace(/\/$/, "");

  if (path === "/login" || path === "/register") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
      const { idToken } = req.body;
      if (!idToken) return res.status(400).json({ error: "Missing idToken" });

      if (!auth) {
        return res.status(200).json({
          uid: "dev-user-local",
          email: "dev@localhost",
          displayName: "Dev User",
          photoURL: null,
        });
      }

      const decoded = await auth.verifyIdToken(idToken);
      const userRecord = await auth.getUser(decoded.uid);

      return res.status(200).json({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
      });
    } catch (err) {
      console.error("[auth]", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  if (path === "/me") {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const user = await requireAuth(req, res);
    if (!user) return;

    if (!auth) {
      return res.status(200).json({
        uid: user.uid,
        email: user.email,
        displayName: "Dev User",
        photoURL: null,
        emailVerified: false,
      });
    }

    try {
      const userRecord = await auth.getUser(user.uid);
      return res.status(200).json({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        emailVerified: userRecord.emailVerified,
      });
    } catch (err) {
      console.error("[auth/me]", err.message);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }
  }

  if (path === "/logout") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const user = await requireAuth(req, res);
    if (!user) return;

    if (!auth) return res.status(200).json({ message: "Logged out successfully" });

    try {
      await auth.revokeRefreshTokens(user.uid);
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
      console.error("[auth/logout]", err.message);
      return res.status(500).json({ error: "Failed to revoke tokens" });
    }
  }

  return res.status(404).json({ error: "Not found" });
};

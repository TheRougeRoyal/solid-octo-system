const { requireAuth } = require("../lib/auth");
const { auth } = require("../lib/firebase");
const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!auth) {
    return res.status(200).json({ message: "Logged out successfully" });
  }

  try {
    await auth.revokeRefreshTokens(user.uid);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("[auth/logout]", err.message);
    return res.status(500).json({ error: "Failed to revoke tokens" });
  }
};

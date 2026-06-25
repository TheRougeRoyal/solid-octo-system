const { requireAuth } = require("../lib/auth");
const { auth } = require("../lib/firebase");
const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

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
};

const { auth } = require("../lib/firebase");
const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Missing idToken" });
    }

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
    console.error("[auth/register]", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

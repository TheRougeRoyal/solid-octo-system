const { auth } = require("./firebase");

async function verifyToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.split("Bearer ")[1];
  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}

async function requireAuth(req, res) {
  const user = await verifyToken(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}

module.exports = { verifyToken, requireAuth };

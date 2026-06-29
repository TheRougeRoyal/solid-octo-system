const { auth } = require("./firebase");

const DEV_USER = { uid: "dev-user-local", email: "dev@localhost" };

async function verifyToken(req) {
  if (!auth) return DEV_USER;

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

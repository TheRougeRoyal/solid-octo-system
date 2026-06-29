const { auth } = require("../config/firebase");

const DEV_USER = { uid: "dev-user-local", email: "dev@localhost" };

async function authenticateToken(req, res, next) {
  if (!auth) {
    req.user = DEV_USER;
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error("[auth] Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function optionalAuth(req, _res, next) {
  if (!auth) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    req.user = await auth.verifyIdToken(idToken);
  } catch {
    // Token invalid — proceed without user context
  }

  next();
}

module.exports = { authenticateToken, optionalAuth };

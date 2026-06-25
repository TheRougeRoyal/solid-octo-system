const { auth } = require("../config/firebase");

// ---------------------------------------------------------------------------
// authenticateToken middleware
// ---------------------------------------------------------------------------
//
// Extracts the Bearer token from the Authorization header, verifies it
// against Firebase, and attaches the decoded user to req.user.
//
// Usage:  router.get("/protected", authenticateToken, handler)
// ---------------------------------------------------------------------------

async function authenticateToken(req, res, next) {
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

// ---------------------------------------------------------------------------
// optionalAuth middleware
// ---------------------------------------------------------------------------
//
// Same as authenticateToken but does NOT reject unauthenticated requests.
// If a valid token is present, req.user is set; otherwise it's undefined.
//
// Usage:  router.get("/public-but-personalised", optionalAuth, handler)
// ---------------------------------------------------------------------------

async function optionalAuth(req, _res, next) {
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

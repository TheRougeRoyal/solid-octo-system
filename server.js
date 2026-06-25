require("dotenv").config();

const express = require("express");
const cors = require("cors");
const resumeRouter = require("./routes/resume");
const pdfRouter = require("./routes/pdf");
const authRouter = require("./routes/auth");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] ${req.method} ${req.originalUrl} | ip=${req.ip}`
  );
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: NODE_ENV,
  });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "AI Resume Optimizer API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      upload: "POST /api/resume/upload",
      process: "POST /api/resume/process",
      processSection: "POST /api/resume/process-section",
      generatePdf: "POST /api/generate-pdf",
      previewPdf: "POST /api/preview-pdf",
    },
  });
});

// ---------------------------------------------------------------------------
// Resume routes
// ---------------------------------------------------------------------------

app.use(resumeRouter);
app.use(pdfRouter);
app.use(authRouter);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------
// Global error handler (LAST middleware)
// ---------------------------------------------------------------------------

app.use(errorHandler);

// ---------------------------------------------------------------------------
// Server start
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log("");
  console.log("==============================================");
  console.log("  AI Resume Optimizer Server");
  console.log("==============================================");
  console.log(`  Status   : running`);
  console.log(`  Port     : ${PORT}`);
  console.log(`  Env      : ${NODE_ENV}`);
  console.log(`  CORS     : ${CORS_ORIGIN}`);
  console.log(`  Health   : http://localhost:${PORT}/health`);
  console.log(`  API Info : http://localhost:${PORT}/api`);
  console.log("==============================================");
  console.log("");
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal) {
  console.log(`\n[${new Date().toISOString()}] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });

  // Force exit after 5 s if connections hang
  setTimeout(() => {
    console.error(`[${new Date().toISOString()}] Forced exit after timeout`);
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
});

process.on("uncaughtException", (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught exception:`, err);
  shutdown("uncaughtException");
});

module.exports = app;

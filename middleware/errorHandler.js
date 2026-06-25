const multer = require("multer");

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

const ERROR_CODES = {
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  FILE_TYPE_REJECTED: "FILE_TYPE_REJECTED",
  UPLOAD_LIMIT: "UPLOAD_LIMIT",
  PDF_PARSE_FAILED: "PDF_PARSE_FAILED",
  PDF_EMPTY: "PDF_EMPTY",
  API_KEY_MISSING: "API_KEY_MISSING",
  API_REQUEST_FAILED: "API_REQUEST_FAILED",
  API_NO_CHOICES: "API_NO_CHOICES",
  API_PARSE_FAILED: "API_PARSE_FAILED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

// ---------------------------------------------------------------------------
// Custom AppError class
// ---------------------------------------------------------------------------

class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = "AppError";
    this.status = statusCode;
    this.code = code;
    this.details = details || null;
  }
}

// ---------------------------------------------------------------------------
// Error handler middleware
// ---------------------------------------------------------------------------
//
// Registered as the LAST middleware in Express.  All errors thrown or passed
// via next(err) end up here.  Each error type is mapped to an appropriate
// HTTP status and structured JSON response.
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const timestamp = new Date().toISOString();

  // ----- Multer errors (file upload) ---------------------------------------

  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: {
        status: 413,
        code: ERROR_CODES.FILE_TOO_LARGE,
        message: "Uploaded file exceeds the maximum allowed size",
      },
      LIMIT_FILE_COUNT: {
        status: 400,
        code: ERROR_CODES.UPLOAD_LIMIT,
        message: "Too many files uploaded",
      },
      LIMIT_UNEXPECTED_FILE: {
        status: 400,
        code: ERROR_CODES.FILE_TYPE_REJECTED,
        message: "Unexpected field name in file upload",
      },
      LIMIT_PART_COUNT: {
        status: 400,
        code: ERROR_CODES.UPLOAD_LIMIT,
        message: "Too many form parts",
      },
      LIMIT_FIELD_KEY: {
        status: 400,
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Field name too long",
      },
      LIMIT_FIELD_VALUE: {
        status: 400,
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Field value too long",
      },
      LIMIT_FIELDS: {
        status: 400,
        code: ERROR_CODES.UPLOAD_LIMIT,
        message: "Too many non-file fields",
      },
    };

    const mapped = map[err.code] || {
      status: 400,
      code: ERROR_CODES.VALIDATION_FAILED,
      message: err.message,
    };

    console.error(`[${timestamp}] [multer] ${mapped.code}: ${err.message}`);

    return res.status(mapped.status).json({
      error: mapped.message,
      code: mapped.code,
      details: err.field || null,
    });
  }

  // ----- Custom AppError ---------------------------------------------------

  if (err instanceof AppError) {
    console.error(`[${timestamp}] [app] ${err.code}: ${err.message}`);
    if (err.details) console.error(`[${timestamp}] [app] details:`, err.details);

    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details || undefined,
    });
  }

  // ----- PDF parsing errors ------------------------------------------------
  //
  // pdf-parse throws plain Error objects.  We detect them by inspecting the
  // message or stack for "pdf" keywords.

  const isPdfError =
    err.message &&
    (err.message.toLowerCase().includes("pdf") ||
      (err.stack && err.stack.toLowerCase().includes("pdf-parse")));

  if (isPdfError) {
    console.error(`[${timestamp}] [pdf] PDF_PARSE_FAILED: ${err.message}`);

    return res.status(422).json({
      error: "Failed to parse the uploaded PDF file",
      code: ERROR_CODES.PDF_PARSE_FAILED,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  // ----- OpenRouter API errors ---------------------------------------------
  //
  // Errors from utils/openRouterApi.js.  Detect by message patterns.

  if (err.message) {
    const msg = err.message;

    if (msg.includes("OPENROUTER_API_KEY")) {
      console.error(`[${timestamp}] [api] API_KEY_MISSING: ${msg}`);
      return res.status(500).json({
        error: "Server configuration error — API key not set",
        code: ERROR_CODES.API_KEY_MISSING,
      });
    }

    if (msg.includes("OpenRouter API returned")) {
      const statusMatch = msg.match(/returned (\d+)/);
      const upstreamStatus = statusMatch ? parseInt(statusMatch[1], 10) : 502;

      console.error(`[${timestamp}] [api] API_REQUEST_FAILED: ${msg}`);
      return res.status(502).json({
        error: "Upstream AI service returned an error",
        code: ERROR_CODES.API_REQUEST_FAILED,
        details: process.env.NODE_ENV === "development" ? msg : undefined,
      });
    }

    if (msg.includes("OpenRouter returned no choices")) {
      console.error(`[${timestamp}] [api] API_NO_CHOICES: ${msg}`);
      return res.status(502).json({
        error: "AI service returned an empty response",
        code: ERROR_CODES.API_NO_CHOICES,
      });
    }

    if (msg.includes("Could not parse JSON from OpenRouter")) {
      console.error(`[${timestamp}] [api] API_PARSE_FAILED: ${msg}`);
      return res.status(502).json({
        error: "Failed to parse AI service response",
        code: ERROR_CODES.API_PARSE_FAILED,
      });
    }
  }

  // ----- Validation errors -------------------------------------------------

  if (err.status === 400 || err.statusCode === 400) {
    console.error(`[${timestamp}] [validation] VALIDATION_FAILED: ${err.message}`);
    return res.status(400).json({
      error: err.message || "Validation failed",
      code: ERROR_CODES.VALIDATION_FAILED,
    });
  }

  // ----- 404 Not Found -----------------------------------------------------

  if (err.status === 404 || err.statusCode === 404) {
    return res.status(404).json({
      error: "Resource not found",
      code: ERROR_CODES.NOT_FOUND,
    });
  }

  // ----- Fallback: internal server error -----------------------------------

  console.error(`[${timestamp}] [server] INTERNAL_ERROR: ${err.message}`);
  if (process.env.NODE_ENV === "development") {
    console.error(`[${timestamp}] [server] stack:`, err.stack);
  }

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message || "Internal server error",
    code: ERROR_CODES.INTERNAL_ERROR,
    details:
      process.env.NODE_ENV === "development"
        ? { stack: err.stack }
        : undefined,
  });
}

module.exports = { errorHandler, AppError, ERROR_CODES };

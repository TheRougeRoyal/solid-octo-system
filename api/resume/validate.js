const { setCors, handleOptions } = require("../lib/cors");

const SECTIONS = ["summary", "skills", "experience", "projects", "education"];
const MIN_LENGTH = 10;

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resumeData } = req.body;

    if (!resumeData || typeof resumeData !== "object") {
      return res.status(400).json({ error: "Request body must contain a 'resumeData' object" });
    }

    const warnings = [];
    const sections = {};

    for (const key of SECTIONS) {
      const entry = resumeData[key];

      if (!entry || typeof entry !== "object") {
        sections[key] = { empty: true };
        warnings.push(`${key} is empty`);
        continue;
      }

      const edited = entry.edited;
      if (!edited || typeof edited !== "string") {
        sections[key] = { empty: true };
        warnings.push(`${key} is empty`);
        continue;
      }

      const trimmed = edited.trim();
      if (trimmed.length === 0) {
        sections[key] = { empty: true };
        warnings.push(`${key} is empty`);
        continue;
      }

      if (trimmed.length < MIN_LENGTH) {
        sections[key] = { valid: false, short: true, length: trimmed.length };
        warnings.push(`${key} is too short (${trimmed.length}/${MIN_LENGTH} chars)`);
        continue;
      }

      sections[key] = { valid: true, length: trimmed.length };
    }

    return res.status(200).json({ isValid: warnings.length === 0, warnings, sections });
  } catch (err) {
    console.error("[validate]", err);
    return res.status(500).json({ error: err.message || "Validation failed" });
  }
};

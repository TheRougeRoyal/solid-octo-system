const { requireAuth } = require("../lib/auth");
const { db } = require("../lib/firebase");
const { callOpenRouter } = require("../lib/openrouter");
const { RESUME_PROMPTS } = require("../lib/resume");
const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const { chunks, resumeId } = req.body;

    if (!chunks || typeof chunks !== "object") {
      return res.status(400).json({ error: "Request body must contain a 'chunks' object" });
    }

    const sectionKeys = Object.keys(RESUME_PROMPTS);
    const results = {};

    for (const key of sectionKeys) {
      const text = chunks[key];
      if (!text || typeof text !== "string" || text.trim().length === 0) continue;

      const { system, user: userPrompt } = RESUME_PROMPTS[key];
      const prompt = userPrompt.replace(/\{text\}/g, text);

      try {
        results[key] = await callOpenRouter(system, prompt);
      } catch (err) {
        results[key] = {
          original: text,
          edited: text,
          suggestions: [],
          reasoning: `Optimisation failed: ${err.message}`,
        };
      }
    }

    if (resumeId && db) {
      const { FieldValue } = require("firebase-admin/firestore");
      const ref = db.collection("users").doc(user.uid).collection("resumes").doc(resumeId);
      const doc = await ref.get();
      if (doc.exists) {
        await ref.update({
          suggestions: results,
          status: "processed",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return res.status(200).json({
      resumeId: resumeId || null,
      suggestions: results,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[process]", err);
    return res.status(500).json({ error: err.message || "Processing failed" });
  }
};

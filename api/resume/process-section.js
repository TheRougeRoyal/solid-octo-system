const { requireAuth } = require("../lib/auth");
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
    const { section, content } = req.body;

    if (!section || typeof section !== "string") {
      return res.status(400).json({ error: "Request body must contain a 'section' string" });
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Request body must contain a non-empty 'content' string" });
    }

    const prompt = RESUME_PROMPTS[section];
    if (!prompt) {
      return res.status(400).json({
        error: `Unknown section "${section}". Valid: ${Object.keys(RESUME_PROMPTS).join(", ")}`,
      });
    }

    const userPrompt = prompt.user.replace(/\{text\}/g, content);
    const result = await callOpenRouter(prompt.system, userPrompt);

    return res.status(200).json(result);
  } catch (err) {
    console.error("[process-section]", err);
    return res.status(502).json({ error: `Optimisation failed: ${err.message}` });
  }
};

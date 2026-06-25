const { buildPdf } = require("./lib/pdf");
const { setCors, handleOptions } = require("./lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resumeData } = req.body;
    if (!resumeData || typeof resumeData !== "object") {
      return res.status(400).json({ error: "Missing or invalid 'resumeData'" });
    }

    const pdfBytes = await buildPdf(resumeData);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    return res.status(200).json({ pdfBase64, size: pdfBytes.length });
  } catch (err) {
    console.error("[preview-pdf]", err);
    return res.status(500).json({ error: err.message || "PDF preview failed" });
  }
};

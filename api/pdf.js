const { v4: uuidv4 } = require("uuid");
const { buildPdf } = require("./lib/pdf");
const { setCors, handleOptions } = require("./lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const isPreview = url.searchParams.get("action") === "preview" || url.pathname.includes("preview");

  try {
    const { resumeData } = req.body;
    if (!resumeData || typeof resumeData !== "object") {
      return res.status(400).json({ error: "Missing or invalid 'resumeData'" });
    }

    const pdfBytes = await buildPdf(resumeData);

    if (isPreview) {
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
      return res.status(200).json({ pdfBase64, size: pdfBytes.length });
    }

    const filename = `resume_optimized_${uuidv4()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("[pdf]", err);
    return res.status(500).json({ error: err.message || "PDF generation failed" });
  }
};

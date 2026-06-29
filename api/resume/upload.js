const pdfParse = require("pdf-parse");
const { formidable } = require("formidable");
const { requireAuth } = require("../../lib/auth");
const { db } = require("../../lib/firebase");
const { smartChunkResume } = require("../../lib/resume");
const { setCors, handleOptions } = require("../../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024,
      filter: ({ mimetype }) => {
        if (mimetype !== "application/pdf") {
          const err = new Error("Only PDF files are accepted");
          err.httpCode = 400;
          return false;
        }
        return true;
      },
    });

    const [fields, files] = await form.parse(req);
    const file = files.resume?.[0];

    if (!file) {
      return res.status(400).json({ error: "No file uploaded. Only PDF files are accepted." });
    }

    const fs = require("fs");
    let buffer;
    try {
      buffer = fs.readFileSync(file.filepath);
    } finally {
      try { fs.unlinkSync(file.filepath); } catch (_) {}
    }
    const pdfData = await pdfParse(buffer);

    const rawText = pdfData.text;
    if (!rawText || rawText.trim().length === 0) {
      return res.status(422).json({
        error: "PDF contains no extractable text (is it a scanned image?)",
      });
    }

    const chunks = smartChunkResume(rawText);
    const chunkStats = {};
    for (const [key, text] of Object.entries(chunks)) {
      chunkStats[key] = text.length;
    }

    let resumeId = null;
    if (db) {
      const { FieldValue } = require("firebase-admin/firestore");
      const resumeRef = db.collection("users").doc(user.uid).collection("resumes").doc();
      await resumeRef.set({
        uid: user.uid,
        fileName: file.originalFilename || "resume.pdf",
        rawText,
        chunks,
        chunkStats,
        status: "uploaded",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      resumeId = resumeRef.id;
    }

    return res.status(200).json({
      resumeId,
      fileName: file.originalFilename || "resume.pdf",
      rawText,
      chunks,
      chunkStats,
    });
  } catch (err) {
    console.error("[upload]", err);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
};

module.exports.config = {
  api: { bodyParser: false },
};

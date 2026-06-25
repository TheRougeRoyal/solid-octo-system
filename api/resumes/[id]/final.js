const { requireAuth } = require("../../lib/auth");
const { db } = require("../../lib/firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { setCors, handleOptions } = require("../../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  try {
    const { finalData } = req.body;
    if (!finalData || typeof finalData !== "object") {
      return res.status(400).json({ error: "Request body must contain a 'finalData' object" });
    }

    const ref = db.collection("users").doc(user.uid).collection("resumes").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Resume not found" });
    }

    await ref.update({
      finalData,
      status: "completed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ message: "Resume saved" });
  } catch (err) {
    console.error("[resume final]", err);
    return res.status(500).json({ error: err.message || "Failed to save" });
  }
};

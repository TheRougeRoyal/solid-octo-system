const { requireAuth } = require("../lib/auth");
const { db } = require("../lib/firebase");
const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  if (!db) {
    return res.status(404).json({ error: "Resume not found (no database)" });
  }

  const ref = db.collection("users").doc(user.uid).collection("resumes").doc(id);

  try {
    if (req.method === "GET") {
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Resume not found" });
      }
      return res.status(200).json({ id: doc.id, ...doc.data() });
    }

    if (req.method === "DELETE") {
      const doc = await ref.get();
      if (!doc.exists) {
        return res.status(404).json({ error: "Resume not found" });
      }
      await ref.delete();
      return res.status(200).json({ message: "Resume deleted" });
    }
  } catch (err) {
    console.error("[resume by id]", err);
    return res.status(500).json({ error: err.message || "Failed" });
  }
};

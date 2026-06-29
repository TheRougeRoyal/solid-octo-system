const { requireAuth } = require("./lib/auth");
const { db } = require("./lib/firebase");
const { setCors, handleOptions } = require("./lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  const user = await requireAuth(req, res);
  if (!user) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const resumeId = url.searchParams.get("id") || null;
  const sub = url.searchParams.get("sub") || null;

  if (!db && (req.method === "GET" || req.method === "DELETE" || req.method === "PUT")) {
    if (!resumeId) return res.status(200).json({ resumes: [] });
    return res.status(404).json({ error: "Resume not found (no database)" });
  }

  if (req.method === "GET" && !resumeId) {
    try {
      const snapshot = await db
        .collection("users")
        .doc(user.uid)
        .collection("resumes")
        .orderBy("createdAt", "desc")
        .get();

      const resumes = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        resumes.push({
          id: doc.id,
          fileName: data.fileName,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
          sections: data.chunks ? Object.keys(data.chunks) : [],
        });
      });

      return res.status(200).json({ resumes });
    } catch (err) {
      console.error("[resumes list]", err);
      return res.status(500).json({ error: err.message || "Failed to list resumes" });
    }
  }

  if (req.method === "GET" && resumeId && !sub) {
    try {
      const doc = await db
        .collection("users")
        .doc(user.uid)
        .collection("resumes")
        .doc(resumeId)
        .get();

      if (!doc.exists) return res.status(404).json({ error: "Resume not found" });
      return res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (err) {
      console.error("[resume get]", err);
      return res.status(500).json({ error: err.message || "Failed" });
    }
  }

  if (req.method === "DELETE" && resumeId && !sub) {
    try {
      const doc = await db
        .collection("users")
        .doc(user.uid)
        .collection("resumes")
        .doc(resumeId)
        .get();

      if (!doc.exists) return res.status(404).json({ error: "Resume not found" });
      await doc.ref.delete();
      return res.status(200).json({ message: "Resume deleted" });
    } catch (err) {
      console.error("[resume delete]", err);
      return res.status(500).json({ error: err.message || "Failed" });
    }
  }

  if (req.method === "PUT" && resumeId && sub === "final") {
    try {
      const { finalData } = req.body;
      if (!finalData || typeof finalData !== "object") {
        return res.status(400).json({ error: "Request body must contain a 'finalData' object" });
      }

      const { FieldValue } = require("firebase-admin/firestore");
      const ref = db.collection("users").doc(user.uid).collection("resumes").doc(resumeId);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: "Resume not found" });

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
  }

  return res.status(404).json({ error: "Not found" });
};

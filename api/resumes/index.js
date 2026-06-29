const { requireAuth } = require("../lib/auth");
const { db } = require("../lib/firebase");
const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  if (!db) {
    return res.status(200).json({ resumes: [] });
  }

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
};

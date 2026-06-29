const { requireAuth } = require("../../lib/auth");
const { db } = require("../../lib/firebase");
const { callOpenRouter } = require("../../lib/openrouter");
const { RESUME_PROMPTS } = require("../../lib/resume");
const { setCors, handleOptions } = require("../../lib/cors");

const MOCK_SUGGESTIONS = {
  summary: (original) => ({
    original,
    edited: "Results-driven software engineer with 5+ years of experience building scalable web applications and microservices. Architected a real-time data pipeline serving 2M+ daily active users with 99.9% uptime. Proficient in React, Node.js, TypeScript, and AWS, with a track record of reducing deployment time by 60% through CI/CD automation.",
    suggestions: [
      "Quantify impact with specific metrics (users, uptime, latency)",
      "Lead with years of experience and primary domain expertise",
      "Include top technical skills relevant to target role",
    ],
    reasoning: "Opens with measurable experience, highlights scale (2M+ users), and ends with a concrete achievement.",
  }),
  skills: (original) => ({
    original,
    edited: "Languages: JavaScript (ES6+), TypeScript, Python, SQL, HTML5/CSS3\nFrameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS, Redux\nTools & Platforms: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, Git, GitHub Actions, Terraform\nDatabases: PostgreSQL, MongoDB, Redis, DynamoDB\nMethodologies: Agile/Scrum, CI/CD, TDD, Microservices Architecture, REST APIs, GraphQL",
    suggestions: [
      "Group skills into clear categories for ATS parsing",
      "Use standardised names (e.g. 'JavaScript (ES6+)' not 'JS')",
      "Add implied skills like TypeScript when React is listed",
    ],
    reasoning: "Reorganised into 5 recruiter-friendly categories with consistent naming.",
  }),
  experience: (original) => ({
    original,
    edited: "Senior Software Engineer | TechCorp Inc. | Jan 2022 – Present\n• Architected a microservices platform on AWS (ECS + Lambda) serving 500K+ requests/day, reducing average response latency from 320ms to 85ms (73% improvement)\n• Led migration of legacy monolith to React + Node.js micro-frontend architecture, cutting frontend bundle size by 40% and improving Lighthouse score from 62 to 95\n• Implemented automated CI/CD pipeline using GitHub Actions and Terraform, reducing deployment frequency from bi-weekly to multiple times daily\n• Mentored a team of 4 junior engineers through code reviews and pair programming, increasing team velocity by 25%",
    suggestions: [
      "Start every bullet with a strong action verb (Architected, Led, Implemented)",
      "Quantify everything: users, requests/sec, latency reduction, cost savings",
      "Highlight specific tech stack usage inline for ATS keyword matching",
    ],
    reasoning: "Every bullet follows the XYZ formula with quantified outcomes.",
  }),
  projects: (original) => ({
    original,
    edited: "AI Resume Optimizer — Full-Stack Web Application\nBuilt an end-to-end resume optimisation platform using React, Node.js, and OpenAI API integration. Processes 500+ resumes weekly with AI-powered section-by-section analysis and PDF generation. Deployed on AWS with 99.9% uptime.\nTech: React, TypeScript, Node.js, PostgreSQL, AWS, Docker\n\nReal-Time Collaborative Editor — Open Source (2.1K GitHub Stars)\nDesigned a CRDT-based collaborative text editor supporting 100+ concurrent users with offline-first sync. Implemented operational transform conflict resolution and WebSocket real-time updates.\nTech: React, Y.js, WebSocket, Redis, Express",
    suggestions: [
      "Lead with the most impressive project (AI Resume Optimizer)",
      "Include quantified impact (users, stars, weekly volume)",
      "Call out specific technical challenges solved",
    ],
    reasoning: "Projects now have clear name-description-tech-impact structure.",
  }),
  education: (original) => ({
    original,
    edited: "Bachelor of Science in Computer Science\nUniversity of California, Berkeley | Graduated May 2019 | GPA: 3.7/4.0\n• Dean's List (6 semesters)\n• Relevant Coursework: Distributed Systems, Machine Learning, Database Systems, Algorithms\n\nCertifications:\n• AWS Certified Solutions Architect – Associate (2023)\n• Google Cloud Professional Cloud Developer (2022)",
    suggestions: [
      "Include GPA only because it exceeds 3.5 threshold",
      "Add relevant coursework that strengthens tech narrative",
      "Include industry certifications for credibility",
    ],
    reasoning: "Added GPA, relevant coursework, and certifications.",
  }),
};

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action") || "process";

  if (action === "demo") {
    try {
      const { chunks } = req.body;
      if (!chunks || typeof chunks !== "object") {
        return res.status(400).json({ error: "Request body must contain a 'chunks' object" });
      }

      const results = {};
      for (const [key, original] of Object.entries(chunks)) {
        if (!original || typeof original !== "string" || original.trim().length === 0) continue;
        const generator = MOCK_SUGGESTIONS[key];
        results[key] = generator
          ? generator(original)
          : { original, edited: original, suggestions: ["No mock data available"], reasoning: "Passed through unchanged" };
        await new Promise((r) => setTimeout(r, 200));
      }

      return res.status(200).json({
        resumeId: null,
        suggestions: results,
        processedAt: new Date().toISOString(),
        _demo: true,
      });
    } catch (err) {
      console.error("[demo]", err);
      return res.status(500).json({ error: err.message || "Demo processing failed" });
    }
  }

  if (action === "process-section") {
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
  }

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

const { requireAuth } = require("../lib/auth");
const { setCors, handleOptions } = require("../lib/cors");

const MOCK_SUGGESTIONS = {
  summary: (original) => ({
    original,
    edited: "Results-driven software engineer with 5+ years of experience building scalable web applications and microservices. Architected a real-time data pipeline serving 2M+ daily active users with 99.9% uptime. Proficient in React, Node.js, TypeScript, and AWS, with a track record of reducing deployment time by 60% through CI/CD automation.",
    suggestions: [
      "Quantify impact with specific metrics (users, uptime, latency)",
      "Lead with years of experience and primary domain expertise",
      "Include top technical skills relevant to target role",
    ],
    reasoning: "This version opens with measurable experience, highlights scale (2M+ users), and ends with a concrete achievement — making it significantly stronger for ATS and recruiter screening.",
  }),

  skills: (original) => ({
    original,
    edited: "Languages: JavaScript (ES6+), TypeScript, Python, SQL, HTML5/CSS3\nFrameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS, Redux\nTools & Platforms: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, Git, GitHub Actions, Terraform\nDatabases: PostgreSQL, MongoDB, Redis, DynamoDB\nMethodologies: Agile/Scrum, CI/CD, TDD, Microservices Architecture, REST APIs, GraphQL",
    suggestions: [
      "Group skills into clear categories for ATS parsing",
      "Use standardised names (e.g. 'JavaScript (ES6+)' not 'JS')",
      "Add implied skills like TypeScript when React is listed",
    ],
    reasoning: "Reorganised into 5 recruiter-friendly categories with consistent naming. Removed duplicates and added complementary skills (TypeScript, Docker) that are expected alongside the listed tech.",
  }),

  experience: (original) => ({
    original,
    edited: "Senior Software Engineer | TechCorp Inc. | Jan 2022 – Present\n• Architected a microservices platform on AWS (ECS + Lambda) serving 500K+ requests/day, reducing average response latency from 320ms to 85ms (73% improvement)\n• Led migration of legacy monolith to React + Node.js micro-frontend architecture, cutting frontend bundle size by 40% and improving Lighthouse score from 62 to 95\n• Implemented automated CI/CD pipeline using GitHub Actions and Terraform, reducing deployment frequency from bi-weekly to multiple times daily\n• Mentored a team of 4 junior engineers through code reviews and pair programming, increasing team velocity by 25%",
    suggestions: [
      "Start every bullet with a strong action verb (Architected, Led, Implemented)",
      "Quantify everything: users, requests/sec, latency reduction, cost savings",
      "Highlight specific tech stack usage inline for ATS keyword matching",
    ],
    reasoning: "Every bullet now follows the XYZ formula with quantified outcomes. Action verbs lead each statement, and the tech stack is mentioned inline, making this highly ATS-friendly.",
  }),

  projects: (original) => ({
    original,
    edited: "AI Resume Optimizer — Full-Stack Web Application\nBuilt an end-to-end resume optimisation platform using React, Node.js, and OpenAI API integration. Processes 500+ resumes weekly with AI-powered section-by-section analysis and PDF generation. Deployed on AWS with 99.9% uptime.\nTech: React, TypeScript, Node.js, PostgreSQL, AWS, Docker\n\nReal-Time Collaborative Editor — Open Source (2.1K GitHub Stars)\nDesigned a CRDT-based collaborative text editor supporting 100+ concurrent users with offline-first sync. Implemented operational transform conflict resolution and WebSocket real-time updates.\nTech: React, Y.js, WebSocket, Redis, Express",
    suggestions: [
      "Lead with the most impressive project (AI Resume Optimizer)",
      "Include quantified impact (users, stars, weekly volume)",
      "Call out specific technical challenges solved",
    ],
    reasoning: "Projects now have clear name-description-tech-impact structure. Each entry highlights scale (500+ resumes, 2.1K stars) and technical depth, making them stand out to recruiters.",
  }),

  education: (original) => ({
    original,
    edited: "Bachelor of Science in Computer Science\nUniversity of California, Berkeley | Graduated May 2019 | GPA: 3.7/4.0\n• Dean's List (6 semesters)\n• Relevant Coursework: Distributed Systems, Machine Learning, Database Systems, Algorithms\n\nCertifications:\n• AWS Certified Solutions Architect – Associate (2023)\n• Google Cloud Professional Cloud Developer (2022)",
    suggestions: [
      "Include GPA only because it exceeds 3.5 threshold",
      "Add relevant coursework that strengthens tech narrative",
      "Include industry certifications for credibility",
    ],
    reasoning: "Added GPA (3.7 qualifies), relevant coursework, and certifications. Removed any high school entries and kept formatting consistent for ATS parsing.",
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

  try {
    const { chunks } = req.body;

    if (!chunks || typeof chunks !== "object") {
      return res.status(400).json({
        error: "Request body must contain a 'chunks' object",
      });
    }

    const results = {};

    for (const [key, original] of Object.entries(chunks)) {
      if (!original || typeof original !== "string" || original.trim().length === 0) continue;

      const generator = MOCK_SUGGESTIONS[key];
      if (generator) {
        results[key] = generator(original);
      } else {
        results[key] = {
          original,
          edited: original,
          suggestions: ["No mock data available for this section"],
          reasoning: "Section passed through unchanged",
        };
      }

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
};

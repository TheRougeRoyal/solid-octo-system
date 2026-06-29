const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { callOpenRouter } = require("../utils/openRouterApi");
const { authenticateToken } = require("../middleware/auth");
const { db } = require("../config/firebase");

const router = express.Router();

// ---------------------------------------------------------------------------
// Multer configuration
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

// ---------------------------------------------------------------------------
// Section detection regex patterns
// ---------------------------------------------------------------------------
//
// Each pattern matches common resume header variants.  The matcher is
// case-insensitive and tolerates trailing colons, newlines or dashes.
//
// Patterns are ordered so that more-specific headers (e.g. "work experience")
// are tried before generic ones (e.g. "experience").  The first pattern that
// matches determines which bucket the section goes into.
// ---------------------------------------------------------------------------

const SECTION_PATTERNS = [
  {
    key: "summary",
    // Matches: "Professional Summary", "Summary", "Profile", "Objective",
    //          "Career Summary", "Executive Summary", "About Me"
    regex:
      /(?:professional\s+)?summary|^(?:career|executive)\s+summary|^(?:about\s+me)|^(?:profile|objective|career\s+objective)/im,
  },
  {
    key: "skills",
    // Matches: "Skills", "Technical Skills", "Core Competencies",
    //          "Key Skills", "Technologies", "Tech Stack", "Expertise"
    regex:
      /(?:technical\s+|core\s+|key\s+|relevant\s+)?skills|competencies|technologies|tech\s+stack|expertise|proficiencies/i,
  },
  {
    key: "experience",
    // Matches: "Experience", "Work Experience", "Employment History",
    //          "Professional Experience", "Career History", "Work History"
    regex:
      /(?:work|professional|employment)\s+experience|employment\s+history|career\s+(?:history|experience)|work\s+history|experience/i,
  },
  {
    key: "projects",
    // Matches: "Projects", "Key Projects", "Notable Projects",
    //          "Personal Projects", "Side Projects", "Project Experience"
    regex:
      /(?:key|notable|personal|side)\s+projects?|project\s+experience|projects?/i,
  },
  {
    key: "education",
    // Matches: "Education", "Academic Background", "Educational Background",
    //          "Qualifications", "Academic Qualifications"
    regex:
      /(?:academic|educational)\s+(?:background|qualification)|education|qualifications?/i,
  },
];

// ---------------------------------------------------------------------------
// smartChunkResume()
// ---------------------------------------------------------------------------
//
// Strategy:
//   1. Normalise whitespace – collapse runs of blank lines into a single
//      separator so we can split on double-newlines later.
//   2. Walk line-by-line.  For each line, test every SECTION_PATTERNS regex
//      to see if it is a section header.
//   3. When a header is found, flush the accumulated lines into the current
//      section bucket and start a new bucket.
//   4. Any text before the first recognised header is placed in "other"
//      (typically contact info / name).
//   5. After the loop, flush any remaining lines.
//
// The result is an object keyed by section name, each value being the raw
// text of that section (trimmed).
// ---------------------------------------------------------------------------

function smartChunkResume(rawText) {
  // Normalise line endings and collapse excessive blank lines
  const normalised = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  const lines = normalised.split("\n");

  const sections = {};
  let currentKey = "other"; // text before any header goes here
  let buffer = [];

  /**
   * Flush the current buffer into the sections map and reset.
   */
  function flush() {
    const text = buffer.join("\n").trim();
    if (text) {
      // If the key already exists (e.g. two "experience" sections), merge
      sections[currentKey] = sections[currentKey]
        ? sections[currentKey] + "\n\n" + text
        : text;
    }
    buffer = [];
  }

  /**
   * Test a line against all section patterns.  Returns the matched key or
   * null if the line is not a header.
   */
  function detectSectionHeader(line) {
    const trimmed = line.trim();

    // Skip very short or empty lines – unlikely to be headers
    if (trimmed.length < 2) return null;

    // Skip lines that look like bullet points or list items
    if (/^[\-•*●◆▪]\s/.test(trimmed)) return null;

    for (const { key, regex } of SECTION_PATTERNS) {
      // The regex must match the whole trimmed line (or at least the bulk
      // of it) to avoid false positives on resume body text that happens
      // to contain a keyword.
      if (regex.test(trimmed)) {
        return key;
      }
    }
    return null;
  }

  // ----- Main loop ----------------------------------------------------------

  for (const line of lines) {
    const headerKey = detectSectionHeader(line);

    if (headerKey) {
      // We found a new section header → save what we have so far and start
      // collecting into the new bucket.
      flush();
      currentKey = headerKey;
      // Do NOT push the header line itself into the buffer – we only want
      // the body text of each section.
    } else {
      buffer.push(line);
    }
  }

  // Flush any remaining lines after the last header
  flush();

  return sections;
}

// ---------------------------------------------------------------------------
// POST /api/resume/upload
// ---------------------------------------------------------------------------

router.post("/api/resume/upload", authenticateToken, upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uid = req.user.uid;
    console.log(`[upload] User ${uid} — received "${req.file.originalname}" (${req.file.size} bytes)`);

    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
    } catch (parseErr) {
      console.error(`[upload] PDF parse failed: ${parseErr.message}`);
      return res.status(422).json({ error: "Failed to parse PDF file" });
    }

    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(422).json({
        error: "PDF contains no extractable text (is it a scanned image?)",
      });
    }

    console.log(`[upload] Extracted ${rawText.length} chars, ${pdfData.numpages} page(s)`);

    const chunks = smartChunkResume(rawText);
    delete chunks.other;

    const chunkStats = {};
    for (const [key, text] of Object.entries(chunks)) {
      chunkStats[key] = text.length;
    }

    console.log(`[upload] Sections: ${Object.keys(chunks).join(", ")}`);
    console.log(`[upload] Stats:`, chunkStats);

    const resumeRef = db ? db.collection("users").doc(uid).collection("resumes").doc() : null;
    if (resumeRef) {
      const { FieldValue } = require("firebase-admin/firestore");
      const resumeDoc = {
        uid,
        fileName: req.file.originalname,
        rawText,
        chunks,
        chunkStats,
        status: "uploaded",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await resumeRef.set(resumeDoc);
      console.log(`[upload] Saved resume ${resumeRef.id} to Firestore`);
    }

    return res.json({
      resumeId: resumeRef?.id || null,
      fileName: req.file.originalname,
      rawText,
      chunks,
      chunkStats,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Resume optimisation prompts
// ---------------------------------------------------------------------------
//
// Each section gets a dedicated system + user prompt pair tuned for tech
// roles.  The user prompt includes a {text} placeholder that is replaced
// with the extracted section content at call time.
// ---------------------------------------------------------------------------

const RESUME_PROMPTS = {
  summary: {
    system: `You are a senior technical resume writer specialising in software engineering,
DevOps, data, and product roles.  Your goal is to rewrite the candidate's professional
summary so it:

- Opens with years of experience and primary domain (e.g. "8-year backend engineer
  specialising in distributed systems").
- Includes at least one quantified achievement (users served, uptime %, latency
  reduction, revenue impact).
- Mentions the top 2-3 technical skills relevant to the target role.
- Uses a confident, active-voice tone — no filler words like "results-driven"
  or "passionate" unless backed by evidence.
- Stays between 2-4 sentences (50-120 words).
- Targets ATS keyword density for common tech roles.

Return JSON only — no markdown fences, no commentary:
{
  "original": "<the original text passed in>",
  "edited": "<rewritten summary>",
  "suggestions": ["<tip 1>", "<tip 2>"],
  "reasoning": "<1-2 sentence explanation of why this is stronger>"
}`,

    user: `Rewrite this professional summary for a tech-focused resume:\n\n{text}`,
  },

  skills: {
    system: `You are a technical resume organiser.  Your job is to take a raw skills list
and restructure it for maximum ATS and recruiter impact:

- Group skills into clear categories: Languages, Frameworks & Libraries, Tools &
  Platforms, Databases, methodologies (Agile, CI/CD, TDD), and Other.
- Remove duplicates and outdated or irrelevant entries.
- Order each category by relevance to modern tech roles (most in-demand first).
- Add commonly expected skills that are implied but missing (e.g. if "React" is
  listed, "TypeScript" is likely relevant; if "AWS" is listed, add "Cloud
  Architecture").
- Use standardised names (e.g. "JavaScript (ES6+)" not "JS", "PostgreSQL" not
  "postgres").
- Keep the total list concise — 15-30 items maximum.

Return JSON only:
{
  "original": "<the original text>",
  "edited": "<restructured skills organised by category>",
  "suggestions": ["<tip 1>", "<tip 2>"],
  "reasoning": "<why this structure helps>"
}`,

    user: `Organise and optimise these skills for a tech resume:\n\n{text}`,
  },

  experience: {
    system: `You are a technical resume writer optimising work experience bullets for
software engineering and tech roles.  Apply these rules:

- Start every bullet with a strong action verb: Built, Designed, Architected,
  Led, Optimised, Migrated, Automated, Deployed, Reduced, Launched, Integrated.
- Quantify everything possible: users, requests/sec, p99 latency, cost savings
  ($ or %), team size, code coverage %, deployment frequency.
- Remove vague claims ("worked on", "helped with", "responsible for") and replace
  with specific outcomes.
- Highlight tech stack usage inline (e.g. "Built a real-time event pipeline using
  Kafka and Node.js handling 50k events/sec").
- Use the XYZ formula where possible: "Accomplished [X] as measured by [Y] by
  doing [Z]."
- Each role should have 3-5 concise bullets (1-2 lines each).
- Preserve original dates and titles.

Return JSON only:
{
  "original": "<the original text>",
  "edited": "<optimised experience section>",
  "suggestions": ["<tip 1>", "<tip 2>"],
  "reasoning": "<impact summary>"
}`,

    user: `Optimise this experience section for a software engineering role:\n\n{text}`,
  },

  projects: {
    system: `You are a technical resume writer specialising in personal and open-source
project descriptions.  Optimise the projects section:

- Each project needs: name, 1-2 sentence description, tech stack used, and a
  quantified impact or link.
- Start with the most impressive or relevant project.
- Emphasise scale and complexity (users, stars, downloads, data volume).
- Call out specific technical challenges solved (e.g. "Implemented CRDT-based
  sync for offline-first editing").
- Include GitHub stars, npm downloads, or live URLs if mentioned.
- Remove trivial projects (todo apps, hello-world repos) unless they
  demonstrate unusual depth.
- Use action verbs: Built, Created, Designed, Implemented, Deployed.

Return JSON only:
{
  "original": "<the original text>",
  "edited": "<optimised projects section>",
  "suggestions": ["<tip 1>", "<tip 2>"],
  "reasoning": "<why this stands out>"
}`,

    user: `Optimise these project descriptions for a tech resume:\n\n{text}`,
  },

  education: {
    system: `You are a technical resume writer.  Clean up and enhance the education
section:

- Format consistently: Degree, Institution, Location (optional), Graduation Year.
- Add relevant coursework only if it strengthens the tech narrative (e.g. "Distributed
  Systems", "Machine Learning").
- Include GPA only if ≥ 3.5 / 4.0; omit otherwise.
- Mention academic achievements: Dean's List, scholarships, thesis topic if technical.
- Remove high school entries if a college degree exists.
- Add certifications (AWS, GCP, CKA, etc.) if mentioned or clearly implied.

Return JSON only:
{
  "original": "<the original text>",
  "edited": "<cleaned education section>",
  "suggestions": ["<tip 1>", "<tip 2>"],
  "reasoning": "<improvements made>"
}`,

    user: `Clean up and enhance this education section for a tech resume:\n\n{text}`,
  },
};

// ---------------------------------------------------------------------------
// POST /api/resume/process
// ---------------------------------------------------------------------------
//
// Accepts: { chunks: { summary: "...", skills: "...", ... } }
//
// For each non-empty section, calls OpenRouter with the section-specific
// prompt and collects the results.  Returns the full set of suggestions
// along with a processedAt timestamp.
// ---------------------------------------------------------------------------

router.post("/api/resume/process", authenticateToken, async (req, res, next) => {
  try {
    const { chunks, resumeId } = req.body;
    const uid = req.user.uid;

    if (!chunks || typeof chunks !== "object") {
      return res.status(400).json({
        error: "Request body must contain a 'chunks' object",
      });
    }

    const hasApiKey = !!process.env.OPENROUTER_API_KEY && false;
    const sectionKeys = Object.keys(RESUME_PROMPTS);

    console.log(
      `[process] User ${uid} — sections: ${Object.keys(chunks).join(", ")} | AI disabled (local mode)`
    );

    const results = {};

    const processSection = async (key) => {
      const text = chunks[key];

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        console.log(`[process] Skipping empty section: ${key}`);
        return;
      }

      if (!hasApiKey) {
        results[key] = {
          original: text,
          edited: text,
          suggestions: [],
          reasoning: "Local mode — no API key configured. Edit the text above and generate your PDF.",
        };
        console.log(`[process] Local mode: passing through "${key}" (${text.length} chars)`);
        return;
      }

      const { system, user } = RESUME_PROMPTS[key];
      const userPrompt = user.replace(/\{text\}/g, text);

      console.log(`[process] Processing "${key}" (${text.length} chars)…`);

      try {
        const result = await callOpenRouter(system, userPrompt);
        if (!result || !result.edited) {
          throw new Error("Invalid response structure from AI");
        }
        results[key] = {
          original: result.original || text,
          edited: result.edited,
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
          reasoning: result.reasoning || "",
        };
        console.log(`[process] Done "${key}"`);
      } catch (err) {
        console.error(`[process] Failed "${key}":`, err.message);
        results[key] = {
          original: text,
          edited: text,
          suggestions: [],
          reasoning: `Optimisation failed: ${err.message}`,
        };
      }
    };

    await Promise.all(sectionKeys.map(processSection));

    console.log(`[process] Completed ${Object.keys(results).length} section(s)`);

    if (resumeId && db) {
      const { FieldValue } = require("firebase-admin/firestore");
      const resumeRef = db.collection("users").doc(uid).collection("resumes").doc(resumeId);
      const doc = await resumeRef.get();
      if (doc.exists) {
        await resumeRef.update({
          suggestions: results,
          status: "processed",
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[process] Updated resume ${resumeId} in Firestore`);
      }
    }

    return res.json({
      resumeId: resumeId || null,
      suggestions: results,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/resume/process-section
// ---------------------------------------------------------------------------
//
// Accepts: { section: "skills", content: "..." }
//
// Reprocesses a single section after the user has edited it.  Returns the
// same suggestion JSON shape as the bulk endpoint so the frontend can
// swap it in without extra mapping.
// ---------------------------------------------------------------------------

router.post("/api/resume/process-section", authenticateToken, async (req, res, next) => {
  try {
    const { section, content } = req.body;

    // -- Validate inputs -------------------------------------------------------
    if (!section || typeof section !== "string") {
      return res.status(400).json({
        error: "Request body must contain a 'section' string",
      });
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({
        error: "Request body must contain a non-empty 'content' string",
      });
    }

    const prompt = RESUME_PROMPTS[section];

    if (!prompt) {
      const validSections = Object.keys(RESUME_PROMPTS).join(", ");
      return res.status(400).json({
        error: `Unknown section "${section}". Valid sections: ${validSections}`,
      });
    }

    if (!process.env.OPENROUTER_API_KEY || true) {
      return res.json({
        original: content,
        edited: content,
        suggestions: [],
        reasoning: "Local mode — no API key configured.",
      });
    }

    // -- Call LLM --------------------------------------------------------------
    console.log(`[process-section] Processing "${section}" (${content.length} chars)…`);

    const userPrompt = prompt.user.replace(/\{text\}/g, content);

    try {
      const result = await callOpenRouter(prompt.system, userPrompt);
      console.log(`[process-section] Done "${section}"`);
      return res.json({
        original: result.original || content,
        edited: typeof result.edited === "string" ? result.edited : JSON.stringify(result.edited, null, 2),
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        reasoning: result.reasoning || "",
      });
    } catch (err) {
      console.error(`[process-section] Failed "${section}":`, err.message);
      return res.status(502).json({
        error: `Optimisation failed for section "${section}": ${err.message}`,
      });
    }
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/resume/validate
// ---------------------------------------------------------------------------
//
// Accepts: { resumeData: { summary: { edited: "..." }, skills: { edited: "..." }, ... } }
//
// Checks each section for presence, minimum length, and flags empty or
// suspiciously short entries.  Used before PDF generation so the user can
// fix incomplete sections.
// ---------------------------------------------------------------------------

const SECTIONS = ["summary", "skills", "experience", "projects", "education"];
const MIN_LENGTH = 10;

router.post("/api/resume/validate", (req, res, next) => {
  try {
    const { resumeData } = req.body;

    if (!resumeData || typeof resumeData !== "object") {
      return res.status(400).json({
        error: "Request body must contain a 'resumeData' object",
      });
    }

    const warnings = [];
    const sections = {};

    for (const key of SECTIONS) {
      const entry = resumeData[key];

      // Section missing entirely or has no edited field
      if (!entry || typeof entry !== "object") {
        sections[key] = { empty: true };
        warnings.push(`${key} is empty`);
        continue;
      }

      const edited = entry.edited;

      // Edited field missing, null, or not a string
      if (!edited || typeof edited !== "string") {
        sections[key] = { empty: true };
        warnings.push(`${key} is empty`);
        continue;
      }

      const trimmed = edited.trim();

      // Empty after trimming
      if (trimmed.length === 0) {
        sections[key] = { empty: true };
        warnings.push(`${key} is empty`);
        continue;
      }

      // Below minimum length
      if (trimmed.length < MIN_LENGTH) {
        sections[key] = { valid: false, short: true, length: trimmed.length };
        warnings.push(`${key} is too short (${trimmed.length}/${MIN_LENGTH} chars)`);
        continue;
      }

      // Looks good
      sections[key] = { valid: true, length: trimmed.length };
    }

    const isValid = warnings.length === 0;

    console.log(
      `[validate] isValid=${isValid}, warnings=[${warnings.join("; ")}]`
    );

    return res.json({ isValid, warnings, sections });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/resumes — list user's resumes
// ---------------------------------------------------------------------------

router.get("/api/resumes", authenticateToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    if (!db) {
      return res.json({ resumes: [] });
    }

    const snapshot = await db
      .collection("users")
      .doc(uid)
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

    return res.json({ resumes });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/resumes/:id — get a single resume
// ---------------------------------------------------------------------------

router.get("/api/resumes/:id", authenticateToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    if (!db) {
      return res.status(404).json({ error: "Resume not found (no database)" });
    }

    const doc = await db
      .collection("users")
      .doc(uid)
      .collection("resumes")
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Resume not found" });
    }

    return res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/resumes/:id — delete a resume
// ---------------------------------------------------------------------------

router.delete("/api/resumes/:id", authenticateToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    if (!db) {
      return res.json({ message: "Resume deleted (no database, local only)" });
    }

    const ref = db
      .collection("users")
      .doc(uid)
      .collection("resumes")
      .doc(req.params.id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Resume not found" });
    }

    await ref.delete();
    return res.json({ message: "Resume deleted" });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/resumes/:id/final — save final edited resume data
// ---------------------------------------------------------------------------

router.put("/api/resumes/:id/final", authenticateToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { finalData } = req.body;

    if (!finalData || typeof finalData !== "object") {
      return res.status(400).json({ error: "Request body must contain a 'finalData' object" });
    }

    if (!db) {
      return res.json({ message: "Resume saved (no database, local only)" });
    }

    const { FieldValue } = require("firebase-admin/firestore");
    const ref = db
      .collection("users")
      .doc(uid)
      .collection("resumes")
      .doc(req.params.id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Resume not found" });
    }

    await ref.update({
      finalData,
      status: "completed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({ message: "Resume saved" });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Multer error handling (file too large, etc.)
// ---------------------------------------------------------------------------

router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// ---------------------------------------------------------------------------
// POST /api/resume/demo
// ---------------------------------------------------------------------------
//
// Mock endpoint for recruiter demos.  Accepts: { chunks: { ... } }
// Returns simulated AI suggestions with realistic enhancements.
// ---------------------------------------------------------------------------

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
    edited: `Languages: JavaScript (ES6+), TypeScript, Python, SQL, HTML5/CSS3
Frameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS, Redux
Tools & Platforms: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, Git, GitHub Actions, Terraform
Databases: PostgreSQL, MongoDB, Redis, DynamoDB
Methodologies: Agile/Scrum, CI/CD, TDD, Microservices Architecture, REST APIs, GraphQL`,
    suggestions: [
      "Group skills into clear categories for ATS parsing",
      "Use standardised names (e.g. 'JavaScript (ES6+)' not 'JS')",
      "Add implied skills like TypeScript when React is listed",
    ],
    reasoning: "Reorganised into 5 recruiter-friendly categories with consistent naming. Removed duplicates and added complementary skills (TypeScript, Docker) that are expected alongside the listed tech.",
  }),

  experience: (original) => ({
    original,
    edited: `Senior Software Engineer | TechCorp Inc. | Jan 2022 – Present
• Architected a microservices platform on AWS (ECS + Lambda) serving 500K+ requests/day, reducing average response latency from 320ms to 85ms (73% improvement)
• Led migration of legacy monolith to React + Node.js micro-frontend architecture, cutting frontend bundle size by 40% and improving Lighthouse score from 62 to 95
• Implemented automated CI/CD pipeline using GitHub Actions and Terraform, reducing deployment frequency from bi-weekly to multiple times daily
• Mentored a team of 4 junior engineers through code reviews and pair programming, increasing team velocity by 25%

Software Engineer | StartupXYZ | Jun 2019 – Dec 2021
• Built a real-time event processing pipeline using Kafka and Node.js, handling 50K events/sec with sub-100ms end-to-end latency
• Designed and shipped a customer analytics dashboard with React and D3.js, adopted by 12 internal teams across 3 business units
• Reduced database query costs by 35% through query optimisation and Redis caching layer implementation`,
    suggestions: [
      "Start every bullet with a strong action verb (Architected, Led, Implemented)",
      "Quantify everything: users, requests/sec, latency reduction, cost savings",
      "Highlight specific tech stack usage inline for ATS keyword matching",
    ],
    reasoning: "Every bullet now follows the XYZ formula with quantified outcomes. Action verbs lead each statement, and the tech stack is mentioned inline, making this highly ATS-friendly.",
  }),

  projects: (original) => ({
    original,
    edited: `AI Resume Optimizer — Full-Stack Web Application
Built an end-to-end resume optimisation platform using React, Node.js, and OpenAI API integration. Processes 500+ resumes weekly with AI-powered section-by-section analysis and PDF generation. Deployed on AWS with 99.9% uptime.
Tech: React, TypeScript, Node.js, PostgreSQL, AWS, Docker

Real-Time Collaborative Editor — Open Source (2.1K GitHub Stars)
Designed a CRDT-based collaborative text editor supporting 100+ concurrent users with offline-first sync. Implemented operational transform conflict resolution and WebSocket real-time updates.
Tech: React, Y.js, WebSocket, Redis, Express

E-Commerce Microservices Platform — Capstone Project
Architected a scalable e-commerce backend using microservices pattern with event-driven communication via RabbitMQ. Handles 10K concurrent users with auto-scaling on AWS ECS.
Tech: Node.js, RabbitMQ, Docker, AWS ECS, MongoDB`,
    suggestions: [
      "Lead with the most impressive project (AI Resume Optimizer)",
      "Include quantified impact (users, stars, weekly volume)",
      "Call out specific technical challenges solved",
    ],
    reasoning: "Projects now have clear name-description-tech-impact structure. Each entry highlights scale (500+ resumes, 2.1K stars, 10K users) and technical depth, making them stand out to recruiters.",
  }),

  education: (original) => ({
    original,
    edited: `Bachelor of Science in Computer Science
University of California, Berkeley | Graduated May 2019 | GPA: 3.7/4.0
• Dean's List (6 semesters)
• Relevant Coursework: Distributed Systems, Machine Learning, Database Systems, Algorithms
• Senior Thesis: "Optimising Real-Time Data Pipelines for IoT Networks"

Certifications:
• AWS Certified Solutions Architect – Associate (2023)
• Google Cloud Professional Cloud Developer (2022)`,
    suggestions: [
      "Include GPA only because it exceeds 3.5 threshold",
      "Add relevant coursework that strengthens tech narrative",
      "Include industry certifications for credibility",
    ],
    reasoning: "Added GPA (3.7 qualifies), relevant coursework, and certifications. Removed any high school entries and kept formatting consistent for ATS parsing.",
  }),
};

router.post("/api/resume/demo", async (req, res, next) => {
  try {
    const { chunks } = req.body;

    if (!chunks || typeof chunks !== "object") {
      return res.status(400).json({
        error: "Request body must contain a 'chunks' object",
      });
    }

    console.log(`[demo] Simulating AI processing for sections: ${Object.keys(chunks).join(", ")}`);

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

      // Simulate processing delay for realistic feel
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`[demo] Completed ${Object.keys(results).length} section(s)`);

    return res.json({
      resumeId: null,
      suggestions: results,
      processedAt: new Date().toISOString(),
      _demo: true,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { callOpenRouter } = require("../utils/openRouterApi");

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

router.post("/api/resume/upload", upload.single("resume"), async (req, res, next) => {
  try {
    // -- Validate file presence ------------------------------------------------
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(
      `[upload] Received "${req.file.originalname}" (${req.file.size} bytes)`
    );

    // -- Parse PDF ------------------------------------------------------------
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

    console.log(
      `[upload] Extracted ${rawText.length} chars, ${pdfData.numpages} page(s)`
    );

    // -- Chunk into sections --------------------------------------------------
    const chunks = smartChunkResume(rawText);

    // -- Build per-section character counts -----------------------------------
    const chunkStats = {};
    for (const [key, text] of Object.entries(chunks)) {
      chunkStats[key] = text.length;
    }

    console.log(`[upload] Sections: ${Object.keys(chunks).join(", ")}`);
    console.log(`[upload] Stats:`, chunkStats);

    // -- Return result --------------------------------------------------------
    return res.json({
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

router.post("/api/resume/process", async (req, res, next) => {
  try {
    const { chunks } = req.body;

    if (!chunks || typeof chunks !== "object") {
      return res.status(400).json({
        error: "Request body must contain a 'chunks' object",
      });
    }

    const sectionKeys = Object.keys(RESUME_PROMPTS);
    const results = {};

    console.log(
      `[process] Starting optimisation for sections: ${Object.keys(chunks).join(", ")}`
    );

    for (const key of sectionKeys) {
      const text = chunks[key];

      // Skip sections that weren't provided or are empty
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        console.log(`[process] Skipping empty section: ${key}`);
        continue;
      }

      const { system, user } = RESUME_PROMPTS[key];
      const userPrompt = user.replace(/\{text\}/g, text);

      console.log(`[process] Processing "${key}" (${text.length} chars)…`);

      try {
        const result = await callOpenRouter(system, userPrompt);
        results[key] = result;
        console.log(`[process] Done "${key}"`);
      } catch (err) {
        console.error(`[process] Failed "${key}":`, err.message);
        // Still include the section so the frontend can fall back to original
        results[key] = {
          original: text,
          edited: text,
          suggestions: [],
          reasoning: `Optimisation failed: ${err.message}`,
        };
      }
    }

    console.log(`[process] Completed ${Object.keys(results).length} section(s)`);

    return res.json({
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

router.post("/api/resume/process-section", async (req, res, next) => {
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

    // -- Call LLM --------------------------------------------------------------
    console.log(`[process-section] Processing "${section}" (${content.length} chars)…`);

    const userPrompt = prompt.user.replace(/\{text\}/g, content);

    try {
      const result = await callOpenRouter(prompt.system, userPrompt);
      console.log(`[process-section] Done "${section}"`);
      return res.json(result);
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

module.exports = router;

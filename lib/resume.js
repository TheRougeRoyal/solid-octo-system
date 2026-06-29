const SECTION_PATTERNS = [
  {
    key: "summary",
    regex: /(?:professional\s+)?summary|^(?:career|executive)\s+summary|^(?:about\s+me)|^(?:profile|objective|career\s+objective)/im,
  },
  {
    key: "skills",
    regex: /(?:technical\s+|core\s+|key\s+|relevant\s+)?skills|competencies|technologies|tech\s+stack|expertise|proficiencies/i,
  },
  {
    key: "experience",
    regex: /(?:work|professional|employment)\s+experience|employment\s+history|career\s+(?:history|experience)|work\s+history|experience/i,
  },
  {
    key: "projects",
    regex: /(?:key|notable|personal|side)\s+projects?|project\s+experience|projects?/i,
  },
  {
    key: "education",
    regex: /(?:academic|educational)\s+(?:background|qualification)|education|qualifications?/i,
  },
];

function smartChunkResume(rawText) {
  const normalised = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  const lines = normalised.split("\n");
  const sections = {};
  let currentKey = "other";
  let buffer = [];

  function flush() {
    const text = buffer.join("\n").trim();
    if (text) {
      sections[currentKey] = sections[currentKey]
        ? sections[currentKey] + "\n\n" + text
        : text;
    }
    buffer = [];
  }

  function detectSectionHeader(line) {
    const trimmed = line.trim();
    if (trimmed.length < 2) return null;
    if (/^[\-•*●◆▪]\s/.test(trimmed)) return null;
    for (const { key, regex } of SECTION_PATTERNS) {
      if (regex.test(trimmed)) return key;
    }
    return null;
  }

  for (const line of lines) {
    const headerKey = detectSectionHeader(line);
    if (headerKey) {
      flush();
      currentKey = headerKey;
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

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

module.exports = { smartChunkResume, RESUME_PROMPTS };

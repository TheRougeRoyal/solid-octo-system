# AI Resume Optimizer — API Routes Summary

Base URL: `http://localhost:3001`

---

## Data Flow

```
Upload PDF → Extract Chunks → Process with LLM → Edit Sections → Generate PDF
   POST         POST              POST              POST            POST
   /upload      /process          /process-section  /validate       /generate-pdf
```

---

## 1. GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "env": "development"
}
```

**curl:**
```bash
curl http://localhost:3001/health
```

---

## 2. GET /api

API info and endpoint listing.

**Response:**
```json
{
  "name": "AI Resume Optimizer API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "upload": "POST /api/resume/upload",
    "process": "POST /api/resume/process",
    "processSection": "POST /api/resume/process-section",
    "validate": "POST /api/resume/validate",
    "generatePdf": "POST /api/generate-pdf",
    "previewPdf": "POST /api/preview-pdf"
  }
}
```

**curl:**
```bash
curl http://localhost:3001/api
```

---

## 3. POST /api/resume/upload

Upload a PDF resume. Extracts text and chunks it into sections.

**Request:** `multipart/form-data`

| Field       | Type   | Required | Notes                        |
|-------------|--------|----------|------------------------------|
| `resume`    | File   | Yes      | PDF only, max 5 MB           |

**Response (200):**
```json
{
  "resumeId": "abc123def456",
  "fileName": "john_doe_resume.pdf",
  "rawText": "John Doe\njohn@example.com\n...",
  "chunks": {
    "summary": "Experienced software engineer with 8+ years...",
    "skills": "JavaScript, TypeScript, React, Node.js...",
    "experience": "Senior Engineer at Acme Corp (2020-Present)...",
    "projects": "Built an open-source CLI tool that...",
    "education": "B.S. Computer Science, MIT, 2015"
  },
  "chunkStats": {
    "summary": 245,
    "skills": 180,
    "experience": 890,
    "projects": 320,
    "education": 95
  }
}
```

**Error Codes:**

| Status | Condition                                     |
|--------|-----------------------------------------------|
| 400    | No file uploaded                              |
| 413    | File exceeds 5 MB limit                       |
| 422    | PDF cannot be parsed or has no extractable text |

**curl:**
```bash
curl -X POST http://localhost:3001/api/resume/upload \
  -F "resume=@./my_resume.pdf"
```

**Frontend (axios):**
```js
const formData = new FormData();
formData.append("resume", file);
const { data } = await axios.post("/api/resume/upload", formData);
// data.chunks contains the extracted sections
```

---

## 4. POST /api/resume/process

Send all resume chunks to the LLM for optimisation. Processes each section sequentially.

**Request:** `application/json`

```json
{
  "chunks": {
    "summary": "Experienced software engineer with 8+ years...",
    "skills": "JavaScript, TypeScript, React, Node.js...",
    "experience": "Senior Engineer at Acme Corp (2020-Present)...",
    "projects": "Built an open-source CLI tool that...",
    "education": "B.S. Computer Science, MIT, 2015"
  }
}
```

| Field     | Type   | Required | Notes                              |
|-----------|--------|----------|------------------------------------|
| `chunks`  | Object | Yes      | Keys: summary, skills, experience, projects, education |

**Response (200):**
```json
{
  "suggestions": {
    "summary": {
      "original": "Experienced software engineer...",
      "edited": "8-year full-stack engineer specialising in...",
      "suggestions": [
        "Add quantified metrics (users served, latency reduced)",
        "Mention specific tech stack used"
      ],
      "reasoning": "Opens with clear experience level and domain..."
    },
    "skills": {
      "original": "JavaScript, TypeScript, React...",
      "edited": "**Languages**\n- JavaScript (ES6+)\n- TypeScript\n\n**Frameworks**\n- React\n- Node.js",
      "suggestions": ["Group skills by category for ATS parsing"],
      "reasoning": "Categorised format improves recruiter scanning..."
    }
  },
  "processedAt": "2025-01-15T10:31:00.000Z"
}
```

> **Note:** If the LLM fails for a section, it returns the original text with an empty `suggestions` array and an error message in `reasoning`. The frontend can fall back to the original.

**Error Codes:**

| Status | Condition                         |
|--------|-----------------------------------|
| 400    | Missing or invalid `chunks` field |
| 502    | OpenRouter API call failed        |

**curl:**
```bash
curl -X POST http://localhost:3001/api/resume/process \
  -H "Content-Type: application/json" \
  -d '{
    "chunks": {
      "summary": "Experienced software engineer with 8+ years building distributed systems.",
      "skills": "JavaScript, Python, AWS, Docker, PostgreSQL",
      "experience": "Senior Engineer at Acme Corp (2020-Present)\n- Built microservices"
    }
  }'
```

**Frontend (axios):**
```js
const { data } = await axios.post("/api/resume/process", { chunks });
// data.suggestions[sectionKey] has { original, edited, suggestions, reasoning }
```

---

## 5. POST /api/resume/process-section

Reprocess a single section after the user has edited it.

**Request:** `application/json`

```json
{
  "section": "skills",
  "content": "JavaScript, TypeScript, React, Next.js, Node.js, PostgreSQL, Redis, AWS, Docker, Kubernetes"
}
```

| Field     | Type   | Required | Valid values                                |
|-----------|--------|----------|---------------------------------------------|
| `section` | String | Yes      | `summary`, `skills`, `experience`, `projects`, `education` |
| `content` | String | Yes      | Non-empty text to process                   |

**Response (200):**
```json
{
  "original": "JavaScript, TypeScript, React, Next.js...",
  "edited": "**Languages**\n- JavaScript (ES6+)\n- TypeScript\n\n**Frameworks**\n- React\n- Next.js",
  "suggestions": ["Grouped by category for better ATS parsing"],
  "reasoning": "Structured format improves recruiter scanning speed..."
}
```

> **Note:** Response is the same shape as a single entry in `/api/resume/process`'s `suggestions` object.

**Error Codes:**

| Status | Condition                                     |
|--------|-----------------------------------------------|
| 400    | Missing `section`, missing `content`, or invalid section name |
| 502    | OpenRouter API call failed                    |

**curl:**
```bash
curl -X POST http://localhost:3001/api/resume/process-section \
  -H "Content-Type: application/json" \
  -d '{
    "section": "skills",
    "content": "JavaScript, Python, AWS, Docker"
  }'
```

**Frontend (axios):**
```js
const { data } = await axios.post("/api/resume/process-section", {
  section: "skills",
  content: "JavaScript, Python, AWS, Docker"
});
// data has { original, edited, suggestions, reasoning }
```

---

## 6. POST /api/resume/validate

Validate resume data before PDF generation. Checks each section for presence and minimum length.

**Request:** `application/json`

```json
{
  "resumeData": {
    "summary": { "edited": "8-year full-stack engineer..." },
    "skills": { "edited": "**Languages**\n- JavaScript" },
    "experience": { "edited": "Senior Engineer at Acme Corp..." },
    "projects": null,
    "education": { "edited": "" }
  }
}
```

| Field        | Type   | Required | Notes                                      |
|--------------|--------|----------|--------------------------------------------|
| `resumeData` | Object | Yes      | Keys: summary, skills, experience, projects, education. Each value is `{ edited: string }` or null. |

**Response (200):**
```json
{
  "isValid": false,
  "warnings": [
    "projects is empty",
    "education is too short (3/10 chars)"
  ],
  "sections": {
    "summary": { "valid": true, "length": 245 },
    "skills": { "valid": true, "length": 180 },
    "experience": { "valid": true, "length": 890 },
    "projects": { "empty": true },
    "education": { "valid": false, "short": true, "length": 3 }
  }
}
```

> Use this before calling `/api/generate-pdf` to warn the user about incomplete sections.

**Error Codes:**

| Status | Condition                       |
|--------|---------------------------------|
| 400    | Missing or invalid `resumeData` |

**curl:**
```bash
curl -X POST http://localhost:3001/api/resume/validate \
  -H "Content-Type: application/json" \
  -d '{
    "resumeData": {
      "summary": { "edited": "8-year full-stack engineer specialising in distributed systems." },
      "skills": { "edited": "JavaScript, TypeScript, React" },
      "experience": { "edited": "Senior Engineer at Acme Corp (2020-Present)\n- Built microservices" },
      "projects": null,
      "education": { "edited": "" }
    }
  }'
```

**Frontend (axios):**
```js
const { data } = await axios.post("/api/resume/validate", { resumeData });
if (!data.isValid) {
  alert(data.warnings.join("\n"));
  return;
}
// safe to generate PDF
```

---

## 7. POST /api/generate-pdf

Generate a PDF from resume data. Returns the PDF as a downloadable file.

**Request:** `application/json`

```json
{
  "resumeData": {
    "summary": "8-year full-stack engineer specialising in distributed systems...",
    "skills": "**Languages**\n- JavaScript (ES6+)\n- TypeScript\n\n**Frameworks**\n- React",
    "experience": "Senior Engineer at Acme Corp (2020-Present)\n- Built microservices...",
    "projects": "Open-source CLI tool — built with Node.js, serves 5k+ weekly users",
    "education": "B.S. Computer Science, MIT, 2015"
  }
}
```

| Field        | Type   | Required | Notes                                    |
|--------------|--------|----------|------------------------------------------|
| `resumeData` | Object | Yes      | Keys: summary, skills, experience, projects, education (all strings) |

**Response:** Binary PDF (`application/pdf`)

| Header              | Value                                          |
|---------------------|------------------------------------------------|
| `Content-Type`      | `application/pdf`                              |
| `Content-Disposition` | `attachment; filename="resume_optimized_<uuid>.pdf"` |

**Error Codes:**

| Status | Condition                       |
|--------|---------------------------------|
| 400    | Missing or invalid `resumeData` |

**curl:**
```bash
curl -X POST http://localhost:3001/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "resumeData": {
      "summary": "8-year full-stack engineer...",
      "skills": "JavaScript, TypeScript, React",
      "experience": "Senior Engineer at Acme Corp",
      "projects": "Open-source CLI tool",
      "education": "B.S. Computer Science, MIT"
    }
  }' \
  --output resume_optimized.pdf
```

**Frontend (axios):**
```js
const response = await axios.post("/api/generate-pdf", { resumeData }, {
  responseType: "blob"
});
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement("a");
link.href = url;
link.download = "resume_optimized.pdf";
link.click();
window.URL.revokeObjectURL(url);
```

---

## 8. POST /api/preview-pdf

Generate a PDF and return it as base64 for in-browser preview.

**Request:** `application/json`

```json
{
  "resumeData": {
    "summary": "8-year full-stack engineer...",
    "skills": "JavaScript, TypeScript, React",
    "experience": "Senior Engineer at Acme Corp",
    "projects": "Open-source CLI tool",
    "education": "B.S. Computer Science, MIT"
  }
}
```

> Same request body as `/api/generate-pdf`.

**Response (200):**
```json
{
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMyAwIG9...",
  "size": 24576
}
```

| Field        | Type    | Notes                               |
|--------------|---------|-------------------------------------|
| `pdfBase64`  | String  | Base64-encoded PDF bytes            |
| `size`       | Number  | PDF file size in bytes              |

**Error Codes:**

| Status | Condition                       |
|--------|---------------------------------|
| 400    | Missing or invalid `resumeData` |

**curl:**
```bash
curl -X POST http://localhost:3001/api/preview-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "resumeData": {
      "summary": "8-year full-stack engineer...",
      "skills": "JavaScript, TypeScript, React",
      "experience": "Senior Engineer at Acme Corp",
      "projects": "Open-source CLI tool",
      "education": "B.S. Computer Science, MIT"
    }
  }'
```

**Frontend (axios + iframe):**
```js
const { data } = await axios.post("/api/preview-pdf", { resumeData });
const byteCharacters = atob(data.pdfBase64);
const byteNumbers = new Array(byteCharacters.length);
for (let i = 0; i < byteCharacters.length; i++) {
  byteNumbers[i] = byteCharacters.charCodeAt(i);
}
const byteArray = new Uint8Array(byteNumbers);
const blob = new Blob([byteArray], { type: "application/pdf" });
const pdfUrl = URL.createObjectURL(blob);

// Show in iframe
document.getElementById("pdf-preview").src = pdfUrl;
```

---

## Section Keys Reference

These keys are used across all endpoints:

| Key          | Description              | PDF Heading              |
|--------------|--------------------------|--------------------------|
| `summary`    | Professional summary     | PROFESSIONAL SUMMARY     |
| `skills`     | Technical skills list    | SKILLS                   |
| `experience` | Work experience          | WORK EXPERIENCE          |
| `projects`   | Project descriptions     | PROJECTS                 |
| `education`  | Education details        | EDUCATION                |

---

## Typical Frontend Flow

```js
// Step 1: Upload PDF
const uploadRes = await axios.post("/api/resume/upload", formData);
const { chunks } = uploadRes.data;

// Step 2: Process all sections with LLM
const processRes = await axios.post("/api/resume/process", { chunks });
const { suggestions } = processRes.data;

// Step 3: User reviews/edits suggestions, then reprocess individual sections if needed
const editRes = await axios.post("/api/resume/process-section", {
  section: "skills",
  content: userEditedSkillsText
});

// Step 4: Validate before generating PDF
const validateRes = await axios.post("/api/resume/validate", { resumeData });
if (!validateRes.data.isValid) {
  // Show warnings to user
}

// Step 5: Generate PDF for download
const pdfRes = await axios.post("/api/generate-pdf", { resumeData }, {
  responseType: "blob"
});

// Or generate for preview
const previewRes = await axios.post("/api/preview-pdf", { resumeData });
const pdfUrl = `data:application/pdf;base64,${previewRes.data.pdfBase64}`;
```

const express = require("express");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 612; // Letter
const PAGE_HEIGHT = 792;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const FONT_SIZE_HEADING = 12;
const FONT_SIZE_BODY = 10;
const LINE_HEIGHT_HEADING = 18;
const LINE_HEIGHT_BODY = 14;
const SECTION_SPACING = 10;
const HEADING_LINE_GAP = 4;

const COLOR_HEADING = rgb(0.18, 0.36, 0.65); // blue
const COLOR_BODY = rgb(0.1, 0.1, 0.1); // near-black
const COLOR_LINE = rgb(0.7, 0.7, 0.7); // light gray

// Section keys in display order
const SECTION_ORDER = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
];

const SECTION_LABELS = {
  summary: "PROFESSIONAL SUMMARY",
  skills: "SKILLS",
  experience: "WORK EXPERIENCE",
  projects: "PROJECTS",
  education: "EDUCATION",
};

// ---------------------------------------------------------------------------
// wrapText()
// ---------------------------------------------------------------------------
//
// Breaks a single line of text into multiple lines that fit within
// `maxWidth` pixels given the font and size.  Splits on word boundaries;
// falls back to hard-breaking a single token that exceeds the width alone.
// ---------------------------------------------------------------------------

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// buildPdf(resumeData) -> Uint8Array
// ---------------------------------------------------------------------------

async function buildPdf(resumeData) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  // ----- helpers ----------------------------------------------------------

  const yRemaining = () => y - MARGIN_BOTTOM;

  const ensureSpace = (needed) => {
    if (yRemaining() < needed) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const drawLine = () => {
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: COLOR_LINE,
    });
    y -= HEADING_LINE_GAP;
  };

  // ----- render each section ----------------------------------------------

  for (const key of SECTION_ORDER) {
    const content = resumeData[key];
    if (!content || (typeof content === "string" && content.trim() === "")) {
      continue;
    }

    const label = SECTION_LABELS[key] || key.toUpperCase();

    // Ensure room for heading + at least one body line
    ensureSpace(LINE_HEIGHT_HEADING + LINE_HEIGHT_BODY + SECTION_SPACING);

    // Section heading (uppercase, bold, blue)
    page.drawText(label, {
      x: MARGIN_LEFT,
      y,
      size: FONT_SIZE_HEADING,
      font: boldFont,
      color: COLOR_HEADING,
    });
    y -= LINE_HEIGHT_HEADING;

    // Thin line under heading
    drawLine();

    // Body text — split into paragraphs, then wrap each
    const paragraphs = String(content).split(/\n\n+/);

    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p].trim();
      if (!para) continue;

      // Each paragraph may contain single newlines (line breaks within a
      // block).  We treat those as separate wrap candidates.
      const rawLines = para.split(/\n/);

      for (const rawLine of rawLines) {
        const wrapped = wrapText(rawLine.trim(), font, FONT_SIZE_BODY, CONTENT_WIDTH);

        for (const line of wrapped) {
          ensureSpace(LINE_HEIGHT_BODY);
          page.drawText(line, {
            x: MARGIN_LEFT,
            y,
            size: FONT_SIZE_BODY,
            font,
            color: COLOR_BODY,
          });
          y -= LINE_HEIGHT_BODY;
        }
      }

      // Extra gap between paragraphs (but not after the last one)
      if (p < paragraphs.length - 1) {
        y -= 4;
      }
    }

    // Extra spacing after the whole section
    y -= SECTION_SPACING;
  }

  // ----- Footer on every page ---------------------------------------------

  const now = new Date().toISOString();
  const footerText = `Generated ${now}`;

  for (const pg of pdfDoc.getPages()) {
    const footerWidth = font.widthOfTextAtSize(footerText, 8);
    pg.drawText(footerText, {
      x: (PAGE_WIDTH - footerWidth) / 2,
      y: MARGIN_BOTTOM / 2,
      size: 8,
      font,
      color: COLOR_LINE,
    });
  }

  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// POST /api/generate-pdf  —  returns binary PDF
// ---------------------------------------------------------------------------

router.post("/api/generate-pdf", async (req, res, next) => {
  try {
    const { resumeData } = req.body;

    if (!resumeData || typeof resumeData !== "object") {
      return res.status(400).json({ error: "Missing or invalid 'resumeData' in request body" });
    }

    const pdfBytes = await buildPdf(resumeData);
    const uuid = uuidv4();
    const filename = `resume_optimized_${uuid}.pdf`;

    res
      .set("Content-Type", "application/pdf")
      .set("Content-Disposition", `attachment; filename="${filename}"`)
      .send(Buffer.from(pdfBytes));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/preview-pdf  —  returns base64-encoded PDF in JSON
// ---------------------------------------------------------------------------

router.post("/api/preview-pdf", async (req, res, next) => {
  try {
    const { resumeData } = req.body;

    if (!resumeData || typeof resumeData !== "object") {
      return res.status(400).json({ error: "Missing or invalid 'resumeData' in request body" });
    }

    const pdfBytes = await buildPdf(resumeData);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    res.json({
      pdfBase64,
      size: pdfBytes.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

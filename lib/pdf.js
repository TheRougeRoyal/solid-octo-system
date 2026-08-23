const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 40;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const SECTION_ORDER = ["summary", "skills", "experience", "projects", "education"];
const SECTION_LABELS = {
  summary: "PROFESSIONAL SUMMARY",
  skills: "SKILLS",
  experience: "WORK EXPERIENCE",
  projects: "PROJECTS",
  education: "EDUCATION",
};

const PDF_CHARACTER_REPLACEMENTS = {
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": "'",
  "\u201B": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u201F": '"',
  "\u2022": "-",
  "\u2026": "...",
  "\u00A0": " ",
};

function formatPdfText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(formatPdfText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${formatPdfText(item)}`)
      .filter((line) => line.trim().length > 0)
      .join("\n");
  }
  return String(value);
}

function sanitizePdfText(value) {
  return formatPdfText(value)
    .normalize("NFKD")
    .replace(/[\u2010-\u2015\u2212\u2018-\u201F\u2022\u2026\u00A0]/g, (character) => (
      PDF_CHARACTER_REPLACEMENTS[character] || " "
    ))
    .replace(/[^\x20-\x7E\n\t]/g, " ")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/g, "$1")
    .replace(/^\s*[•●▪]\s*/gm, "- ");
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function buildPdf(resumeData) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const ensureSpace = (needed) => {
    if (y - MARGIN_BOTTOM < needed) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const source = resumeData.chunks && typeof resumeData.chunks === "object"
    ? { ...resumeData.chunks, ...resumeData }
    : resumeData;

  const drawCenteredText = (text, size, selectedFont, color) => {
    const width = selectedFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(MARGIN_LEFT, (PAGE_WIDTH - width) / 2),
      y,
      size,
      font: selectedFont,
      color,
    });
    y -= size + 3;
  };

  const headerLines = sanitizePdfText(source.header || source.other || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (headerLines.length > 0) {
    ensureSpace(48);
    drawCenteredText(headerLines[0], 18, boldFont, rgb(0.05, 0.05, 0.05));
    for (const line of headerLines.slice(1)) {
      ensureSpace(14);
      drawCenteredText(line, 9, font, rgb(0.25, 0.25, 0.25));
    }
    y -= 8;
  }

  for (const key of SECTION_ORDER) {
    const content = source[key];
    if (!content || (typeof content === "string" && content.trim() === "")) continue;

    ensureSpace(32);

    page.drawText(SECTION_LABELS[key] || key.toUpperCase(), {
      x: MARGIN_LEFT, y, size: 12, font: boldFont, color: rgb(0.18, 0.36, 0.65),
    });
    y -= 18;

    page.drawLine({
      start: { x: MARGIN_LEFT, y }, end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    });
    y -= 4;

    const paragraphs = sanitizePdfText(content).split(/\n\n+/);
    for (let p = 0; p < paragraphs.length; p++) {
      const rawLines = paragraphs[p].trim().split(/\n/);
      for (const rawLine of rawLines) {
        for (const line of wrapText(rawLine.trim(), font, 10, CONTENT_WIDTH)) {
          ensureSpace(14);
          page.drawText(line, {
            x: MARGIN_LEFT, y, size: 10, font, color: rgb(0.1, 0.1, 0.1),
          });
          y -= 14;
        }
      }
      if (p < paragraphs.length - 1) y -= 4;
    }
    y -= 10;
  }

  const footerText = `Generated ${new Date().toISOString()}`;
  for (const pg of pdfDoc.getPages()) {
    pg.drawText(footerText, {
      x: (PAGE_WIDTH - font.widthOfTextAtSize(footerText, 8)) / 2,
      y: MARGIN_BOTTOM / 2, size: 8, font, color: rgb(0.7, 0.7, 0.7),
    });
  }

  return pdfDoc.save();
}

module.exports = { buildPdf, sanitizePdfText, formatPdfText };

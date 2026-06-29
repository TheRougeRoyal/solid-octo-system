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

  for (const key of SECTION_ORDER) {
    const content = resumeData[key];
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

    const paragraphs = String(content).split(/\n\n+/);
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

module.exports = { buildPdf };

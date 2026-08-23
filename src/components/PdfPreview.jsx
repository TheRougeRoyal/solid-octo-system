import { useState, useEffect, useCallback, useMemo } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTimestamp(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ZoomInIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const formatPdfText = (value) => {
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
};

const sanitizePdfText = (value) =>
  formatPdfText(value)
    .normalize("NFKD")
    .replace(/[\u2010-\u2015\u2212\u2018-\u201F\u2022\u2026\u00A0]/g, (character) => {
      const replacements = {
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
      return replacements[character] || " ";
    })
    .replace(/[^\x20-\x7E\n\t]/g, " ")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/<((?:https?:\/\/|mailto:)[^>]+)>/g, "$1")
    .replace(/^\s*[•●▪]\s*/gm, "- ");

async function generatePdfBlob(resumeData, originalChunks = {}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage();
  let y = pageHeight - margin;

  const sections = [
    { key: "summary", label: "PROFESSIONAL SUMMARY" },
    { key: "skills", label: "SKILLS" },
    { key: "experience", label: "EXPERIENCE" },
    { key: "projects", label: "PROJECTS" },
    { key: "education", label: "EDUCATION" },
  ];

  const addPageIfNeeded = (needed) => {
    if (y - needed < margin) {
      page = pdfDoc.addPage();
      y = pageHeight - margin;
    }
  };

  const drawCenteredText = (text, fontSize, isBold = false, color = rgb(0, 0, 0)) => {
    if (!text) return;
    const selectedFont = isBold ? boldFont : font;
    const width = selectedFont.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: Math.max(margin, (pageWidth - width) / 2),
      y,
      size: fontSize,
      font: selectedFont,
      color,
    });
    y -= fontSize + 3;
  };

  const drawWrappedText = (text, fontSize, isBold = false, color = rgb(0, 0, 0)) => {
    if (!text) return;
    const selectedFont = isBold ? boldFont : font;
    const lines = text.split("\n");

    for (const line of lines) {
      const words = line.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? currentLine + " " + word : word;
        const width = selectedFont.widthOfTextAtSize(testLine, fontSize);

        if (width > contentWidth && currentLine) {
          addPageIfNeeded(fontSize + 4);
          page.drawText(currentLine, {
            x: margin,
            y,
            size: fontSize,
            font: selectedFont,
            color,
          });
          y -= fontSize + 4;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        addPageIfNeeded(fontSize + 4);
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font: selectedFont,
          color,
        });
        y -= fontSize + 4;
      }
    }
  };

  const header = sanitizePdfText(
    resumeData.header || resumeData.other || originalChunks.other || resumeData.chunks?.other || ""
  );
  const headerLines = header.split("\n").map((line) => line.trim()).filter(Boolean);
  if (headerLines.length > 0) {
    addPageIfNeeded(48);
    drawCenteredText(headerLines[0], 18, true, rgb(0.05, 0.05, 0.05));
    for (const line of headerLines.slice(1)) {
      addPageIfNeeded(14);
      drawCenteredText(line, 9, false, rgb(0.25, 0.25, 0.25));
    }
    y -= 8;
  }

  for (const section of sections) {
    const content = resumeData[section.key] || originalChunks[section.key] || resumeData.chunks?.[section.key] || "";
    if (!content) continue;

    const text = sanitizePdfText(
      typeof content === "string" ? content : Array.isArray(content) ? content.join("\n") : String(content)
    );

    addPageIfNeeded(30);
    y -= 10;

    drawWrappedText(section.label, 11, true, rgb(0.2, 0.4, 0.7));
    y -= 2;

    page.drawLine({
      start: { x: margin, y: y + 2 },
      end: { x: pageWidth - margin, y: y + 2 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    y -= 6;
    drawWrappedText(text, 10, false, rgb(0.15, 0.15, 0.15));
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export default function PdfPreview({ resumeData, originalChunks, onBack }) {
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [generatedAt] = useState(() => new Date());

  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    let cancelled = false;
    let blobUrl = null;

    async function build() {
      try {
        setLoading(true);
        setError(null);
        const blob = await generatePdfBlob(resumeData, originalChunks);
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfUrl(blobUrl);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to generate PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    build();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [resumeData]);

  const handleDownload = useCallback(() => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pdfBlob]);

  const zoomIn = useCallback(() => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIndex((i) => Math.max(i - 1, 0));
  }, []);

  const pdfSize = useMemo(() => (pdfBlob ? formatFileSize(pdfBlob.size) : null), [pdfBlob]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PDF Preview</h1>
          <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
            {pdfSize && (
              <span className="flex items-center gap-1">
                <DocumentIcon />
                <span className="font-medium text-gray-700">{pdfSize}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              Generated {formatTimestamp(generatedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <ArrowLeftIcon /> Go Back &amp; Edit
          </button>
          <button
            onClick={handleDownload}
            disabled={loading || !!error}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DownloadIcon /> Download PDF
          </button>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <button
          onClick={zoomOut}
          disabled={zoomIndex === 0}
          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          <ZoomOutIcon />
        </button>
        <span className="min-w-[4rem] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-center text-sm font-semibold text-gray-700">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        >
          <ZoomInIcon />
        </button>
      </div>

      {/* Preview area */}
      <div className="overflow-auto rounded-xl border border-gray-200 bg-gray-100 shadow-inner" style={{ height: "70vh" }}>
        {loading && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <svg className="h-10 w-10 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm text-gray-500">Generating PDF preview...</span>
          </div>
        )}

        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-red-100 p-3">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={onBack}
              className="mt-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
            >
              Go Back
            </button>
          </div>
        )}

        {pdfUrl && !loading && !error && (
          <div className="flex justify-center p-4">
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              className="border border-gray-300 bg-white shadow-lg transition-transform duration-200"
              style={{
                width: `${612 * zoom}px`,
                height: `${792 * zoom}px`,
                minWidth: "300px",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

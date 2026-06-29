import { useState } from "react";
import SectionEditor from "./SectionEditor";

const SECTIONS = [
  { key: "summary", label: "Summary" },
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "education", label: "Education" },
];

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export default function ResumeSuggestions({ suggestions = {}, onGeneratePdf, onSectionEdit, onAccept: onAcceptProp, onAcceptAll: onAcceptAllProp, onRegenerate, onReject: onRejectProp }) {
  const [activeTab, setActiveTab] = useState("all");
  const [accepted, setAccepted] = useState({});
  const [rejected, setRejected] = useState({});
  const [edited, setEdited] = useState({});
  const [generating, setGenerating] = useState(false);

  const sections = SECTIONS.filter((s) => suggestions[s.key]);

  const handleAccept = (key) => {
    setAccepted((prev) => ({ ...prev, [key]: true }));
    setRejected((prev) => ({ ...prev, [key]: false }));
    if (onAcceptProp) onAcceptProp(key);
  };

  const handleReject = (key) => {
    setRejected((prev) => ({ ...prev, [key]: true }));
    setAccepted((prev) => ({ ...prev, [key]: false }));
    setEdited((prev) => ({ ...prev, [key]: suggestions[key]?.original || "" }));
    if (onRejectProp) onRejectProp(key);
  };

  const handleEdit = (key, text) => {
    setEdited((prev) => ({ ...prev, [key]: text }));
    setAccepted((prev) => ({ ...prev, [key]: true }));
    setRejected((prev) => ({ ...prev, [key]: false }));
    if (onSectionEdit) onSectionEdit(key, text);
  };

  const handleAcceptAll = () => {
    const all = {};
    sections.forEach((s) => (all[s.key] = true));
    setAccepted(all);
    setRejected({});
    if (onAcceptAllProp) onAcceptAllProp();
  };

  const allAccepted = sections.length > 0 && sections.every((s) => accepted[s.key] || rejected[s.key]);
  const acceptedCount = sections.filter((s) => accepted[s.key]).length;

  const handleGeneratePdf = async () => {
    if (!onGeneratePdf) return;
    setGenerating(true);
    try {
      const finalSections = {};
      sections.forEach((s) => {
        finalSections[s.key] = edited[s.key] || suggestions[s.key].edited || suggestions[s.key].suggested || "";
      });
      await onGeneratePdf(finalSections);
    } finally {
      setGenerating(false);
    }
  };

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12">
          <SparklesIcon />
          <p className="mt-3 text-sm text-gray-500">No suggestions available. Upload a resume to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Suggestions</h1>
          <p className="mt-1 text-sm text-gray-500">
            {acceptedCount} of {sections.length} sections accepted
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${(acceptedCount / sections.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex gap-3">
          {!allAccepted && (
            <button
              onClick={handleAcceptAll}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Accept All
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab("all")}
          className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === "all"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          All Sections
        </button>
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveTab(s.key)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === s.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label}
            {accepted[s.key] && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-100 text-[10px] text-green-600">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections
          .filter((s) => activeTab === "all" || activeTab === s.key)
          .map((s) => (
            <SectionEditor
              key={s.key}
              sectionKey={s.key}
              label={suggestions[s.key].label}
              original={suggestions[s.key].original}
              suggested={suggestions[s.key].edited}
              reasoning={suggestions[s.key].reasoning}
              tips={suggestions[s.key].suggestions || []}
              onAccept={handleAccept}
              onReject={handleReject}
              onEdit={handleEdit}
              onRegenerate={onRegenerate}
              isAccepted={!!accepted[s.key]}
              isRejected={!!rejected[s.key]}
            />
          ))}
      </div>

      {/* Generate PDF button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleGeneratePdf}
          disabled={generating || sections.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Generating PDF...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}

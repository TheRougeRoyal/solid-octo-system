import { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";

const API_BASE = "http://localhost:3001";
const MAX_CHARS = 2000;

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const DiffIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

function computeDiff(original, suggested) {
  const origWords = original.split(/(\s+)/);
  const sugWords = suggested.split(/(\s+)/);
  const maxLen = Math.max(origWords.length, sugWords.length);

  const origResult = [];
  const sugResult = [];

  for (let i = 0; i < maxLen; i++) {
    const ow = origWords[i] || "";
    const sw = sugWords[i] || "";
    const isWhitespace = /^\s+$/.test(ow) && /^\s+$/.test(sw);

    if (ow !== sw && !isWhitespace) {
      origResult.push({ text: ow, type: "removed" });
      sugResult.push({ text: sw, type: "added" });
    } else {
      if (ow) origResult.push({ text: ow, type: "same" });
      if (sw) sugResult.push({ text: sw, type: "same" });
    }
  }

  return { origResult, sugResult };
}

function DiffView({ original, suggested }) {
  const { origResult, sugResult } = useMemo(
    () => computeDiff(original || "", suggested || ""),
    [original, suggested]
  );

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <div className="p-4">
          <span className="mb-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
            Original
          </span>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {origResult.map((part, i) =>
              part.type === "removed" ? (
                <span key={i} className="rounded bg-red-100 text-red-800 line-through">
                  {part.text}
                </span>
              ) : (
                <span key={i} className="text-gray-600">{part.text}</span>
              )
            )}
          </p>
        </div>
        <div className="p-4">
          <span className="mb-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-700">
            Suggested
          </span>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {sugResult.map((part, i) =>
              part.type === "added" ? (
                <span key={i} className="rounded bg-green-100 text-green-800 font-medium">
                  {part.text}
                </span>
              ) : (
                <span key={i} className="text-gray-600">{part.text}</span>
              )
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SectionEditor({
  sectionKey,
  label,
  original,
  suggested,
  reasoning,
  tips = [],
  onAccept,
  onReject,
  onEdit,
  onRegenerate,
  isAccepted,
  isRejected,
}) {
  const [draft, setDraft] = useState(suggested || "");
  const [editing, setEditing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [status, setStatus] = useState(
    isAccepted ? "accepted" : isRejected ? "rejected" : "pending"
  );
  const textareaRef = useRef(null);

  useEffect(() => {
    setDraft(suggested || "");
  }, [suggested]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [editing]);

  useEffect(() => {
    if (isAccepted) setStatus("accepted");
    else if (isRejected) setStatus("rejected");
    else setStatus("pending");
  }, [isAccepted, isRejected]);

  const charCount = draft.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);
  const overLimit = charCount > MAX_CHARS;

  const handleAccept = () => {
    setStatus("accepted");
    if (onAccept) onAccept(sectionKey);
  };

  const handleReject = () => {
    setStatus("rejected");
    if (onReject) onReject(sectionKey);
  };

  const handleSaveEdit = () => {
    setEditing(false);
    setStatus("accepted");
    if (onEdit) onEdit(sectionKey, draft);
  };

  const handleCancelEdit = () => {
    setDraft(suggested || "");
    setEditing(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      if (onRegenerate) {
        await onRegenerate(sectionKey, original);
      } else {
        await axios.post(`${API_BASE}/api/resume/process-section`, {
          section: sectionKey,
          content: original,
          action: "regenerate",
        });
      }
    } catch (err) {
      console.error("Regenerate failed:", err);
    } finally {
      setRegenerating(false);
    }
  };

  const borderColor = status === "accepted"
    ? "border-green-200"
    : status === "rejected"
      ? "border-red-200"
      : "border-gray-200";

  return (
    <div className={`overflow-hidden rounded-xl border transition-all duration-200 ${borderColor} bg-white shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 uppercase">
            {sectionKey.charAt(0)}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
            {status === "accepted" && (
              <span className="text-xs font-medium text-green-600">Accepted</span>
            )}
            {status === "rejected" && (
              <span className="text-xs font-medium text-red-600">Rejected</span>
            )}
          </div>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshIcon />
          {regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>

      {/* Content area */}
      <div className="border-t border-gray-100 px-5 py-4 space-y-4">
        {/* Original text */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              Original
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-400 italic">
            {original || "No original text provided."}
          </p>
        </div>

        {/* Suggested / editable text */}
        <div className={`rounded-lg border p-4 transition-colors ${
          status === "accepted"
            ? "border-green-200 bg-green-50"
            : status === "rejected"
              ? "border-red-200 bg-red-50"
              : "border-blue-200 bg-blue-50"
        }`}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                status === "accepted"
                  ? "bg-green-200 text-green-700"
                  : status === "rejected"
                    ? "bg-red-200 text-red-700"
                    : "bg-blue-200 text-blue-700"
              }`}>
                {status === "accepted"
                  ? "Accepted"
                  : status === "rejected"
                    ? "Rejected"
                    : editing
                      ? "Editing"
                      : "Suggested"}
              </span>
              <SparklesIcon />
            </div>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <DiffIcon />
              {showDiff ? "Hide" : "Show"} Diff
            </button>
          </div>

          {editing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-blue-300 bg-white p-3 text-sm leading-relaxed text-gray-800 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {draft || suggested}
            </p>
          )}

          {/* Character count */}
          {editing && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    overLimit ? "bg-red-500" : charPercent > 80 ? "bg-amber-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(charPercent, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${overLimit ? "text-red-600" : "text-gray-500"}`}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Diff view */}
        {showDiff && <DiffView original={original} suggested={draft || suggested} />}

        {/* Reasoning */}
        {reasoning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why this change?
            </h4>
            <p className="text-sm leading-relaxed text-amber-800">{reasoning}</p>
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Additional Tips
            </h4>
            <ul className="space-y-1.5">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-purple-800">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {editing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={overLimit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckIcon /> Save Edit
              </button>
              <button
                onClick={handleCancelEdit}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {status === "pending" && (
                <>
                  <button
                    onClick={handleAccept}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <CheckIcon /> Accept Suggestion
                  </button>
                  <button
                    onClick={handleReject}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <XIcon /> Reject
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    <EditIcon /> Custom Edit
                  </button>
                </>
              )}
              {status === "accepted" && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  <EditIcon /> Edit Again
                </button>
              )}
              {status === "rejected" && (
                <button
                  onClick={() => {
                    setStatus("pending");
                    setDraft(suggested || "");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  <RefreshIcon /> Restore Suggestion
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

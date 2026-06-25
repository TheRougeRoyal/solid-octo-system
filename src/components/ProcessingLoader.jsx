import { useState, useEffect, useCallback } from "react";

const SECTIONS = [
  { key: "summary", label: "Summary", icon: "S" },
  { key: "skills", label: "Skills", icon: "K" },
  { key: "experience", label: "Experience", icon: "E" },
  { key: "projects", label: "Projects", icon: "P" },
  { key: "education", label: "Education", icon: "D" },
];

const SpinnerIcon = () => (
  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ProcessingLoader({ sections = [], onComplete, estimatedDuration = 45 }) {
  const [elapsed, setElapsed] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const completedCount = Math.min(activeIndex, sections.length);
  const progress = sections.length > 0 ? (completedCount / sections.length) * 100 : 0;
  const remaining = Math.max(0, estimatedDuration - elapsed);
  const perSection = sections.length > 0 ? Math.ceil(remaining / Math.max(1, sections.length - completedCount)) : 0;

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (sections.length === 0) return;

    const interval = estimatedDuration / sections.length;
    const index = Math.min(Math.floor(elapsed / interval), sections.length - 1);
    setActiveIndex(index);
  }, [elapsed, sections.length, estimatedDuration]);

  useEffect(() => {
    if (sections.length > 0 && completedCount >= sections.length && onComplete) {
      onComplete();
    }
  }, [completedCount, sections.length, onComplete]);

  const getStatus = useCallback(
    (index) => {
      if (index < completedCount) return "completed";
      if (index === completedCount && completedCount < sections.length) return "processing";
      return "pending";
    },
    [completedCount, sections.length]
  );

  if (sections.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
          <svg className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Processing with AI</h2>
        <p className="mt-2 text-sm text-gray-500">
          This may take 30–60 seconds
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>{completedCount} of {sections.length} sections</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time display */}
      <div className="mb-6 flex items-center justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <ClockIcon />
          <span>Elapsed: <span className="font-semibold text-gray-900">{formatTime(elapsed)}</span></span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>Remaining: <span className="font-semibold text-gray-900">{formatTime(remaining)}</span></span>
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-3">
        {sections.map((section, index) => {
          const status = getStatus(index);
          const isProcessing = status === "processing";
          const isCompleted = status === "completed";

          return (
            <div
              key={section.key}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-300 ${
                isProcessing
                  ? "border-blue-300 bg-blue-50 shadow-md shadow-blue-500/10"
                  : isCompleted
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              {/* Status indicator */}
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg font-bold text-sm ${
                isProcessing
                  ? "bg-blue-600 text-white animate-pulse"
                  : isCompleted
                    ? "bg-green-600 text-white"
                    : "bg-gray-300 text-white"
              }`}>
                {isCompleted ? (
                  <CheckCircleIcon />
                ) : isProcessing ? (
                  <SpinnerIcon />
                ) : (
                  <span>{section.icon}</span>
                )}
              </div>

              {/* Label and status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-semibold ${
                    isCompleted ? "text-green-800" : isProcessing ? "text-blue-800" : "text-gray-500"
                  }`}>
                    {section.label}
                  </h4>
                  {isProcessing && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    </span>
                  )}
                </div>
                <p className={`mt-0.5 text-xs ${
                  isCompleted ? "text-green-600" : isProcessing ? "text-blue-600" : "text-gray-400"
                }`}>
                  {isCompleted
                    ? "Done"
                    : isProcessing
                      ? "Analyzing and optimizing..."
                      : "Waiting to process"}
                </p>
              </div>

              {/* ETA for processing section */}
              {isProcessing && perSection > 0 && (
                <span className="flex-shrink-0 text-xs font-medium text-blue-600">
                  ~{perSection}s
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
        <p className="text-xs text-amber-700">
          <span className="font-semibold">Tip:</span> Each section is analyzed by AI for clarity, impact, and keyword optimization.
        </p>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";

const STEPS = [
  { key: "upload", label: "Upload", description: "Upload your resume PDF for AI-powered analysis." },
  { key: "processing", label: "Processing", description: "AI is analyzing each section for clarity, impact, and keywords." },
  { key: "review", label: "Review", description: "Review AI suggestions, accept edits, or write your own changes." },
  { key: "download", label: "Download", description: "Preview and download your optimized resume as a PDF." },
];

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function HelpCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

export default function Header({ step, sectionsEdited = 0, onStepClick, onReset, darkMode, onToggleDark }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);
  const progress = Math.round(((currentStepIndex + 1) / STEPS.length) * 100);

  const currentStepData = STEPS[currentStepIndex] || STEPS[0];

  const canGoBack = step !== "upload";

  const handleStepNav = useCallback(
    (targetKey) => {
      if (!onStepClick) return;
      const targetIndex = STEPS.findIndex((s) => s.key === targetKey);
      if (targetIndex < currentStepIndex) {
        onStepClick(targetKey);
      }
    },
    [currentStepIndex, onStepClick]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
        {/* Logo + title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <LogoIcon />
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
            Resume Optimizer
          </span>
        </div>

        {/* Step indicators */}
        <nav className="ml-4 hidden items-center gap-0 md:flex">
          {STEPS.map((s, i) => {
            const isActive = s.key === step;
            const isDone = i < currentStepIndex;
            const isClickable = i < currentStepIndex;

            return (
              <div key={s.key} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`mx-1 h-px w-8 transition-colors duration-300 ${
                      i <= currentStepIndex ? "bg-blue-400" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
                <button
                  onClick={() => handleStepNav(s.key)}
                  disabled={!isClickable}
                  className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
                      : isDone
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                  } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-blue-500/20 text-white"
                        : isDone
                          ? "bg-green-200 text-green-800"
                          : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  {s.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Mobile step indicator */}
        <div className="ml-2 flex items-center gap-2 md:hidden">
          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white">
            {currentStepIndex + 1}/{STEPS.length}
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {currentStepData.label}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sections edited badge */}
        {sectionsEdited > 0 && (
          <div className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 sm:flex dark:bg-blue-900/30 dark:text-blue-300">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {sectionsEdited} edited
          </div>
        )}

        {/* Help button */}
        <div className="relative">
          <button
            onClick={() => setHelpOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Help"
          >
            <HelpCircleIcon />
          </button>

          {helpOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setHelpOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Step {currentStepIndex + 1}: {currentStepData.label}
                  </h3>
                  <button
                    onClick={() => setHelpOpen(false)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {currentStepData.description}
                </p>
                <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Progress: <span className="text-gray-900 dark:text-white">{progress}%</span>
                    {sectionsEdited > 0 && (
                      <> &middot; <span className="text-blue-600 dark:text-blue-400">{sectionsEdited} section{sectionsEdited !== 1 ? "s" : ""} edited</span></>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Start Over */}
        {canGoBack && (
          <button
            onClick={onReset}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            Start Over
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}

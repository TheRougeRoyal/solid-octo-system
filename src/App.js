import { useState, useCallback } from "react";
import axios from "axios";
import Header from "./components/Header";
import ResumeUploader from "./components/ResumeUploader";
import ProcessingLoader from "./components/ProcessingLoader";
import ResumeSuggestions from "./components/ResumeSuggestions";
import PdfPreview from "./components/PdfPreview";
import { auth } from "./firebase";

const API_BASE = "";
const SECTIONS = ["summary", "skills", "experience", "projects", "education"];

export default function App() {
  const [step, setStep] = useState("upload");
  const [resumeFile, setResumeFile] = useState(null);
  const [extractedChunks, setExtractedChunks] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const sectionsEdited = Object.keys(editedData).length;

  const handleStepClick = useCallback((targetStep) => {
    setStep(targetStep);
  }, []);

  const handleToggleDark = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  const handleUploadComplete = useCallback((file, chunks) => {
    setResumeFile(file);
    setExtractedChunks(chunks);
    setStep("processing");
  }, []);

  const handleProcessingComplete = useCallback(async () => {
    try {
      setError("");
      const endpoint = demoMode ? "/api/resume/demo" : "/api/resume/process";
      const idToken = await auth?.currentUser?.getIdToken();
      const { data } = await axios.post(`${endpoint}`, {
        chunks: extractedChunks,
      }, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      setSuggestions(data.suggestions);
      setStep("review");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Processing failed."
      );
      setStep("upload");
    }
  }, [extractedChunks, demoMode]);

  const handleSectionEdit = useCallback(async (sectionKey, editedText) => {
    setEditedData((prev) => ({ ...prev, [sectionKey]: editedText }));
    try {
      const idToken = await auth?.currentUser?.getIdToken();
      await axios.post(`/api/resume/process-section`, {
        section: sectionKey,
        content: editedText,
      }, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
    } catch (err) {
      console.error("Failed to sync section edit:", err);
    }
  }, []);

  const handleAcceptSuggestion = useCallback(
    (sectionKey) => {
      const suggestion = suggestions[sectionKey];
      if (suggestion) {
        setEditedData((prev) => ({ ...prev, [sectionKey]: suggestion.edited }));
      }
    },
    [suggestions]
  );

  const handleRejectSuggestion = useCallback((sectionKey) => {
    setEditedData((prev) => {
      const next = { ...prev };
      delete next[sectionKey];
      return next;
    });
  }, []);

  const handleAcceptAll = useCallback(() => {
    if (!suggestions) return;
    const all = {};
    SECTIONS.forEach((key) => {
      if (suggestions[key]) {
        all[key] = suggestions[key].edited;
      }
    });
    setEditedData((prev) => ({ ...prev, ...all }));
  }, [suggestions]);

  const handleGeneratePdf = useCallback(async (finalSections) => {
    try {
      setStep("download");
      setEditedData(finalSections);
    } catch (err) {
      setError(err.message || "PDF generation failed.");
    }
  }, []);

  const handleBackToReview = useCallback(() => {
    setStep("review");
  }, []);

  const handleReset = useCallback(() => {
    setStep("upload");
    setResumeFile(null);
    setExtractedChunks(null);
    setSuggestions(null);
    setEditedData({});
    setError("");
  }, []);

  const mergedSuggestions = suggestions
    ? Object.fromEntries(
        SECTIONS.filter((key) => suggestions[key]).map((key) => [
          key,
          {
            ...suggestions[key],
            edited: editedData[key] || suggestions[key].edited,
          },
        ])
      )
    : {};

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}>
      <Header
        step={step}
        sectionsEdited={sectionsEdited}
        onStepClick={handleStepClick}
        onReset={handleReset}
        darkMode={darkMode}
        onToggleDark={handleToggleDark}
      />

      {/* Demo mode banner */}
      {demoMode && (
        <div className="mx-auto max-w-5xl px-6 pt-4">
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Demo Mode</span> — Using mock AI responses for recruiter demo. No API calls made.
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-auto max-w-5xl px-6 pt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 font-medium underline hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="py-6">
        {step === "upload" && (
          <div>
            <ResumeUploader onComplete={handleUploadComplete} />
            <div className="mx-auto mt-4 flex max-w-5xl justify-center px-6">
              <button
                onClick={() => setDemoMode(!demoMode)}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  demoMode
                    ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {demoMode ? "Demo Mode: ON" : "Demo Mode: OFF"}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <ProcessingLoader
            sections={SECTIONS.map((key) => ({
              key,
              label: key.charAt(0).toUpperCase() + key.slice(1),
              icon: key.charAt(0).toUpperCase(),
            }))}
            onComplete={handleProcessingComplete}
            estimatedDuration={45}
          />
        )}

        {step === "review" && (
          <ResumeSuggestions
            suggestions={mergedSuggestions}
            onSectionEdit={handleSectionEdit}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
            onAcceptAll={handleAcceptAll}
            onGeneratePdf={handleGeneratePdf}
          />
        )}

        {step === "download" && (
          <PdfPreview resumeData={editedData} onBack={handleBackToReview} />
        )}
      </main>
    </div>
  );
}

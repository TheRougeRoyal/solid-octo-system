import { useState, useCallback } from "react";
import axios from "axios";
import Header from "./components/Header";
import ResumeUploader from "./components/ResumeUploader";
import ProcessingLoader from "./components/ProcessingLoader";
import ResumeSuggestions from "./components/ResumeSuggestions";
import PdfPreview from "./components/PdfPreview";

const API_BASE = "http://localhost:3001";
const SECTIONS = ["summary", "skills", "experience", "projects", "education"];

export default function App() {
  const [step, setStep] = useState("upload");
  const [resumeFile, setResumeFile] = useState(null);
  const [extractedChunks, setExtractedChunks] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

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
      const { data } = await axios.post(`${API_BASE}/api/resume/process`, {
        chunks: extractedChunks,
      });
      setSuggestions(data);
      setStep("review");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Processing failed."
      );
      setStep("upload");
    }
  }, [extractedChunks]);

  const handleSectionEdit = useCallback(async (sectionKey, editedText) => {
    setEditedData((prev) => ({ ...prev, [sectionKey]: editedText }));
    try {
      await axios.post(`${API_BASE}/api/resume/process-section`, {
        section: sectionKey,
        content: editedText,
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
          <ResumeUploader onComplete={handleUploadComplete} />
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

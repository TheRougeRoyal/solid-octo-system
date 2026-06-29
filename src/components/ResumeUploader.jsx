import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { auth } from "../firebase";

const SECTIONS = ["summary", "skills", "experience", "projects", "education"];

export default function ResumeUploader({ onComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setError("");
    setResult(null);
  };

  const handleFile = (selected) => {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    setError("");
    setFile(selected);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const idToken = await auth?.currentUser?.getIdToken();
      const { data } = await axios.post(
        "/api/resume/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        }
      );
      setResult(data);
      if (onComplete) onComplete(file, data.chunks);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Upload failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Resume Optimizer
      </h1>

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <svg
          className="mb-3 h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        {file ? (
          <p className="text-sm font-medium text-gray-700">{file.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Drag &amp; drop a PDF here, or{" "}
              <span className="font-medium text-blue-600">browse</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">PDF only</p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload & Extract"}
        </button>
        <button
          onClick={reset}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
          <svg
            className="h-5 w-5 animate-spin text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Extracting resume sections...
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Extracted Sections
          </h2>

          {SECTIONS.map((section) => {
            const content =
              result[section] ||
              result.chunks?.[section] ||
              result.data?.[section];

            if (!content) return null;

            const text =
              typeof content === "string"
                ? content
                : Array.isArray(content)
                  ? content.join("\n")
                  : JSON.stringify(content, null, 2);

            return (
              <div
                key={section}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {section}
                </h3>
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {text}
                </pre>
              </div>
            );
          })}

          {/* Fallback: show raw JSON if no known sections found */}
          {SECTIONS.every(
            (s) => !result[s] && !result.chunks?.[s] && !result.data?.[s]
          ) && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Response
              </h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

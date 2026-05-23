"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface Props {
  onUploadSuccess?: () => void;
}

export default function ResumeUpload({ onUploadSuccess }: Props) {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setError(null);
    setFile(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setMessage(null);
      setError(null);
      setFile(dropped);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!file) {
      setError("Please select a PDF or DOCX file.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only PDF or DOCX files are allowed.");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE.replace(/\/$/, "")}/resume`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Upload failed.");
      }

      setMessage(`${file.name} uploaded successfully.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploadSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="upload-card">
      <div
        className={`drop-zone ${dragging ? "drop-zone--active" : ""} ${file ? "drop-zone--has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="sr-only"
        />

        {file ? (
          <div className="drop-zone__file">
            <span className="drop-zone__file-icon">
              {file.name.endsWith(".pdf") ? "📄" : "📝"}
            </span>
            <div>
              <p className="drop-zone__file-name">{file.name}</p>
              <p className="drop-zone__file-size">
                {(file.size / 1024).toFixed(1)} KB · Click to change
              </p>
            </div>
          </div>
        ) : (
          <div className="drop-zone__empty">
            <div className="drop-zone__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="drop-zone__title">Drop your CV here</p>
            <p className="drop-zone__sub">PDF or DOCX · or click to browse</p>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-feedback upload-feedback--error">
          <span>⚠</span> {error}
        </div>
      )}
      {message && (
        <div className="upload-feedback upload-feedback--success">
          <span>✓</span> {message}
        </div>
      )}

      <button type="submit" className="upload-btn" disabled={loading || !file}>
        {loading ? (
          <>
            <span className="upload-btn__spinner" />
            Embedding…
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Upload
          </>
        )}
      </button>
    </form>
  );
}

"use client";

import { MutableRefObject, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import InterviewSession from "./InterviewSession";

const API_BASE = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

interface UploadedFile {
  id: number;
  file_name: string;
  chroma_document_id: string;
  created_at: string;
}

interface Props {
  refetchRef?: MutableRefObject<(() => void) | null>;
}

export default function UploadedFilesList({ refetchRef }: Props) {
  const { getToken } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<UploadedFile | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch files");
      setFiles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);
  useEffect(() => {
    if (refetchRef) refetchRef.current = fetchFiles;
  }, [refetchRef]);

  if (loading)
    return (
      <div className="files-loading">
        <span className="files-loading__dot" />
        <span
          className="files-loading__dot"
          style={{ animationDelay: "0.15s" }}
        />
        <span
          className="files-loading__dot"
          style={{ animationDelay: "0.3s" }}
        />
      </div>
    );

  if (error)
    return (
      <div className="files-error">
        <span>⚠</span> {error}
        <button onClick={fetchFiles} className="files-error__retry">
          Retry
        </button>
      </div>
    );

  if (files.length === 0)
    return (
      <div className="files-empty">
        <div className="files-empty__icon">📂</div>
        <p className="files-empty__title">No CVs yet</p>
        <p className="files-empty__sub">Upload one above to get started.</p>
      </div>
    );

  return (
    <div className="files-section">
      <div className="files-grid">
        {files.map((file, i) => {
          const isActive = activeFile?.id === file.id;
          const ext = file.file_name.split(".").pop()?.toUpperCase() ?? "FILE";
          const date = new Date(file.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          return (
            <div
              key={file.id}
              className={`file-card ${isActive ? "file-card--active" : ""}`}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className="file-card__top">
                <div className="file-card__thumb">
                  <span className="file-card__ext">{ext}</span>
                </div>
                <div className="file-card__meta">
                  <p className="file-card__name" title={file.file_name}>
                    {file.file_name}
                  </p>
                  <p className="file-card__date">{date}</p>
                </div>
              </div>

              <button
                className={`file-card__btn ${isActive ? "file-card__btn--active" : ""}`}
                onClick={() => setActiveFile(isActive ? null : file)}
              >
                {isActive ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Close
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Start Interview
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {activeFile && (
        <div className="interview-wrapper">
          <InterviewSession
            key={activeFile.id}
            docId={activeFile.chroma_document_id}
            fileId={activeFile.id}
            fileName={activeFile.file_name}
            onClose={() => setActiveFile(null)}
          />
        </div>
      )}
    </div>
  );
}

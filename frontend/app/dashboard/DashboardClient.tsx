"use client";

import { useRef } from "react";
import ResumeUpload from "./ResumeUpload";
import UploadedFilesList from "@/components/UploadedFilesList";

export default function DashboardClient() {
  const refetchRef = useRef<() => void>(null);

  return (
    <div className="dashboard-body">
      <div className="dashboard-section">
        <div className="section-header">
          <span className="section-pill">
            <span className="pill-dot" />
            Upload
          </span>
          <h2 className="section-heading">Add a new CV</h2>
          <p className="section-desc">
            Upload a PDF or DOCX file — we'll parse, chunk, and embed it so the
            AI can ask you targeted questions.
          </p>
        </div>
        <ResumeUpload onUploadSuccess={() => refetchRef.current?.()} />
      </div>

      <div className="divider" />

      <div className="dashboard-section">
        <div className="section-header">
          <span className="section-pill section-pill--purple">
            <span className="pill-dot pill-dot--purple" />
            Library
          </span>
          <h2 className="section-heading">Your CVs</h2>
          <p className="section-desc">
            Click <strong>Start Interview</strong> on any file to begin an
            AI-powered voice interview based on that CV.
          </p>
        </div>
        <UploadedFilesList refetchRef={refetchRef} />
      </div>
    </div>
  );
}
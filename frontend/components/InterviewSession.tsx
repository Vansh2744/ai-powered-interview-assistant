"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useInterview } from "@/hooks/useInterview";

interface Props {
  docId: string;
  fileId: number;
  fileName: string;
  onClose?: () => void;
}

export default function InterviewSession({
  docId,
  fileId,
  fileName,
  onClose,
}: Props) {
  const { getToken } = useAuth();
  const startedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [numQ, setNumQ] = useState(5);
  const [started, setStarted] = useState(false);

  const {
    status,
    currentQuestion,
    currentIndex,
    totalQuestions,
    transcript,
    history,
    feedback,
    error,
    startInterview,
    stopRecording,
    disconnect,
  } = useInterview(getToken);

  useEffect(() => {
    containerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    if (status !== "idle") {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [status]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const handleStart = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    startInterview(docId, fileId, numQ);
  };

  const handleClose = () => {
    disconnect();
    onClose?.();
  };

  return (
    <div className="interview-container" ref={containerRef}>
      {" "}
      <h2>🎙 {fileName}</h2>
      <div className={`status-badge status-${status}`}>{status}</div>
      {!started && (
        <div className="question-picker">
          <p className="question-picker__label">How many questions?</p>
          <div className="question-picker__options">
            {[3, 5, 7, 10].map((n) => (
              <button
                key={n}
                className={`question-picker__opt ${numQ === n ? "question-picker__opt--active" : ""}`}
                onClick={() => setNumQ(n)}
              >
                {numQ === n && <span className="picker-check">✓</span>}
                {n}
              </button>
            ))}
          </div>
          <p className="picker-selected-hint">
            Selected: <strong>{numQ} questions</strong>
          </p>
          <button className="upload-btn" onClick={handleStart}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Interview
          </button>
        </div>
      )}
      {status === "connecting" && (
        <p style={{ color: "var(--muted)" }}>Connecting…</p>
      )}
      {status === "ready" && (
        <p style={{ color: "var(--muted)" }}>
          Generating {totalQuestions} questions from your CV…
        </p>
      )}
      {(status === "question" || status === "recording") && (
        <div className="question-panel">
          <p className="question-counter">
            Question {currentIndex} of {totalQuestions}
          </p>
          <p className="question-text">{currentQuestion}</p>
          {status === "question" && (
            <p className="listening-hint">🔊 Listen to the question…</p>
          )}
          {status === "recording" && (
            <button className="stop-btn" onClick={stopRecording}>
              ⏹ Done Answering
            </button>
          )}
        </div>
      )}
      {status === "processing" && (
        <div className="processing-panel">
          <p>Transcribing your answer…</p>
          {transcript && (
            <blockquote className="transcript">"{transcript}"</blockquote>
          )}
        </div>
      )}
      {status === "evaluating" && (
        <div className="evaluating-panel">
          <span className="upload-btn__spinner" />
          <p>AI is evaluating your interview…</p>
        </div>
      )}
      {status === "complete" && (
        <div className="summary-panel">
          <h3>Interview Complete 🎉</h3>

          {feedback && (
            <div className="feedback-card">
              <div className="feedback-score">
                <span className="feedback-score__value">
                  {feedback.overall_score}
                </span>
                <span className="feedback-score__label">/ 100</span>
              </div>
              <p className="feedback-summary">{feedback.summary}</p>

              <div className="feedback-grid">
                <div className="feedback-section">
                  <p className="feedback-section__title">💪 Strengths</p>
                  <ul className="feedback-list feedback-list--green">
                    {feedback.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="feedback-section">
                  <p className="feedback-section__title">📈 Improvements</p>
                  <ul className="feedback-list feedback-list--amber">
                    {feedback.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="feedback-cv">
                <p className="feedback-section__title">📄 CV Feedback</p>
                <p className="feedback-cv__text">{feedback.cv_feedback}</p>
              </div>
            </div>
          )}

          <details className="qa-details">
            <summary>View full transcript</summary>
            <div className="qa-list">
              {history.map((qa, i) => (
                <div key={i} className="qa-item">
                  <p>
                    <strong>Q{i + 1}:</strong> {qa.question}
                  </p>
                  <p>
                    <strong>Your Answer:</strong> {qa.answer}
                  </p>
                </div>
              ))}
            </div>
          </details>

          <button onClick={handleClose}>Close</button>
        </div>
      )}
      {status === "error" && (
        <div className="error-panel">
          <p>Error: {error}</p>
          <button
            className="retry-btn"
            onClick={() => {
              startedRef.current = false;
              setStarted(false);
              disconnect();
            }}
          >
            Retry
          </button>
          <button onClick={handleClose}>Cancel</button>
        </div>
      )}
    </div>
  );
}

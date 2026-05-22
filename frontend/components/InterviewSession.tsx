"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { useInterview } from "@/hooks/useInterview";

interface Props {
  docId: string;
  fileName: string;
  onClose?: () => void;
}

export default function InterviewSession({ docId, fileName, onClose }: Props) {
  const { getToken } = useAuth();
  const startedRef = useRef(false); // ✅ prevent double-start in Strict Mode

  const {
    status,
    currentQuestion,
    currentIndex,
    totalQuestions,
    transcript,
    history,
    error,
    startInterview,
    stopRecording,
    disconnect,
  } = useInterview(getToken);

  useEffect(() => {
    startInterview(docId);

    return () => {
      disconnect(); // ✅ kills WS on unmount, isStarting resets in disconnect()
    };
  }, [docId]);

  return (
    <div className="interview-container">
      <h2>Interview: {fileName}</h2>
      <div className={`status-badge status-${status}`}>{status}</div>

      {status === "connecting" && <p>Connecting…</p>}

      {status === "ready" && (
        <p>Preparing {totalQuestions} questions from your CV…</p>
      )}

      {(status === "question" || status === "recording") && (
        <div className="question-panel">
          <p className="question-counter">
            Question {currentIndex} of {totalQuestions}
          </p>
          <p className="question-text">{currentQuestion}</p>

          {status === "question" && (
            <p className="listening-hint">🔊 Listening to question…</p>
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
          <p>Processing your answer…</p>
          {transcript && (
            <blockquote className="transcript">"{transcript}"</blockquote>
          )}
        </div>
      )}

      {status === "complete" && (
        <div className="summary-panel">
          <h3>Interview Complete 🎉</h3>
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
          <button
            onClick={() => {
              disconnect();
              onClose?.();
            }}
          >
            Close
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="error-panel">
          <p>Error: {error}</p>
          <button
            onClick={() => {
              startedRef.current = false; // ✅ allow retry
              startInterview(docId);
            }}
          >
            Retry
          </button>
          <button
            onClick={() => {
              disconnect();
              onClose?.();
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

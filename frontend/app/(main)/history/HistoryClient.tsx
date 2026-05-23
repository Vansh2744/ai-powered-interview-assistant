"use client";

import { useState } from "react";

interface Question { index: number; question: string; answer: string | null; }
interface Feedback {
  overall_score: number; summary: string; cv_feedback: string;
  strengths: string[]; improvements: string[];
}
interface Session {
  session_id: number; file_name: string; num_questions: number;
  completed: number; created_at: string;
  questions: Question[]; feedback: Feedback | null;
}

export default function HistoryClient({ sessions }: { sessions: Session[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (sessions.length === 0) return (
    <div className="files-empty">
      <div className="files-empty__icon">🎙</div>
      <p className="files-empty__title">No interviews yet</p>
      <p className="files-empty__sub">Complete an interview to see history here.</p>
    </div>
  );

  return (
    <div className="history-list">
      {sessions.map((s) => {
        const isOpen = expanded === s.session_id;
        const date   = new Date(s.created_at).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        });

        return (
          <div key={s.session_id} className={`history-card ${isOpen ? "history-card--open" : ""}`}>

            <button className="history-card__row" onClick={() => setExpanded(isOpen ? null : s.session_id)}>
              <div className="history-card__left">
                <div className="file-card__thumb">
                  <span className="file-card__ext">{s.file_name.split(".").pop()?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="history-card__filename">{s.file_name}</p>
                  <p className="history-card__meta">
                    {date} · {s.num_questions} questions ·&nbsp;
                    <span className={s.completed ? "badge-complete" : "badge-incomplete"}>
                      {s.completed ? "Completed" : "Incomplete"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="history-card__right">
                {s.feedback && (
                  <div className="history-score">
                    <span className="history-score__value">{s.feedback.overall_score}</span>
                    <span className="history-score__label">/100</span>
                  </div>
                )}
                <svg
                  className={`history-chevron ${isOpen ? "history-chevron--open" : ""}`}
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {isOpen && (
              <div className="history-card__body">

                {s.feedback && (
                  <div className="feedback-card">
                    <div className="feedback-score">
                      <span className="feedback-score__value">{s.feedback.overall_score}</span>
                      <span className="feedback-score__label">/ 100</span>
                    </div>
                    <p className="feedback-summary">{s.feedback.summary}</p>

                    <div className="feedback-grid">
                      <div className="feedback-section">
                        <p className="feedback-section__title">💪 Strengths</p>
                        <ul className="feedback-list feedback-list--green">
                          {s.feedback.strengths.map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                      <div className="feedback-section">
                        <p className="feedback-section__title">📈 Improvements</p>
                        <ul className="feedback-list feedback-list--amber">
                          {s.feedback.improvements.map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="feedback-cv">
                      <p className="feedback-section__title">📄 CV Feedback</p>
                      <p className="feedback-cv__text">{s.feedback.cv_feedback}</p>
                    </div>
                  </div>
                )}

                <div className="qa-list">
                  {s.questions.map((q) => (
                    <div key={q.index} className="qa-item">
                      <p><strong>Q{q.index}:</strong> {q.question}</p>
                      <p><strong>Answer:</strong> {q.answer ?? <em>No answer recorded</em>}</p>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
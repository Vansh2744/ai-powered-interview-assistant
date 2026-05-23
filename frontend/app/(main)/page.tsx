"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

const FEATURES = [
  {
    icon: "🎙️",
    cls: "icon-blue",
    title: "CV-Based Questions",
    desc: "Upload your CV and get interview questions tailored specifically to your experience, skills, and projects.",
  },
  {
    icon: "🔊",
    cls: "icon-purple",
    title: "Voice Interviews",
    desc: "Answer questions out loud just like a real interview. Our AI listens, transcribes, and evaluates your spoken answers.",
  },
  {
    icon: "⚡",
    cls: "icon-green",
    title: "Instant AI Feedback",
    desc: "Get a detailed score, strengths, improvements, and CV feedback the moment your interview ends.",
  },
  {
    icon: "📋",
    cls: "icon-amber",
    title: "Interview History",
    desc: "Review every past session — questions asked, your answers, and the AI feedback — all in one place.",
  },
  {
    icon: "🎯",
    cls: "icon-red",
    title: "Flexible Practice",
    desc: "Choose how many questions you want — 3, 5, 7, or 10 — and practice at your own pace.",
  },
  {
    icon: "🔄",
    cls: "icon-cyan",
    title: "Unlimited Sessions",
    desc: "Upload multiple CVs and run as many interview sessions as you need to feel fully prepared.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Upload your CV",
    desc: "Upload a PDF or DOCX. We parse and embed it into our AI so every question is relevant to you.",
  },
  {
    step: "02",
    title: "Pick your session",
    desc: "Choose how many questions you want. The AI generates them from your actual CV content.",
  },
  {
    step: "03",
    title: "Answer by voice",
    desc: "Listen to each question spoken aloud, then record your answer. Just like the real thing.",
  },
  {
    step: "04",
    title: "Get your feedback",
    desc: "Receive a score, strengths, areas to improve, and detailed CV feedback instantly.",
  },
];

export default function HomePage() {
  const { isSignedIn } = useAuth();

  return (
    <>
      <section className="hero">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="hero-badge">
          <span className="badge-dot" />
          AI-Powered Interview Preparation
        </div>

        <h1 className="hero-title">
          Ace every interview with{" "}
          <span className="accent-blue">AI feedback</span> that actually{" "}
          <span className="accent-purple">gets you</span>
        </h1>

        <p className="hero-sub">
          Upload your CV, answer voice questions tailored to your experience,
          and get instant AI feedback — all in one place built for engineers and
          professionals.
        </p>

        <div className="hero-ctas">
          {isSignedIn ? (
            <Link href="/dashboard" className="cta-primary">
              Go to Dashboard →
            </Link>
          ) : (
            <Link href="/sign-up" className="cta-primary">
              Start for free →
            </Link>
          )}
          <Link href="/practice" className="cta-secondary">
            See how it works
          </Link>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">CV</span>
            <span className="stat-label">Personalised</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">Voice</span>
            <span className="stat-label">Powered</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">AI</span>
            <span className="stat-label">Feedback</span>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <span className="section-label">How it works</span>
        <h2 className="section-title">From CV to feedback in minutes</h2>
        <p className="section-sub">
          No generic questions. Every interview is built around your actual
          background and experience.
        </p>

        <div className="steps-grid">
          {STEPS.map((s) => (
            <div className="step-card" key={s.step}>
              <span className="step-number">{s.step}</span>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="features">
        <span className="section-label">What we offer</span>
        <h2 className="section-title">Everything you need to prepare</h2>
        <p className="section-sub">
          From mock interviews to detailed feedback — we've built the tools that
          actually move the needle.
        </p>

        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className={`feature-icon ${f.cls}`}>{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {!isSignedIn && (
        <section className="cta-section">
          <div className="cta-card">
            <h2>Ready to land your dream job?</h2>
            <p>
              Upload your CV and start your first AI-powered voice interview in
              under 2 minutes.
            </p>
            <div className="hero-ctas">
              <Link href="/sign-up" className="cta-primary">
                Create free account →
              </Link>
              <Link href="/sign-in" className="cta-secondary">
                Already have an account
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SignOutButton, UserButton, useAuth } from "@clerk/nextjs";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Interviews", href: "/interviews" },
  { label: "Practice", href: "/practice" },
  { label: "Results", href: "/results" },
];

const FEATURES = [
  {
    icon: "🎙️",
    cls: "icon-blue",
    title: "Mock Interviews",
    desc: "Simulate real interview environments with timed sessions and adaptive difficulty.",
  },
  {
    icon: "⚡",
    cls: "icon-purple",
    title: "Instant AI Feedback",
    desc: "Get detailed analysis on your answers, tone, structure, and technical accuracy.",
  },
  {
    icon: "📈",
    cls: "icon-green",
    title: "Progress Tracking",
    desc: "Visualise your improvement over time with detailed performance metrics and charts.",
  },
  {
    icon: "🏢",
    cls: "icon-amber",
    title: "Company-specific Prep",
    desc: "Curated question banks tailored to Google, Meta, Amazon, and 50+ top companies.",
  },
  {
    icon: "🧠",
    cls: "icon-red",
    title: "Behavioural + Technical",
    desc: "Covers STAR method responses, system design, DSA, and domain-specific rounds.",
  },
  {
    icon: "🔄",
    cls: "icon-cyan",
    title: "Unlimited Practice",
    desc: "No caps, no paywalls for core practice. Grind as much as you need to feel ready.",
  },
];

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav className={`navbar${scrolled ? " scrolled" : ""}`} ref={menuRef}>
        <div className="nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo">
            <span className="logo-dot" />
            InterviewAI
          </Link>

          {/* Desktop links */}
          <ul className="nav-links">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>

          {/* Desktop auth actions */}
          <div className="nav-actions">
            {isSignedIn ? (
              <>
                <Link href="/dashboard" className="btn-start">
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link href="/sign-in" className="btn-signin">
                  Sign in
                </Link>
                <Link href="/sign-up" className="btn-start">
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Burger (mobile only) */}
          <button
            className={`burger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile dropdown */}
        <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="mobile-menu-divider" />
          <div className="mobile-menu-actions h-full">
            {isSignedIn ? (
              <SignOutButton>
                <button
                  className="bg-red-600 w-full flex items-center justify-center cursor-pointer rounded-lg px-4 py-3 text-white font-medium text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign out
                </button>
              </SignOutButton>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="btn-signin"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-start"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
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
          Practice real interview questions, get instant AI-driven feedback, and
          track your progress — all in one place built for engineers and
          professionals.
        </p>

        <div className="hero-ctas">
          {!isSignedIn && (
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
            <span className="stat-value">10k+</span>
            <span className="stat-label">Questions</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">94%</span>
            <span className="stat-label">Success rate</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">50+</span>
            <span className="stat-label">Companies</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
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

      {/* ── BOTTOM CTA ── */}
      {!isSignedIn && (
        <section className="cta-section">
          <div className="cta-card">
            <h2>Ready to land your dream job?</h2>
            <p>
              Join thousands of candidates who practised smarter and interviewed
              with confidence.
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

      {/* ── FOOTER ── */}
      <footer>
        <p>
          © 2025 <span>InterviewAI</span> — Built with Next.js, FastAPI &amp;
          Clerk
        </p>
      </footer>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SignOutButton, UserButton, useAuth } from "@clerk/nextjs";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "History", href: "/history" },
];

export default function Navbar() {
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`} ref={menuRef}>
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <span className="logo-dot" />
          InterviewAI
        </Link>

        <ul className="nav-links">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label}</Link>
            </li>
          ))}
        </ul>

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

      <div className={`mobile-menu${menuOpen ? " open" : ""}`}>
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
            {l.label}
          </Link>
        ))}
        <div className="mobile-menu-divider" />
        <div className="mobile-menu-actions">
          {isSignedIn ? (
            <SignOutButton>
              <button
                className="bg-red-600 w-full flex items-center justify-center cursor-pointer rounded-lg px-4 h-10 text-white font-medium text-sm"
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
  );
}

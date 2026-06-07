"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Modelos", href: "/modelos" },
  { label: "Proceso", href: "/#proceso" },
  { label: "Nosotros", href: "/#nosotros" },
  { label: "Contacto", href: "/#contacto" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const textClass = scrolled || menuOpen ? "text-stone-700" : "text-white/80";
  const hoverClass = "hover:text-sage-600";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? "bg-white/96 backdrop-blur-md shadow-sm border-b border-stone-100"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sage-600 rounded-md flex items-center justify-center shrink-0">
            <HouseIcon className="w-4 h-4 text-white" />
          </div>
          <span
            className={`font-bold text-xl tracking-tight transition-colors ${
              scrolled || menuOpen ? "text-stone-900" : "text-white"
            }`}
          >
            Habitatt
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                className={`text-sm font-medium transition-colors ${textClass} ${hoverClass}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Link
            href="/modelos"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sage-600 hover:bg-sage-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-sage-600/20 hover:-translate-y-px"
          >
            Ver modelos
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
          className={`md:hidden p-2 rounded-md transition-colors ${
            scrolled || menuOpen
              ? "text-stone-700 hover:bg-stone-100"
              : "text-white hover:bg-white/10"
          }`}
        >
          {menuOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-stone-100 px-6 py-5 space-y-1">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 text-stone-700 font-medium hover:text-sage-600 transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="pt-3">
            <Link
              href="/modelos"
              onClick={() => setMenuOpen(false)}
              className="block text-center px-5 py-3 bg-sage-600 text-white font-semibold rounded-xl"
            >
              Ver modelos
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

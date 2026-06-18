"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

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
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-sm border-b border-stone-100" : "border-b border-stone-100"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icono.png" alt="" height={38} width={38} className="h-[38px] w-auto object-contain" />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-xl tracking-tight" style={{ color: "#D4B06A", fontFamily: "var(--font-montserrat)" }}>
              MOVARA
            </span>
            <span className="text-xs tracking-[0.18em] mt-0.5" style={{ color: "#2F2F2F", fontFamily: "var(--font-poppins)", fontWeight: 400 }}>
              Espacios Modulares
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="text-sm font-medium text-[#2F2F2F] hover:text-sage-500 transition-colors"
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
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-sage-500/25 hover:-translate-y-px"
          >
            Ver modelos
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú"
          className="md:hidden p-2 rounded-md text-stone-700 hover:bg-stone-100 transition-colors"
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
              className="block py-2.5 text-[#2F2F2F] font-medium hover:text-sage-500 transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="pt-3">
            <Link
              href="/modelos"
              onClick={() => setMenuOpen(false)}
              className="block text-center px-5 py-3 bg-sage-500 hover:bg-sage-600 text-white font-semibold rounded-xl transition-colors"
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

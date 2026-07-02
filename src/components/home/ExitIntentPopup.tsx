"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { trackExitIntentLead } from "@/lib/meta-pixel";

const LS_SHOWN = "movara_exit_popup_shown";
const LS_SUBMITTED = "movara_exit_popup_submitted";
const MIN_TIME_MS = 20_000;            // must spend 20s on page before eligible
const INTERNAL_CLICK_GRACE_MS = 2_000; // don't fire within 2s of an internal click
const HIDDEN_TRIGGER_MS = 3_000;       // mobile: page must be hidden for 3s

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const readyRef = useRef(false);
  const shownRef = useRef(false);
  const startTime = useRef(Date.now());
  const lastInternalClickMs = useRef(0);

  function tryShow() {
    if (shownRef.current) return;
    if (!readyRef.current) return;
    if (Date.now() - startTime.current < MIN_TIME_MS) return;
    if (Date.now() - lastInternalClickMs.current < INTERNAL_CLICK_GRACE_MS) return;
    if (window.location.pathname.startsWith("/configurador")) return;
    shownRef.current = true;
    localStorage.setItem(LS_SHOWN, "true");
    setOpen(true);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/configurador")) return;
    if (localStorage.getItem(LS_SUBMITTED) === "true") return;
    if (localStorage.getItem(LS_SHOWN) === "true") {
      localStorage.removeItem(LS_SHOWN);
      return;
    }

    readyRef.current = true;
    startTime.current = Date.now();

    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Track internal link clicks — suppress trigger for 2s after any internal navigation
    const handleInternalClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("/") || href.startsWith("#")) {
        lastInternalClickMs.current = Date.now();
      }
    };
    document.addEventListener("click", handleInternalClick, true);

    const cleanups: (() => void)[] = [
      () => document.removeEventListener("click", handleInternalClick, true),
    ];

    if (isMobile) {
      // Mobile trigger 1: back button via history state
      window.history.pushState({ exitIntent: true }, "");
      const handlePopState = () => {
        tryShow();
        window.history.pushState({ exitIntent: true }, "");
      };
      window.addEventListener("popstate", handlePopState);
      cleanups.push(() => window.removeEventListener("popstate", handlePopState));

      // Mobile trigger 2: tab hidden for more than HIDDEN_TRIGGER_MS
      let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
      const handleVisibilityChange = () => {
        if (document.hidden) {
          hiddenTimer = setTimeout(tryShow, HIDDEN_TRIGGER_MS);
        } else {
          if (hiddenTimer) { clearTimeout(hiddenTimer); hiddenTimer = null; }
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      cleanups.push(() => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (hiddenTimer) clearTimeout(hiddenTimer);
      });
    } else {
      // Desktop: mouse leaving viewport through the top
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 5) tryShow();
      };
      document.addEventListener("mouseleave", handleMouseLeave);
      cleanups.push(() => document.removeEventListener("mouseleave", handleMouseLeave));
    }

    const handleMainFormSubmit = () => {
      localStorage.setItem(LS_SUBMITTED, "true");
      readyRef.current = false;
    };
    window.addEventListener("movara:form:submitted", handleMainFormSubmit);
    cleanups.push(() => window.removeEventListener("movara:form:submitted", handleMainFormSubmit));

    return () => cleanups.forEach((fn) => fn());
  }, []);

  function close() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email) || status !== "idle") return;
    setStatus("sending");
    try {
      await fetch("/api/leads-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "exit_intent" }),
      });
    } catch {
      // fail silently — success screen regardless
    }
    localStorage.setItem(LS_SUBMITTED, "true");
    trackExitIntentLead();
    setStatus("sent");
  }

  if (!open) return null;

  const emailOk = isValidEmail(email);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Antes de irte"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-[#D4B06A]/40 bg-[#2F2F2F] shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-8 py-8">
          {status === "sent" ? (
            // Success state
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[#D4B06A]/15 border border-[#D4B06A]/30 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-[#D4B06A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">¡Listo!</h3>
              <p className="text-stone-300 text-sm leading-relaxed mb-6">
                Te contactamos a la brevedad.
              </p>
              <button
                onClick={close}
                className="w-full py-3 rounded-xl font-semibold text-sm text-[#2F2F2F] bg-[#D4B06A] hover:bg-[#C9A35D] transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Logo */}
              <div className="flex items-center gap-2.5 mb-6">
                <Image
                  src="/icono.png"
                  alt="MOVARA"
                  width={36}
                  height={36}
                  className="h-9 w-auto object-contain"
                />
                <div className="flex flex-col leading-none gap-[2px]">
                  <span
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontWeight: 700,
                      fontSize: "1.4rem",
                      color: "#D4B06A",
                      lineHeight: 1,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    MOVARA
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontWeight: 400,
                      fontSize: "0.5rem",
                      color: "#D4B06A",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      lineHeight: 1,
                    }}
                  >
                    Espacios Modulares
                  </span>
                </div>
              </div>

              {/* Títulos */}
              <h2 className="text-white text-2xl font-bold mb-2 leading-tight">
                Antes de irte…
              </h2>
              <p className="text-[#D4B06A] font-semibold text-sm mb-3">
                Recibí nuestras últimas novedades y catálogo completo
              </p>
              <p className="text-stone-400 text-sm leading-relaxed mb-6">
                Precios actualizados, modelos disponibles y condiciones de lanzamiento — directo a tu email.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className={[
                      "w-full px-4 py-3 rounded-xl bg-white/8 text-white placeholder:text-stone-500 text-sm outline-none transition-colors border",
                      touched && !emailOk
                        ? "border-red-500/60 focus:border-red-400"
                        : emailOk
                        ? "border-green-500/60 focus:border-green-400"
                        : "border-white/15 focus:border-[#D4B06A]/50",
                    ].join(" ")}
                  />
                  {touched && !emailOk && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">Ingresá un email válido</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!emailOk || status === "sending"}
                  className="w-full py-3 rounded-xl font-semibold text-sm text-[#2F2F2F] bg-[#D4B06A] hover:bg-[#C9A35D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-3"
                >
                  {status === "sending" ? "Enviando…" : "Quiero recibirlo"}
                </button>

                <button
                  type="button"
                  onClick={close}
                  className="w-full text-center text-stone-500 text-xs hover:text-stone-300 transition-colors py-1"
                >
                  No gracias, prefiero no recibirlo
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

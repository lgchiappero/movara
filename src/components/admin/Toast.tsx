"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  /** Toast verde con ✓. Mensaje por defecto: "Guardado correctamente". */
  showSuccess: (message?: string) => void;
  /** Toast rojo con ✗. */
  showError: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 2500;
const EXIT_DURATION_MS = 200;

/** Hook para disparar toasts desde cualquier formulario del panel admin —
 * requiere que el árbol esté envuelto en <ToastProvider> (ya puesto en
 * src/app/admin/(dashboard)/layout.tsx, cubre todo /admin salvo /admin/login). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, kind, message }]);
  }, []);

  const showSuccess = useCallback((message = "Guardado correctamente") => push("success", message), [push]);
  const showError = useCallback((message: string) => push("error", message), [push]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" role="region" aria-label="Notificaciones">
        {toasts.map((t) => (
          <ToastBanner key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBanner({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setEntered(true));
    const leaveTimer = setTimeout(() => setLeaving(true), TOAST_DURATION_MS);
    const removeTimer = setTimeout(onDismiss, TOAST_DURATION_MS + EXIT_DURATION_MS);
    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = entered && !leaving;

  return (
    <div
      role="status"
      className={`pointer-events-auto min-w-[260px] max-w-sm rounded-xl px-4 py-3 shadow-lg flex items-center gap-2.5 text-sm font-semibold transition-all duration-200 ease-out ${
        toast.kind === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      } ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3"}`}
    >
      <span aria-hidden className="text-base leading-none">
        {toast.kind === "success" ? "✓" : "✗"}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}

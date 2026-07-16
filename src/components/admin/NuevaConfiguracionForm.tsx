"use client";

import { useState } from "react";
import Link from "next/link";

const inputClass =
  "w-full rounded-lg border border-[#E5E5E5] px-3 py-2.5 text-sm text-[#2F2F2F] bg-white focus:outline-none focus:ring-2 focus:ring-sage-500";

export default function NuevaConfiguracionForm() {
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nombre.trim().length < 3) {
      setError("Ingresá el nombre del cliente.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/configuraciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteNombre: nombre.trim(), clienteWhatsapp: whatsapp.trim() }),
      });
      if (!res.ok) throw new Error("request-failed");
      const json = await res.json();
      setLink(`${window.location.origin}/pedido/${json.id}`);
    } catch {
      setError("No pudimos crear la configuración. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  if (link) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-3">
          <p className="text-sm text-stone-600">
            Configuración creada para <strong className="text-[#2F2F2F]">{nombre}</strong>.
            Pegale este link por WhatsApp:
          </p>
          <p className="text-xs break-all font-mono bg-[#F9F5EE] rounded-lg p-3 text-[#2F2F2F]">
            {link}
          </p>
          <button
            type="button"
            onClick={copiar}
            className="w-full py-2.5 border border-sage-500 text-sage-600 font-bold text-sm rounded-xl hover:bg-sage-50 transition-colors"
          >
            {copied ? "¡Copiado!" : "Copiar link"}
          </button>
        </div>
        <Link
          href="/admin/configuraciones"
          className="block text-center text-sm text-stone-500 hover:text-stone-700"
        >
          Volver a la lista
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E5E5] p-5 space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[#2F2F2F]">Nombre del cliente</span>
        <input
          className={inputClass}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Juan García"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-[#2F2F2F]">WhatsApp del cliente (opcional)</span>
        <input
          className={inputClass}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ej: +54 9 11 1234-5678"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
      >
        {submitting ? "Creando..." : "Crear y generar link"}
      </button>
    </form>
  );
}

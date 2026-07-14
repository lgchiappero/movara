"use client";

import { useState } from "react";

export default function PedidoLinkGeneratorPage() {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generar() {
    const id = crypto.randomUUID();
    const url = `${window.location.origin}/pedido/${id}`;
    setLink(url);
    setCopied(false);
  }

  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center space-y-6">
      <div className="bg-[#2F2F2F] rounded-2xl p-8">
        <p className="text-sage-500 text-xs font-bold uppercase tracking-widest mb-2">
          Herramienta interna
        </p>
        <h1 className="text-white text-lg font-bold mb-4">Generar link de pedido</h1>
        <p className="text-stone-300 text-sm mb-6">
          Generá un link único para mandarle al cliente por WhatsApp.
        </p>
        <button
          type="button"
          onClick={generar}
          className="w-full py-3 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
        >
          Generar link nuevo
        </button>
      </div>

      {link && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 space-y-3">
          <p className="text-xs break-all text-[#2F2F2F] font-mono">{link}</p>
          <button
            type="button"
            onClick={copiar}
            className="w-full py-2.5 border border-sage-500 text-sage-600 font-bold text-sm rounded-xl hover:bg-sage-50 transition-colors"
          >
            {copied ? "¡Copiado!" : "Copiar link"}
          </button>
        </div>
      )}
    </div>
  );
}

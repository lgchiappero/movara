"use client";

import { useState } from "react";

/** Link personal de /mi-pedido para mandarle al cliente por WhatsApp. */
export default function LinkSeguimiento({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <input
        readOnly
        value={url}
        aria-label="Link de seguimiento"
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 text-xs rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-stone-600 bg-stone-50"
      />
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 text-xs font-bold text-sage-600 hover:underline"
      >
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

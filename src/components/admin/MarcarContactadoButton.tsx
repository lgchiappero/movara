"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarcarContactadoButton({ id, contactado }: { id: string; contactado: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactado: !contactado }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-50 ${
        contactado
          ? "bg-sage-100 text-sage-700 hover:bg-sage-200"
          : "bg-red-50 text-red-600 hover:bg-red-100"
      }`}
    >
      {contactado ? "✓ Contactado" : "Marcar contactado"}
    </button>
  );
}

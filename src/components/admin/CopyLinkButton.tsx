"use client";

import { useEffect, useState } from "react";

export default function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copiar() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs break-all font-mono bg-white/10 rounded-lg p-3 text-stone-200">
        {origin}
        {path}
      </p>
      <button
        type="button"
        onClick={copiar}
        className="w-full py-2.5 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-xl transition-colors"
      >
        {copied ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}

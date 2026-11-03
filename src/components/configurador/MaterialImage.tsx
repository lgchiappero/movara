"use client";

import { useState } from "react";
import Image from "next/image";

/** Foto de una opción de material. Si el archivo todavía no existe (ej. las
 *  fotos del amoblamiento del baño), muestra el color de la opción o un
 *  placeholder oscuro con "Foto próximamente": cuando se copia el archivo en
 *  public/ con ese nombre aparece sola, sin tocar código. */
export function MaterialImage({
  src,
  alt,
  sizes,
  fit = "cover",
  fallbackColor,
  fallbackBorder,
}: {
  src: string;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  fallbackColor?: string;
  fallbackBorder?: boolean;
}) {
  const [error, setError] = useState(false);
  if (error) {
    if (fallbackColor) {
      return <div className={`w-full h-full ${fallbackBorder ? "border border-stone-300" : ""}`} style={{ backgroundColor: fallbackColor }} />;
    }
    return (
      <div role="img" aria-label={`${alt} — foto próximamente`} className="w-full h-full bg-[#2F2F2F] flex flex-col items-center justify-center gap-1.5 p-2 text-center">
        <svg aria-hidden className="w-6 h-6 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5A1.5 1.5 0 014.5 6h2.379a1.5 1.5 0 001.06-.44l.622-.62A1.5 1.5 0 019.62 4.5h4.758a1.5 1.5 0 011.06.44l.622.62a1.5 1.5 0 001.06.44H19.5A1.5 1.5 0 0121 7.5v10.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18V7.5z" />
          <circle cx="12" cy="12.75" r="3.25" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">Foto próximamente</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={`object-center ${fit === "contain" ? "object-contain" : "object-cover"}`}
      onError={() => setError(true)}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { trackViewContent } from "@/lib/meta-pixel";

/** ViewContent al abrir la ficha de un modelo, una vez por modelo. */
export default function TrackViewContent({ modelo }: { modelo: string }) {
  const medido = useRef<string | null>(null);

  useEffect(() => {
    if (medido.current === modelo) return;
    medido.current = modelo;
    trackViewContent(modelo);
  }, [modelo]);

  return null;
}

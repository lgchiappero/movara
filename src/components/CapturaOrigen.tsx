"use client";

import { useEffect } from "react";
import { capturarOrigen } from "@/lib/origen-visita/navegador";

/** Guarda el origen de la primera visita (ver src/lib/origen-visita). */
export default function CapturaOrigen() {
  useEffect(() => {
    capturarOrigen();
  }, []);
  return null;
}

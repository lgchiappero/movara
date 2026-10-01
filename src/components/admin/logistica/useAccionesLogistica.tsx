"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CostoLogisticaModal, { type EnvioOpcion } from "@/components/admin/logistica/CostoLogisticaModal";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";

export type AccionesLogistica = {
  abrirNuevo: (envioId?: string) => void;
  abrirEditar: (costo: CostoLogisticaRow) => void;
  eliminar: (costo: CostoLogisticaRow) => Promise<{ ok: boolean; error?: string }>;
};

/** Alta / edición / baja de costos de logística internacional, con su modal. */
export function useAccionesLogistica(envios: EnvioOpcion[]): { acciones: AccionesLogistica; modales: React.ReactNode } {
  const router = useRouter();
  const [nuevo, setNuevo] = useState<{ envioId?: string } | null>(null);
  const [editar, setEditar] = useState<CostoLogisticaRow | null>(null);

  const acciones: AccionesLogistica = {
    abrirNuevo: (envioId) => setNuevo({ envioId }),
    abrirEditar: (costo) => setEditar(costo),
    eliminar: async (costo) => {
      try {
        const res = await fetch(`/api/admin/logistica/${costo.id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        return res.ok ? { ok: true } : { ok: false, error: json?.error };
      } catch {
        return { ok: false, error: "No pudimos eliminar. Probá de nuevo." };
      }
    },
  };

  const modales = (
    <>
      {nuevo && (
        <CostoLogisticaModal
          envios={envios}
          envioIdInicial={nuevo.envioId}
          onClose={() => setNuevo(null)}
          onSaved={() => {
            setNuevo(null);
            router.refresh();
          }}
        />
      )}
      {editar && (
        <CostoLogisticaModal
          envios={envios}
          costo={editar}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null);
            router.refresh();
          }}
        />
      )}
    </>
  );

  return { acciones, modales };
}

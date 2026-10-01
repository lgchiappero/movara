"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NuevoAcuerdoModal from "@/components/admin/NuevoAcuerdoModal";
import RegistrarMovimientoModal from "@/components/admin/RegistrarMovimientoModal";
import GestionCobranzaTab from "@/components/admin/cobranza/GestionCobranzaTab";
import type { AcuerdoConDetalle, UnidadOpcion } from "@/lib/cobranza/types";

export default function PagosPanel({
  acuerdos,
  unidades,
  rol,
  estadoInicial,
  monedaInicial,
}: {
  acuerdos: AcuerdoConDetalle[];
  unidades: UnidadOpcion[];
  rol: string;
  estadoInicial?: string;
  monedaInicial?: "USD" | "ARS";
}) {
  const router = useRouter();
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [movimientoAcuerdo, setMovimientoAcuerdo] = useState<AcuerdoConDetalle | null>(null);

  return (
    <div className="space-y-6">
      <GestionCobranzaTab
        tipo="pago"
        acuerdos={acuerdos}
        estadoInicial={estadoInicial}
        monedaInicial={monedaInicial}
        rol={rol}
        onNuevoAcuerdo={() => setNuevoAbierto(true)}
        onRegistrarMovimiento={(acuerdo) => setMovimientoAcuerdo(acuerdo)}
      />

      {nuevoAbierto && (
        <NuevoAcuerdoModal
          tipo="pago"
          unidades={unidades}
          onClose={() => setNuevoAbierto(false)}
          onCreated={() => {
            setNuevoAbierto(false);
            router.refresh();
          }}
        />
      )}

      {movimientoAcuerdo && (
        <RegistrarMovimientoModal
          acuerdo={movimientoAcuerdo}
          onClose={() => setMovimientoAcuerdo(null)}
          onSaved={() => {
            setMovimientoAcuerdo(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

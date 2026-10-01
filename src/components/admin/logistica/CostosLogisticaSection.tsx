"use client";

import TablaCostosLogistica from "@/components/admin/logistica/TablaCostosLogistica";
import { useAccionesLogistica } from "@/components/admin/logistica/useAccionesLogistica";
import type { EnvioOpcion } from "@/components/admin/logistica/CostoLogisticaModal";
import { totalesLogistica, type CostoLogisticaRow } from "@/lib/cobranza/logistica";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Sección de /admin/envios/[id]: costos de logística internacional del
 * envío completo, con totales pagados por moneda. */
export default function CostosLogisticaSection({
  envio,
  costos,
  rol,
}: {
  envio: EnvioOpcion;
  costos: CostoLogisticaRow[];
  rol: string;
}) {
  const { acciones, modales } = useAccionesLogistica([envio]);
  const { pagado, pendiente } = totalesLogistica(costos);
  const hayPendiente = pendiente.USD > 0 || pendiente.ARS > 0;

  return (
    <div id="logistica" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Costos de logística internacional</h2>
        <button
          type="button"
          onClick={() => acciones.abrirNuevo(envio.id)}
          className="px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          + Nuevo costo de logística
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-3">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Total pagado</p>
          <p className="font-bold text-[#2F2F2F]">{formatMoneda(pagado.USD, "USD")}</p>
          <p className="text-sm font-bold text-stone-500">{formatMoneda(pagado.ARS, "ARS")}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-3">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Pendiente</p>
          <p className={`font-bold ${hayPendiente ? "text-red-700" : "text-[#2F2F2F]"}`}>{formatMoneda(pendiente.USD, "USD")}</p>
          <p className="text-sm font-bold text-stone-500">{formatMoneda(pendiente.ARS, "ARS")}</p>
        </div>
      </div>

      <TablaCostosLogistica costos={costos} rol={rol} acciones={acciones} />
      {modales}
    </div>
  );
}

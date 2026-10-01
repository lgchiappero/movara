"use client";

import { useState } from "react";
import Link from "next/link";
import PagosPorUnidadGrid from "@/components/admin/planes/PagosPorUnidadGrid";
import { useAccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";
import TablaCostosLogistica from "@/components/admin/logistica/TablaCostosLogistica";
import { useAccionesLogistica } from "@/components/admin/logistica/useAccionesLogistica";
import type { EnvioOpcion } from "@/components/admin/logistica/CostoLogisticaModal";
import type { CostoLogisticaRow, TotalesPorMoneda } from "@/lib/cobranza/logistica";
import type { AcuerdoConDetalle, UnidadOpcion } from "@/lib/cobranza/types";

export type TabPagos = "unidad" | "logistica";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Pagos a proveedores — dinero que sale. Dos tabs:
 * - Por unidad: fábrica y logística nacional, un plan de cuotas por pago
 * - Logística internacional: costos del envío completo (contenedor) */
export default function PagosPanel({
  planes,
  costos,
  unidades,
  envios,
  rol,
  metricas,
  tabInicial = "unidad",
  estadoInicial,
}: {
  planes: AcuerdoConDetalle[];
  costos: CostoLogisticaRow[];
  unidades: UnidadOpcion[];
  envios: EnvioOpcion[];
  rol: string;
  metricas: {
    pagadoMes: TotalesPorMoneda;
    pendiente: TotalesPorMoneda;
    vencidos: number;
  };
  tabInicial?: TabPagos;
  estadoInicial?: "pendiente" | "parcial" | "pagado" | "vencido" | "con_saldo";
}) {
  const [tab, setTab] = useState<TabPagos>(tabInicial);
  const planesUI = useAccionesPlanes({ tipo: "pago", unidades });
  const logisticaUI = useAccionesLogistica(envios);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tarjeta label="Pagado este mes">
          <p className="text-lg font-bold text-[#2F2F2F]">{formatMoneda(metricas.pagadoMes.USD, "USD")}</p>
          <p className="text-sm font-bold text-stone-500">{formatMoneda(metricas.pagadoMes.ARS, "ARS")}</p>
        </Tarjeta>
        <Tarjeta label="Pendiente de pagar" href="/admin/pagos?estado=con_saldo">
          <p className="text-lg font-bold text-[#2F2F2F]">{formatMoneda(metricas.pendiente.USD, "USD")}</p>
          <p className="text-sm font-bold text-stone-500">{formatMoneda(metricas.pendiente.ARS, "ARS")}</p>
        </Tarjeta>
        <Tarjeta label="Pagos vencidos" href="/admin/pagos?estado=vencido">
          <p className={`text-2xl font-bold ${metricas.vencidos > 0 ? "text-red-700" : "text-[#2F2F2F]"}`}>{metricas.vencidos}</p>
        </Tarjeta>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ["unidad", `Por unidad (${planes.length})`],
            ["logistica", `Logística internacional (${costos.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              tab === key ? "bg-[#2F2F2F] text-white" : "bg-white border border-[#E5E5E5] text-stone-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "unidad" ? (
        <PagosPorUnidadGrid
          key={estadoInicial ?? "todos"}
          planes={planes}
          rol={rol}
          acciones={planesUI.acciones}
          estadoInicial={estadoInicial}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">Costos del envío / contenedor</h2>
            <button
              type="button"
              onClick={() => logisticaUI.acciones.abrirNuevo()}
              className="px-3 py-1.5 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
            >
              + Nuevo costo de logística
            </button>
          </div>
          <TablaCostosLogistica costos={costos} rol={rol} acciones={logisticaUI.acciones} mostrarEnvio />
        </div>
      )}

      {planesUI.modales}
      {logisticaUI.modales}
    </div>
  );
}

function Tarjeta({ label, href, children }: { label: string; href?: string; children: React.ReactNode }) {
  const contenido = (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">{label}</p>
      {children}
    </>
  );
  const clase = "block bg-white rounded-2xl border border-[#E5E5E5] p-5";
  return href ? (
    <Link href={href} className={`${clase} hover:border-[#D4B06A] transition-colors`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

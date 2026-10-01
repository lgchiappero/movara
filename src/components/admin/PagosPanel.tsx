"use client";

import Link from "next/link";
import PlanesUnidadGrid from "@/components/admin/planes/PlanesUnidadGrid";
import { useAccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";
import type { FilaPlanUnidad, FiltroEstadoPlan } from "@/lib/cobranza/planes-unidad";
import type { UnidadOpcion } from "@/lib/cobranza/types";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Pagos a proveedores — dinero que sale. Vista por unidad (total, pagado,
 * pendiente) con los pagos directos a cada proveedor. */
export default function PagosPanel({
  filas,
  unidades,
  rol,
  metricas,
  estadoInicial,
  monedaInicial,
}: {
  filas: FilaPlanUnidad[];
  unidades: UnidadOpcion[];
  rol: string;
  metricas: {
    /** Pagado en el mes en curso, por moneda. */
    pagadoMes: { USD: number; ARS: number };
    /** Saldo pendiente de pagar de todos los planes, por moneda. */
    pendiente: { USD: number; ARS: number };
    unidadesCompletasMes: number;
    unidadesConVencidas: number;
  };
  estadoInicial?: FiltroEstadoPlan;
  monedaInicial?: "USD" | "ARS";
}) {
  const { acciones, modales } = useAccionesPlanes({ tipo: "pago", unidades });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta label="Pagado este mes">
          <p className="text-lg font-bold text-[#2F2F2F]">{formatMoneda(metricas.pagadoMes.USD, "USD")}</p>
          <p className="text-sm font-bold text-stone-500">{formatMoneda(metricas.pagadoMes.ARS, "ARS")}</p>
        </Tarjeta>
        <Tarjeta label="Pendiente de pagar" href="/admin/pagos?estado=con_saldo">
          <p className="text-lg font-bold text-[#2F2F2F]">{formatMoneda(metricas.pendiente.USD, "USD")}</p>
          <p className="text-sm font-bold text-stone-500">{formatMoneda(metricas.pendiente.ARS, "ARS")}</p>
        </Tarjeta>
        <Tarjeta label="Unidades con pagos completos este mes" href="/admin/pagos?estado=saldado">
          <p className="text-2xl font-bold text-emerald-700">{metricas.unidadesCompletasMes}</p>
        </Tarjeta>
        <Tarjeta label="Unidades con pagos vencidos" href="/admin/pagos?estado=vencidas">
          <p className={`text-2xl font-bold ${metricas.unidadesConVencidas > 0 ? "text-red-700" : "text-[#2F2F2F]"}`}>
            {metricas.unidadesConVencidas}
          </p>
        </Tarjeta>
      </div>

      <PlanesUnidadGrid
        key={`${estadoInicial ?? "todos"}|${monedaInicial ?? ""}`}
        tipo="pago"
        filas={filas}
        rol={rol}
        acciones={acciones}
        estadoInicial={estadoInicial}
        monedaInicial={monedaInicial}
      />

      {modales}
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

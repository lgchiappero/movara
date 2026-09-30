"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONCEPTO_LABELS,
  ESTADO_ACUERDO_LABELS,
  ESTADO_ACUERDO_COLORS,
} from "@/lib/cobranza/constantes";
import { sumaImportes, estadoAcuerdo } from "@/lib/cobranza/calc";
import NuevoAcuerdoModal from "@/components/admin/NuevoAcuerdoModal";
import type { AcuerdoConDetalle, UnidadOpcion } from "@/components/admin/CobranzaPanel";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export default function CobranzaUnidadSection({
  unidad,
  acuerdos,
}: {
  unidad: UnidadOpcion;
  acuerdos: AcuerdoConDetalle[];
}) {
  const router = useRouter();
  const [nuevoTipo, setNuevoTipo] = useState<"cobro" | "pago" | null>(null);

  const acuerdosCobro = acuerdos.filter((a) => a.tipo === "cobro");
  const acuerdosPago = acuerdos.filter((a) => a.tipo === "pago");

  // Totales en USD — no hay tasa de cambio en el sistema, así que sumar
  // ARS y USD en un mismo número no sería correcto. Los acuerdos en ARS
  // igual se listan abajo, solo no entran en el total.
  const cobradoUSD = sumaImportes(
    acuerdosCobro.filter((a) => a.moneda === "USD").flatMap((a) => a.movimientos)
  );
  const pagadoUSD = sumaImportes(acuerdosPago.filter((a) => a.moneda === "USD").flatMap((a) => a.movimientos));

  return (
    <div id="cobranza">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600">Cobranza</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNuevoTipo("cobro")}
            className="px-3 py-1.5 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors"
          >
            + Nuevo cobro
          </button>
          <button
            type="button"
            onClick={() => setNuevoTipo("pago")}
            className="px-3 py-1.5 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors"
          >
            + Nuevo pago
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 text-center">
          <p className="text-lg font-bold text-[#2F2F2F]">{formatMoneda(cobradoUSD, "USD")}</p>
          <p className="text-xs text-stone-500 mt-0.5">Cobrado</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 text-center">
          <p className="text-lg font-bold text-[#2F2F2F]">{formatMoneda(pagadoUSD, "USD")}</p>
          <p className="text-xs text-stone-500 mt-0.5">Pagado</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 text-center">
          <p className={`text-lg font-bold ${cobradoUSD - pagadoUSD >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatMoneda(cobradoUSD - pagadoUSD, "USD")}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">Margen</p>
        </div>
      </div>

      {acuerdos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-sm text-stone-400">
          Todavía no hay cobros ni pagos para esta unidad.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Cliente/Proveedor</th>
                <th className="px-4 py-3 font-medium">Concepto</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {acuerdos.map((a) => {
                const pagado = sumaImportes(a.movimientos);
                const estado = estadoAcuerdo(a.totalAcordado, pagado, a.cuotas);
                return (
                  <tr
                    key={a.id}
                    onClick={() => router.push("/admin/cobranza")}
                    className="border-b border-[#F0F0F0] last:border-0 hover:bg-stone-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-stone-600">{a.tipo === "cobro" ? "Cobro" : "Pago"}</td>
                    <td className="px-4 py-3 font-medium text-[#2F2F2F]">{a.contraparte}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {CONCEPTO_LABELS[a.concepto as keyof typeof CONCEPTO_LABELS] ?? a.concepto}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{formatMoneda(a.totalAcordado, a.moneda)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_ACUERDO_COLORS[estado]}`}>
                        {ESTADO_ACUERDO_LABELS[estado]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {nuevoTipo && (
        <NuevoAcuerdoModal
          tipo={nuevoTipo}
          unidades={[unidad]}
          unidadIdInicial={unidad.id}
          onClose={() => setNuevoTipo(null)}
          onCreated={() => {
            setNuevoTipo(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

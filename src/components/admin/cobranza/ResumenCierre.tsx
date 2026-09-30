"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { CONCEPTO_LABELS, MODALIDAD_LABELS, TIPO_ACUERDO_LABELS } from "@/lib/cobranza/constantes";
import type { CierreRow } from "@/lib/cobranza/types";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type PagoDelPeriodo = {
  id: string;
  fecha: string;
  unidadNumero: string | null;
  contraparte: string;
  tipo: string;
  concepto: string;
  moneda: string;
  importe: number;
  modalidad: string;
};

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatFecha(value: string): string {
  return new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export default function ResumenCierre({ cierre }: { cierre: CierreRow }) {
  const [pagos, setPagos] = useState<PagoDelPeriodo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/admin/cobranza/cierres/${cierre.id}/pagos`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelado) setPagos(json.pagos ?? []);
      })
      .catch(() => {
        if (!cancelado) setError("No pudimos cargar el detalle de este período.");
      });
    return () => {
      cancelado = true;
    };
  }, [cierre.id]);

  const margenARS = cierre.totalCobradoARS - cierre.totalPagadoARS;

  function exportarExcel() {
    if (!pagos) return;
    const rows = pagos.map((p) => ({
      Fecha: formatFecha(p.fecha),
      Unidad: p.unidadNumero ?? "Sin número",
      "Cliente/Proveedor": p.contraparte,
      Tipo: TIPO_ACUERDO_LABELS[p.tipo as keyof typeof TIPO_ACUERDO_LABELS] ?? p.tipo,
      Concepto: CONCEPTO_LABELS[p.concepto as keyof typeof CONCEPTO_LABELS] ?? p.concepto,
      Moneda: p.moneda,
      Importe: p.importe,
      Modalidad: MODALIDAD_LABELS[p.modalidad as keyof typeof MODALIDAD_LABELS] ?? p.modalidad,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Pagos");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Concepto: "Cobrado USD", Monto: cierre.totalCobradoUSD },
        { Concepto: "Cobrado ARS", Monto: cierre.totalCobradoARS },
        { Concepto: "Pagado USD", Monto: cierre.totalPagadoUSD },
        { Concepto: "Pagado ARS", Monto: cierre.totalPagadoARS },
        { Concepto: "Margen USD", Monto: cierre.margenUSD },
        { Concepto: "Margen ARS", Monto: margenARS },
      ]),
      "Subtotales"
    );
    XLSX.writeFile(wb, `cierre-${MESES[cierre.mes - 1].toLowerCase()}-${cierre.anio}.xlsx`);
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Período</p>
          <p className="font-bold text-[#2F2F2F]">
            {MESES[cierre.mes - 1]} {cierre.anio}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Fecha de cierre</p>
          <p className="font-bold text-[#2F2F2F]">{formatFecha(cierre.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Cerrado por</p>
          <p className="font-bold text-[#2F2F2F]">{cierre.cerradoPor}</p>
        </div>
      </div>
      {cierre.notas && <p className="text-sm text-stone-500 italic">{cierre.notas}</p>}

      {/* Subtotales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Cobrado USD</p>
          <p className="font-bold text-[#2F2F2F]">{formatMoneda(cierre.totalCobradoUSD, "USD")}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Cobrado ARS</p>
          <p className="font-bold text-[#2F2F2F]">{formatMoneda(cierre.totalCobradoARS, "ARS")}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Pagado USD</p>
          <p className="font-bold text-[#2F2F2F]">{formatMoneda(cierre.totalPagadoUSD, "USD")}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Pagado ARS</p>
          <p className="font-bold text-[#2F2F2F]">{formatMoneda(cierre.totalPagadoARS, "ARS")}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Margen USD</p>
          <p className={`font-bold ${cierre.margenUSD >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatMoneda(cierre.margenUSD, "USD")}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Margen ARS</p>
          <p className={`font-bold ${margenARS >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatMoneda(margenARS, "ARS")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={exportarExcel}
        disabled={!pagos}
        className="px-4 py-2 bg-white border border-[#E5E5E5] hover:border-stone-300 disabled:opacity-50 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
      >
        Descargar Excel
      </button>

      {/* Tabla completa de pagos */}
      <div className="bg-white rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Unidad</th>
              <th className="px-3 py-2 font-medium">Cliente/Proveedor</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Moneda</th>
              <th className="px-3 py-2 font-medium">Importe</th>
              <th className="px-3 py-2 font-medium">Modalidad</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!error && pagos === null && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-stone-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!error && pagos !== null && pagos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-stone-400">
                  Este período no tuvo pagos.
                </td>
              </tr>
            )}
            {pagos?.map((p) => (
              <tr key={p.id} className="border-b border-[#F0F0F0] last:border-0">
                <td className="px-3 py-2 text-[#2F2F2F] font-medium whitespace-nowrap">{formatFecha(p.fecha)}</td>
                <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{p.unidadNumero ?? "Sin número"}</td>
                <td className="px-3 py-2 text-stone-600">{p.contraparte}</td>
                <td className="px-3 py-2 text-stone-600">
                  {TIPO_ACUERDO_LABELS[p.tipo as keyof typeof TIPO_ACUERDO_LABELS] ?? p.tipo}
                </td>
                <td className="px-3 py-2 text-stone-600">
                  {CONCEPTO_LABELS[p.concepto as keyof typeof CONCEPTO_LABELS] ?? p.concepto}
                </td>
                <td className="px-3 py-2 text-stone-600">{p.moneda}</td>
                <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{formatMoneda(p.importe, p.moneda)}</td>
                <td className="px-3 py-2 text-stone-600">
                  {MODALIDAD_LABELS[p.modalidad as keyof typeof MODALIDAD_LABELS] ?? p.modalidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

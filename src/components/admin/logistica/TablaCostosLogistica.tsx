"use client";

import Link from "next/link";
import { CONCEPTO_LOGISTICA_LABELS } from "@/lib/cobranza/constantes";
import { ordenarCostos, type CostoLogisticaRow } from "@/lib/cobranza/logistica";
import EliminarButton from "@/components/admin/EliminarButton";
import { isAdmin } from "@/lib/admin/roles";
import type { AccionesLogistica } from "@/components/admin/logistica/useAccionesLogistica";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const th = "px-2 py-2 font-medium";
const td = "px-2 py-2";
const soloDesktop = "hidden md:table-cell";

/** Costos de logística internacional, del más reciente al más viejo. Con
 * `mostrarEnvio` incluye las columnas Envío (PI) y Contenedor (vista global
 * en /admin/pagos); sin ella, es la lista dentro de un envío. */
export default function TablaCostosLogistica({
  costos,
  rol,
  acciones,
  mostrarEnvio = false,
}: {
  costos: CostoLogisticaRow[];
  rol: string;
  acciones: AccionesLogistica;
  mostrarEnvio?: boolean;
}) {
  if (costos.length === 0) {
    return <p className="text-sm text-stone-400 px-1 py-4">Todavía no hay costos de logística internacional cargados.</p>;
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E5E5] text-left text-stone-500 text-xs uppercase tracking-wide">
            {mostrarEnvio && <th className={th}>Envío (PI)</th>}
            {mostrarEnvio && <th className={`${th} ${soloDesktop}`}>Contenedor</th>}
            <th className={th}>Concepto</th>
            <th className={`${th} ${soloDesktop}`}>Moneda</th>
            <th className={`${th} text-right`}>Importe</th>
            <th className={th}>Estado</th>
            <th className={`${th} ${soloDesktop}`}>Fecha</th>
            <th className={th}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ordenarCostos(costos).map((c) => (
            <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0 align-top">
              {mostrarEnvio && (
                <td className={`${td} whitespace-nowrap`}>
                  <Link href={`/admin/envios/${c.envioId}`} className="font-medium text-[#2F2F2F] hover:text-sage-600 hover:underline underline-offset-2">
                    {c.envioNumeroPI ?? "Sin PI"}
                  </Link>
                </td>
              )}
              {mostrarEnvio && <td className={`${td} ${soloDesktop} text-stone-600`}>{c.envioContenedor ?? "—"}</td>}
              <td className={`${td} text-stone-700`}>
                {CONCEPTO_LOGISTICA_LABELS[c.concepto as keyof typeof CONCEPTO_LOGISTICA_LABELS] ?? c.concepto}
                {c.descripcion && <span className="block text-xs text-stone-400">{c.descripcion}</span>}
                {c.prorrateado && (
                  <span
                    className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700"
                    title={c.prorrateos.map((p) => `${p.unidadNumero ?? "Sin número"}: ${formatMoneda(p.importe, c.moneda)}`).join("\n")}
                  >
                    Prorrateado ÷{c.prorrateos.length}
                  </span>
                )}
              </td>
              <td className={`${td} ${soloDesktop} text-stone-600`}>{c.moneda}</td>
              <td className={`${td} text-right whitespace-nowrap text-stone-700`}>{formatMoneda(c.importe, c.moneda)}</td>
              <td className={`${td} whitespace-nowrap`}>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    c.estado === "pagado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {c.estado === "pagado" ? "Pagado" : "Pendiente"}
                </span>
                {c.comprobanteSignedUrl && (
                  <a href={c.comprobanteSignedUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-sage-600 hover:text-sage-700 mt-0.5">
                    Comprobante
                  </a>
                )}
              </td>
              <td className={`${td} ${soloDesktop} whitespace-nowrap text-stone-600`}>{formatFecha(c.fecha)}</td>
              <td className={`${td} whitespace-nowrap text-right space-x-2`}>
                <button type="button" onClick={() => acciones.abrirEditar(c)} className="text-stone-500 hover:text-stone-700 font-medium text-xs">
                  Editar
                </button>
                {isAdmin(rol) && (
                  <EliminarButton
                    label="Eliminar"
                    confirmTitle="¿Eliminar este costo de logística?"
                    confirmText={
                      c.prorrateado
                        ? "Se borra el costo y su prorrateo entre las unidades. Esta acción no se puede deshacer."
                        : "Esta acción no se puede deshacer."
                    }
                    successMessage="Costo eliminado"
                    onEliminar={() => acciones.eliminar(c)}
                    className="text-red-500 hover:text-red-700 font-medium text-xs"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

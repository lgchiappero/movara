"use client";

import { CONCEPTO_LABELS, MODALIDAD_LABELS } from "@/lib/cobranza/constantes";
import type { FilaPlanUnidad } from "@/lib/cobranza/planes-unidad";
import {
  vistaPagoProveedor,
  ordenarPagosProveedor,
  ESTADO_PAGO_PROVEEDOR_LABELS,
  ESTADO_PAGO_PROVEEDOR_COLORS,
} from "@/lib/cobranza/pagos-proveedor";
import EliminarButton from "@/components/admin/EliminarButton";
import { isAdmin } from "@/lib/admin/roles";
import type { AccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

/** Pagos a proveedores de UNA unidad: registros directos (no planes con
 * cuotas), del más reciente al más viejo, cada uno con editar y eliminar. */
export default function PagosProveedorDetalle({
  fila,
  rol,
  acciones,
  ahora,
}: {
  fila: FilaPlanUnidad;
  rol: string;
  acciones: AccionesPlanes;
  ahora: Date;
}) {
  const pagos = ordenarPagosProveedor(fila.planes.map((p) => vistaPagoProveedor(p, ahora)));

  return (
    <div className="bg-white rounded-xl p-4 space-y-3" data-testid={`detalle-${fila.key}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <Dato label="Total" valor={formatMoneda(fila.totalPlan, fila.moneda)} />
          <Dato label="Pagado" valor={formatMoneda(fila.pagado, fila.moneda)} />
          <Dato
            label="Pendiente"
            valor={formatMoneda(fila.saldo, fila.moneda)}
            className={fila.saldo > 0 ? "text-red-700" : "text-emerald-700"}
          />
        </div>
        <button
          type="button"
          onClick={() => acciones.abrirNuevoPlan(fila.unidad.id)}
          className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          + Nuevo pago a proveedor
        </button>
      </div>

      {pagos.length === 0 ? (
        <p className="text-sm text-stone-400">Todavía no hay pagos a proveedores cargados para esta unidad.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Proveedor</th>
                <th className="px-3 py-2 font-medium">Concepto</th>
                <th className="px-3 py-2 font-medium">Descripción</th>
                <th className="px-3 py-2 font-medium">Importe</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Comprobante</th>
                <th className="px-3 py-2 font-medium">Notas</th>
                <th className="px-3 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.acuerdo.id} className="border-b border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2 text-[#2F2F2F] font-medium whitespace-nowrap">{formatFecha(p.fecha)}</td>
                  <td className="px-3 py-2 text-stone-600">{p.acuerdo.contraparte}</td>
                  <td className="px-3 py-2 text-stone-600">
                    {CONCEPTO_LABELS[p.acuerdo.concepto as keyof typeof CONCEPTO_LABELS] ?? p.acuerdo.concepto}
                  </td>
                  <td className="px-3 py-2 text-stone-600">{p.acuerdo.descripcion ?? "—"}</td>
                  <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                    {formatMoneda(p.importe, p.acuerdo.moneda)}
                    {p.estado === "parcial" && (
                      <span className="block text-stone-400">pagado {formatMoneda(p.pagado, p.acuerdo.moneda)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${ESTADO_PAGO_PROVEEDOR_COLORS[p.estado]}`}>
                      {ESTADO_PAGO_PROVEEDOR_LABELS[p.estado]}
                    </span>
                    {p.modalidad && (
                      <span className="block text-stone-400 mt-0.5">
                        {MODALIDAD_LABELS[p.modalidad as keyof typeof MODALIDAD_LABELS] ?? p.modalidad}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {p.comprobanteSignedUrl ? (
                      <a
                        href={p.comprobanteSignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sage-600 hover:text-sage-700 font-medium"
                      >
                        Ver
                      </a>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-stone-500 max-w-[160px] truncate" title={p.acuerdo.notas ?? ""}>
                    {p.acuerdo.notas ?? "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {p.legado ? (
                      <span className="text-stone-400 mr-2" title="Pago con varias cuotas (formato anterior)">
                        Formato anterior
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => acciones.abrirEditarPlan(p.acuerdo)}
                        className="text-stone-500 hover:text-stone-700 font-medium mr-2"
                      >
                        Editar
                      </button>
                    )}
                    {isAdmin(rol) && (
                      <EliminarButton
                        label="Eliminar"
                        confirmTitle="¿Eliminar este pago a proveedor?"
                        confirmText={
                          p.pagado > 0
                            ? "Se borra el pago y su comprobante registrado. Esta acción no se puede deshacer."
                            : "Esta acción no se puede deshacer."
                        }
                        successMessage="Pago eliminado"
                        onEliminar={() => acciones.eliminarPlan(p.acuerdo)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor, className }: { label: string; valor: string; className?: string }) {
  return (
    <div>
      <p className="text-xs text-stone-400 uppercase tracking-wide">{label}</p>
      <p className={`font-bold ${className ?? "text-[#2F2F2F]"}`}>{valor}</p>
    </div>
  );
}

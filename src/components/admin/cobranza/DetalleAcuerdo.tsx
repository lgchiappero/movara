"use client";

import {
  CONCEPTO_LABELS,
  MODALIDAD_LABELS,
  ESTADO_CUOTA_LABELS,
  ESTADO_CUOTA_COLORS,
} from "@/lib/cobranza/constantes";
import { sumaImportes } from "@/lib/cobranza/calc";
import EliminarButton from "@/components/admin/EliminarButton";
import { isAdmin } from "@/lib/admin/roles";
import type { AcuerdoConDetalle, MovimientoDetalle } from "@/lib/cobranza/types";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

export default function DetalleAcuerdo({
  acuerdo,
  movido,
  pendiente,
  rol,
  onRegistrarMovimiento,
  onEditarMovimiento,
  onEliminarMovimiento,
  onEliminarAcuerdo,
}: {
  acuerdo: AcuerdoConDetalle;
  movido: number;
  pendiente: number;
  rol: string;
  onRegistrarMovimiento: () => void;
  onEditarMovimiento: (movimiento: MovimientoDetalle) => void;
  onEliminarMovimiento: (movimiento: MovimientoDetalle) => void;
  onEliminarAcuerdo: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const esCobro = acuerdo.tipo === "cobro";
  const nombreContraparteLabel = esCobro ? "Cliente" : "Proveedor";
  const nombreTotalMovido = esCobro ? "Total recibido" : "Total pagado";
  const nombreAccion = esCobro ? "Registrar pago recibido" : "Registrar pago realizado";
  const nombrePagos = esCobro ? "Pagos recibidos" : "Pagos realizados";

  const pctSaldado = acuerdo.totalAcordado > 0 ? Math.min(100, (movido / acuerdo.totalAcordado) * 100) : 0;

  function aplicadoACuota(cuotaId: string): number {
    return sumaImportes(acuerdo.movimientos.filter((m) => m.cuotaId === cuotaId));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-white rounded-xl p-3">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">{nombreContraparteLabel}</p>
          <p className="font-bold text-[#2F2F2F] truncate">{acuerdo.contraparte}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Unidad</p>
          <p className="font-bold text-[#2F2F2F] truncate">{acuerdo.unidadNumero ?? "Sin número"}</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Concepto</p>
          <p className="font-bold text-[#2F2F2F] truncate">
            {CONCEPTO_LABELS[acuerdo.concepto as keyof typeof CONCEPTO_LABELS] ?? acuerdo.concepto}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">Moneda</p>
          <p className="font-bold text-[#2F2F2F]">{acuerdo.moneda}</p>
        </div>
      </div>

      {/* Resumen + barra de progreso */}
      <div className="bg-white rounded-xl p-3 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">Total acordado</p>
            <p className="font-bold text-[#2F2F2F]">{formatMoneda(acuerdo.totalAcordado, acuerdo.moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">{nombreTotalMovido}</p>
            <p className="font-bold text-[#2F2F2F]">{formatMoneda(movido, acuerdo.moneda)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">Saldo pendiente</p>
            <p className={`font-bold ${pendiente > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {formatMoneda(pendiente, acuerdo.moneda)}
            </p>
          </div>
        </div>
        <div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${pctSaldado >= 100 ? "bg-emerald-500" : "bg-[#D4B06A]"}`}
              style={{ width: `${pctSaldado}%` }}
            />
          </div>
          <p className="text-xs text-stone-500 mt-1">{Math.round(pctSaldado)}% saldado</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRegistrarMovimiento}
          className="w-full sm:w-auto px-4 py-2.5 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          {nombreAccion}
        </button>

        {isAdmin(rol) && (
          <EliminarButton
            label={esCobro ? "Eliminar cobro completo" : "Eliminar pago completo"}
            confirmTitle={esCobro ? "¿Eliminar este cobro completo?" : "¿Eliminar este pago completo?"}
            successMessage={esCobro ? "Cobro eliminado" : "Pago eliminado"}
            motivoBloqueo={
              acuerdo.movimientos.length > 0
                ? `No se puede eliminar: tiene ${acuerdo.movimientos.length} movimiento${acuerdo.movimientos.length === 1 ? "" : "s"} registrado${acuerdo.movimientos.length === 1 ? "" : "s"}`
                : null
            }
            onEliminar={onEliminarAcuerdo}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cuotas */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Cuotas</p>
          {acuerdo.cuotas.length === 0 ? (
            <p className="text-sm text-stone-400">Sin cuotas.</p>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
                    <th className="px-3 py-2 font-medium">Descripción</th>
                    <th className="px-3 py-2 font-medium">Importe</th>
                    <th className="px-3 py-2 font-medium">Vencimiento</th>
                    <th className="px-3 py-2 font-medium">Aplicado</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {acuerdo.cuotas.map((c) => (
                    <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0">
                      <td className="px-3 py-2 text-[#2F2F2F] font-medium">{c.descripcion}</td>
                      <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                        {formatMoneda(c.importe, acuerdo.moneda)}
                      </td>
                      <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{formatFecha(c.vencimiento)}</td>
                      <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                        {formatMoneda(aplicadoACuota(c.id), acuerdo.moneda)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${ESTADO_CUOTA_COLORS[c.estado as keyof typeof ESTADO_CUOTA_COLORS] ?? "bg-stone-100 text-stone-500"}`}
                        >
                          {ESTADO_CUOTA_LABELS[c.estado as keyof typeof ESTADO_CUOTA_LABELS] ?? c.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagos recibidos/realizados */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">{nombrePagos}</p>
          {acuerdo.movimientos.length === 0 ? (
            <p className="text-sm text-stone-400">Todavía no hay {nombrePagos.toLowerCase()}.</p>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Importe</th>
                    <th className="px-3 py-2 font-medium">Modalidad</th>
                    <th className="px-3 py-2 font-medium">Comprobante</th>
                    <th className="px-3 py-2 font-medium">Notas</th>
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {acuerdo.movimientos.map((m) => (
                    <tr key={m.id} className="border-b border-[#F0F0F0] last:border-0">
                      <td className="px-3 py-2 text-[#2F2F2F] font-medium whitespace-nowrap">{formatFecha(m.fecha)}</td>
                      <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                        {formatMoneda(m.importe, acuerdo.moneda)}
                      </td>
                      <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                        {MODALIDAD_LABELS[m.modalidad as keyof typeof MODALIDAD_LABELS] ?? m.modalidad}
                      </td>
                      <td className="px-3 py-2">
                        {m.comprobanteSignedUrl ? (
                          <a
                            href={m.comprobanteSignedUrl}
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
                      <td className="px-3 py-2 text-stone-500 max-w-[140px] truncate" title={m.notas ?? ""}>
                        {m.notas ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditarMovimiento(m)}
                          className="text-stone-500 hover:text-stone-700 font-medium mr-2"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onEliminarMovimiento(m)}
                          className="text-red-500 hover:text-red-700 font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

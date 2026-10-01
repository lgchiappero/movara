"use client";

import {
  CONCEPTO_LABELS,
  MODALIDAD_LABELS,
  ESTADO_CUOTA_LABELS,
  ESTADO_CUOTA_COLORS,
  type TipoAcuerdo,
} from "@/lib/cobranza/constantes";
import { sumaImportes } from "@/lib/cobranza/calc";
import type { FilaPlanUnidad } from "@/lib/cobranza/planes-unidad";
import EliminarButton from "@/components/admin/EliminarButton";
import { isAdmin } from "@/lib/admin/roles";
import type { AcuerdoConDetalle, Cuota } from "@/lib/cobranza/types";
import type { AccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

export const TEXTOS_TIPO: Record<
  TipoAcuerdo,
  { pagado: string; pagos: string; registrar: string; contraparte: string; saldada: string; nuevoPlan: string }
> = {
  cobro: {
    pagado: "Total cobrado",
    pagos: "Pagos recibidos",
    registrar: "Registrar pago recibido",
    contraparte: "Cliente",
    saldada: "✅ Unidad 100% saldada",
    nuevoPlan: "+ Nuevo plan de pago",
  },
  pago: {
    pagado: "Total pagado",
    pagos: "Pagos realizados",
    registrar: "Registrar pago realizado",
    contraparte: "Proveedor",
    saldada: "✅ Pagos a proveedores completos",
    nuevoPlan: "+ Nuevo plan de pago a proveedor",
  },
};

/** Título del plan: en cobranza, "Plan de pago"; en pagos, el proveedor y
 * el concepto. La descripción cargada en el plan va siempre debajo. */
function tituloPlan(plan: AcuerdoConDetalle): string {
  if (plan.tipo === "cobro") return "Plan de pago";
  const concepto = CONCEPTO_LABELS[plan.concepto as keyof typeof CONCEPTO_LABELS] ?? plan.concepto;
  return `${plan.contraparte} · ${concepto}`;
}

function estadoCuota(c: Cuota, aplicado: number): { label: string; color: string } {
  if (c.estado !== "pagado" && aplicado > 0.01) {
    return { label: "Parcial", color: "bg-blue-100 text-blue-700" };
  }
  return {
    label: ESTADO_CUOTA_LABELS[c.estado as keyof typeof ESTADO_CUOTA_LABELS] ?? c.estado,
    color: ESTADO_CUOTA_COLORS[c.estado as keyof typeof ESTADO_CUOTA_COLORS] ?? "bg-stone-100 text-stone-500",
  };
}

/** Detalle de cobranza (o pagos) de UNA unidad: valor de la unidad, saldo
 * de la unidad completa, cada plan con sus cuotas y la lista cronológica
 * de pagos. */
export default function DetallePlanesUnidad({
  tipo,
  fila,
  rol,
  acciones,
}: {
  tipo: TipoAcuerdo;
  fila: FilaPlanUnidad;
  rol: string;
  acciones: AccionesPlanes;
}) {
  const t = TEXTOS_TIPO[tipo];
  const { moneda } = fila;
  const saldada = fila.estado === "saldado";
  // Cobranza: un solo plan por unidad. Pagos: uno por proveedor/concepto.
  const puedeNuevoPlan = tipo === "pago" || fila.planes.length === 0;

  const pagos = fila.planes
    .flatMap((plan) => plan.movimientos.map((pago) => ({ plan, pago })))
    .sort((a, b) => a.pago.fecha.localeCompare(b.pago.fecha));

  return (
    <div className="space-y-4" data-testid={`detalle-${fila.key}`}>
      {/* Valor de la unidad + saldo de la unidad completa */}
      <div className="bg-white rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Dato label="Valor total unidad" valor={fila.unidad.precioCliente != null ? formatMoneda(fila.unidad.precioCliente, "USD") : "—"} />
          <Dato label="Total del plan" valor={formatMoneda(fila.totalPlan, moneda)} />
          <Dato label={t.pagado} valor={formatMoneda(fila.pagado, moneda)} />
          <Dato
            label="Saldo pendiente"
            valor={formatMoneda(fila.saldo, moneda)}
            className={fila.saldo > 0 ? "text-red-700" : "text-emerald-700"}
          />
        </div>
        {fila.planes.length > 0 && (
          <div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${saldada ? "bg-emerald-500" : "bg-[#D4B06A]"}`}
                style={{ width: `${fila.porcentaje}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-stone-500">{Math.round(fila.porcentaje)}% {tipo === "cobro" ? "cobrado" : "pagado"}</p>
              {saldada && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{t.saldada}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {fila.planes.length === 0 && (
        <p className="text-sm text-stone-500">
          {tipo === "cobro" ? "Esta unidad todavía no tiene plan de pago." : "Todavía no hay pagos a proveedores cargados para esta unidad."}
        </p>
      )}
      {puedeNuevoPlan && (
        <button
          type="button"
          onClick={() => acciones.abrirNuevoPlan(fila.unidad.id)}
          className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          {t.nuevoPlan}
        </button>
      )}

      {/* Planes con sus cuotas */}
      {fila.planes.map((plan) => {
        const pagadoPlan = sumaImportes(plan.movimientos);
        return (
          <div key={plan.id} className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[#2F2F2F]">{tituloPlan(plan)}</p>
                {plan.descripcion && <p className="text-sm text-stone-600">{plan.descripcion}</p>}
                <p className="text-xs text-stone-400 mt-0.5">
                  {tipo === "cobro" ? `Cliente: ${plan.contraparte} · ` : ""}
                  Total {formatMoneda(plan.totalAcordado, plan.moneda)} · {t.pagado.replace("Total ", "")}{" "}
                  {formatMoneda(pagadoPlan, plan.moneda)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => acciones.abrirRegistrarPago(plan)}
                  className="px-3 py-2 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors"
                >
                  {t.registrar}
                </button>
                {isAdmin(rol) && (
                  <EliminarButton
                    label="Eliminar plan"
                    confirmTitle="¿Eliminar este plan de pago?"
                    successMessage="Plan eliminado"
                    motivoBloqueo={
                      plan.movimientos.length > 0
                        ? `No se puede eliminar: tiene ${plan.movimientos.length} pago${plan.movimientos.length === 1 ? "" : "s"} registrado${plan.movimientos.length === 1 ? "" : "s"}`
                        : null
                    }
                    onEliminar={() => acciones.eliminarPlan(plan)}
                  />
                )}
              </div>
            </div>

            {plan.cuotas.length === 0 ? (
              <p className="text-sm text-stone-400">Sin cuotas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
                      <th className="px-3 py-2 font-medium">Cuota</th>
                      <th className="px-3 py-2 font-medium">Importe</th>
                      <th className="px-3 py-2 font-medium">Vencimiento</th>
                      <th className="px-3 py-2 font-medium">Aplicado</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.cuotas.map((c) => {
                      const aplicado = sumaImportes(plan.movimientos.filter((m) => m.cuotaId === c.id));
                      const estado = estadoCuota(c, aplicado);
                      return (
                        <tr key={c.id} className="border-b border-[#F0F0F0] last:border-0">
                          <td className="px-3 py-2 text-[#2F2F2F] font-medium">{c.descripcion}</td>
                          <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{formatMoneda(c.importe, plan.moneda)}</td>
                          <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{formatFecha(c.vencimiento)}</td>
                          <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{formatMoneda(aplicado, plan.moneda)}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${estado.color}`}>
                              {estado.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Pagos, cronológicos */}
      {fila.planes.length > 0 && (
        <div className="bg-white rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">{t.pagos}</p>
          {pagos.length === 0 ? (
            <p className="text-sm text-stone-400">Todavía no hay {t.pagos.toLowerCase()}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    {tipo === "pago" && <th className="px-3 py-2 font-medium">Proveedor</th>}
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 font-medium">Importe</th>
                    <th className="px-3 py-2 font-medium">Modalidad</th>
                    <th className="px-3 py-2 font-medium">Comprobante</th>
                    <th className="px-3 py-2 font-medium">Notas</th>
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map(({ plan, pago }) => {
                    const cuota = plan.cuotas.find((c) => c.id === pago.cuotaId);
                    // Qué saldó este pago: la cuota si la tiene; si no, la
                    // descripción del plan.
                    const concepto = cuota?.descripcion ?? plan.descripcion ?? "Sin cuota específica";
                    return (
                      <tr key={pago.id} className="border-b border-[#F0F0F0] last:border-0">
                        <td className="px-3 py-2 text-[#2F2F2F] font-medium whitespace-nowrap">{formatFecha(pago.fecha)}</td>
                        {tipo === "pago" && <td className="px-3 py-2 text-stone-600">{plan.contraparte}</td>}
                        <td className="px-3 py-2 text-stone-600">{concepto}</td>
                        <td className="px-3 py-2 text-stone-600 whitespace-nowrap">{formatMoneda(pago.importe, plan.moneda)}</td>
                        <td className="px-3 py-2 text-stone-600 whitespace-nowrap">
                          {MODALIDAD_LABELS[pago.modalidad as keyof typeof MODALIDAD_LABELS] ?? pago.modalidad}
                        </td>
                        <td className="px-3 py-2">
                          {pago.comprobanteSignedUrl ? (
                            <a
                              href={pago.comprobanteSignedUrl}
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
                        <td className="px-3 py-2 text-stone-500 max-w-[160px] truncate" title={pago.notas ?? ""}>
                          {pago.notas ?? "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => acciones.abrirEditarPago(plan, pago)}
                            className="text-stone-500 hover:text-stone-700 font-medium mr-2"
                          >
                            Editar
                          </button>
                          <EliminarButton
                            label="Eliminar"
                            confirmTitle="¿Eliminar este pago?"
                            successMessage="Pago eliminado"
                            onEliminar={() => acciones.eliminarPago(plan, pago)}
                            className="text-red-500 hover:text-red-700 font-medium"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

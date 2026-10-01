"use client";

import {
  MODALIDAD_LABELS,
  ESTADO_CUOTA_LABELS,
  ESTADO_CUOTA_COLORS,
  type TipoAcuerdo,
} from "@/lib/cobranza/constantes";
import { sumaImportes } from "@/lib/cobranza/calc";
import type { FilaPlanUnidad } from "@/lib/cobranza/planes-unidad";
import EliminarButton from "@/components/admin/EliminarButton";
import PagosProveedorDetalle from "@/components/admin/planes/PagosProveedorDetalle";
import { isAdmin } from "@/lib/admin/roles";
import type { AcuerdoConDetalle, Cuota } from "@/lib/cobranza/types";
import type { AccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";

// Tolerancia para comparar importes — misma que calc.ts.
const EPSILON = 0.01;

function formatMoneda(value: number, moneda: string): string {
  return `${moneda} ${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function formatFecha(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";
}

export const TEXTOS_TIPO: Record<TipoAcuerdo, { pagado: string; nuevoPlan: string }> = {
  cobro: { pagado: "Total cobrado", nuevoPlan: "+ Nuevo plan de pago" },
  pago: { pagado: "Pagado", nuevoPlan: "+ Nuevo pago a proveedor" },
};

function estadoCuota(c: Cuota, aplicado: number): { label: string; color: string } {
  if (c.estado !== "pagado" && aplicado > EPSILON) {
    return { label: "Parcial", color: "bg-blue-100 text-blue-700" };
  }
  return {
    label: ESTADO_CUOTA_LABELS[c.estado as keyof typeof ESTADO_CUOTA_LABELS] ?? c.estado,
    color: ESTADO_CUOTA_COLORS[c.estado as keyof typeof ESTADO_CUOTA_COLORS] ?? "bg-stone-100 text-stone-500",
  };
}

/** Detalle de UNA unidad. Cobranza: su plan de pago como una sola sección
 * (encabezado con total y saldo, cuotas, y pagos recibidos del más reciente
 * al más viejo). Pagos: la lista de pagos directos a proveedores. */
export default function DetallePlanesUnidad({
  tipo,
  fila,
  rol,
  acciones,
  ahora = new Date(),
}: {
  tipo: TipoAcuerdo;
  fila: FilaPlanUnidad;
  rol: string;
  acciones: AccionesPlanes;
  ahora?: Date;
}) {
  if (tipo === "pago") {
    return <PagosProveedorDetalle fila={fila} rol={rol} acciones={acciones} ahora={ahora} />;
  }

  if (fila.planes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 space-y-3" data-testid={`detalle-${fila.key}`}>
        <p className="text-sm text-stone-500">
          Valor total de la unidad:{" "}
          <strong className="text-[#2F2F2F]">
            {fila.unidad.precioCliente != null ? formatMoneda(fila.unidad.precioCliente, "USD") : "—"}
          </strong>
        </p>
        <p className="text-sm text-stone-500">Esta unidad todavía no tiene plan de pago.</p>
        <button
          type="button"
          onClick={() => acciones.abrirNuevoPlan(fila.unidad.id)}
          className="px-4 py-2 bg-[#D4B06A] hover:bg-[#c19f57] text-[#2F2F2F] font-bold text-sm rounded-lg transition-colors"
        >
          + Nuevo plan de pago
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid={`detalle-${fila.key}`}>
      {fila.planes.map((plan) => (
        <PlanDePago key={plan.id} plan={plan} fila={fila} rol={rol} acciones={acciones} />
      ))}
    </div>
  );
}

function PlanDePago({
  plan,
  fila,
  rol,
  acciones,
}: {
  plan: AcuerdoConDetalle;
  fila: FilaPlanUnidad;
  rol: string;
  acciones: AccionesPlanes;
}) {
  const cobrado = sumaImportes(plan.movimientos);
  const saldo = Math.max(0, plan.totalAcordado - cobrado);
  const porcentaje = plan.totalAcordado > 0 ? Math.min(100, (cobrado / plan.totalAcordado) * 100) : 0;
  const saldado = cobrado >= plan.totalAcordado - EPSILON;
  // Del más reciente al más viejo.
  const pagos = [...plan.movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const n = plan.movimientos.length;

  return (
    <section className="bg-white rounded-xl p-4 space-y-4" aria-label="Plan de pago">
      {/* Encabezado: total acordado y saldo pendiente */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#2F2F2F]">Plan de pago</h3>
          {plan.descripcion && <p className="text-sm text-stone-600">{plan.descripcion}</p>}
          <p className="text-xs text-stone-400 mt-0.5">
            Cliente: {plan.contraparte} · Valor de la unidad:{" "}
            {fila.unidad.precioCliente != null ? formatMoneda(fila.unidad.precioCliente, "USD") : "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => acciones.abrirRegistrarPago(plan)}
            className="px-3 py-2 bg-sage-500 hover:bg-sage-600 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors"
          >
            Registrar pago recibido
          </button>
          <button
            type="button"
            onClick={() => acciones.abrirEditarPlan(plan)}
            className="px-3 py-2 bg-white border border-[#E5E5E5] hover:border-stone-300 text-[#2F2F2F] font-bold text-xs rounded-lg transition-colors"
          >
            Editar plan
          </button>
          {isAdmin(rol) && (
            <EliminarButton
              label="Eliminar plan"
              confirmTitle="¿Eliminar el plan de pago completo?"
              confirmText={
                n > 0
                  ? `Se van a borrar el plan, sus ${plan.cuotas.length} cuota${plan.cuotas.length === 1 ? "" : "s"} y los ${n} pago${n === 1 ? "" : "s"} recibido${n === 1 ? "" : "s"} registrado${n === 1 ? "" : "s"} (${formatMoneda(cobrado, plan.moneda)}). Esta acción no se puede deshacer.`
                  : `Se van a borrar el plan y sus ${plan.cuotas.length} cuota${plan.cuotas.length === 1 ? "" : "s"}. Esta acción no se puede deshacer.`
              }
              successMessage="Plan eliminado"
              onEliminar={() => acciones.eliminarPlan(plan)}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <Dato label="Total acordado" valor={formatMoneda(plan.totalAcordado, plan.moneda)} />
        <Dato label="Total cobrado" valor={formatMoneda(cobrado, plan.moneda)} />
        <Dato
          label="Saldo pendiente"
          valor={formatMoneda(saldo, plan.moneda)}
          className={saldo > 0 ? "text-red-700" : "text-emerald-700"}
        />
      </div>
      <div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className={`h-full ${saldado ? "bg-emerald-500" : "bg-[#D4B06A]"}`} style={{ width: `${porcentaje}%` }} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-stone-500">{Math.round(porcentaje)}% cobrado</p>
          {saldado && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
              ✅ Unidad 100% saldada
            </span>
          )}
        </div>
      </div>

      {/* Cuotas */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Cuotas</p>
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

      {/* Pagos recibidos — del más reciente al más viejo */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1">Pagos recibidos</p>
        {pagos.length === 0 ? (
          <p className="text-sm text-stone-400">Todavía no hay pagos recibidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#F0F0F0] text-left text-stone-400 uppercase tracking-wide">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Concepto</th>
                  <th className="px-3 py-2 font-medium">Importe</th>
                  <th className="px-3 py-2 font-medium">Modalidad</th>
                  <th className="px-3 py-2 font-medium">Comprobante</th>
                  <th className="px-3 py-2 font-medium">Notas</th>
                  <th className="px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => {
                  const cuota = plan.cuotas.find((c) => c.id === pago.cuotaId);
                  // Qué saldó este pago: la cuota si la tiene; si no, la
                  // descripción del plan.
                  const concepto = cuota?.descripcion ?? plan.descripcion ?? "Sin cuota específica";
                  return (
                    <tr key={pago.id} className="border-b border-[#F0F0F0] last:border-0">
                      <td className="px-3 py-2 text-[#2F2F2F] font-medium whitespace-nowrap">{formatFecha(pago.fecha)}</td>
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
    </section>
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

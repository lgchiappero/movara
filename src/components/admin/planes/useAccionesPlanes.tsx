"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NuevoPlanPagoModal from "@/components/admin/NuevoPlanPagoModal";
import RegistrarMovimientoModal from "@/components/admin/RegistrarMovimientoModal";
import EditarMovimientoModal from "@/components/admin/EditarMovimientoModal";
import EditarPlanModal from "@/components/admin/EditarPlanModal";
import type { AcuerdoConDetalle, MovimientoDetalle, UnidadOpcion } from "@/lib/cobranza/types";
import type { TipoAcuerdo } from "@/lib/cobranza/constantes";

export type AccionesPlanes = {
  /** Cobranza: nuevo plan de pago. Pagos: nuevo pago a proveedor (plan). */
  abrirNuevoPlan: (unidadId?: string) => void;
  abrirEditarPlan: (plan: AcuerdoConDetalle) => void;
  abrirRegistrarPago: (plan: AcuerdoConDetalle) => void;
  abrirEditarPago: (plan: AcuerdoConDetalle, pago: MovimientoDetalle) => void;
  eliminarPago: (plan: AcuerdoConDetalle, pago: MovimientoDetalle) => Promise<{ ok: boolean; error?: string }>;
  eliminarPlan: (plan: AcuerdoConDetalle) => Promise<{ ok: boolean; error?: string }>;
};

async function borrar(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    return res.ok ? { ok: true } : { ok: false, error: json?.error };
  } catch {
    return { ok: false, error: "No pudimos eliminar. Probá de nuevo." };
  }
}

/** Acciones sobre planes de pago y sus pagos (alta de plan, registrar /
 * editar / eliminar pago, eliminar plan) con sus modales — compartido por
 * Cobranza, Pagos y la ficha de la unidad. Devuelve las acciones y el JSX
 * de los modales, que el llamador renderiza una vez. */
export function useAccionesPlanes({
  tipo,
  unidades,
}: {
  tipo: TipoAcuerdo;
  unidades: UnidadOpcion[];
}): { acciones: AccionesPlanes; modales: React.ReactNode } {
  const router = useRouter();
  const [nuevoPlan, setNuevoPlan] = useState<{ unidadId?: string } | null>(null);
  const [editarPlan, setEditarPlan] = useState<AcuerdoConDetalle | null>(null);
  const [registrar, setRegistrar] = useState<AcuerdoConDetalle | null>(null);
  const [editar, setEditar] = useState<{ plan: AcuerdoConDetalle; pago: MovimientoDetalle } | null>(null);

  const acciones: AccionesPlanes = {
    abrirNuevoPlan: (unidadId) => setNuevoPlan({ unidadId }),
    abrirEditarPlan: (plan) => setEditarPlan(plan),
    abrirRegistrarPago: (plan) => setRegistrar(plan),
    abrirEditarPago: (plan, pago) => setEditar({ plan, pago }),
    eliminarPago: (plan, pago) => borrar(`/api/admin/cobranza/acuerdos/${plan.id}/movimientos/${pago.id}`),
    eliminarPlan: (plan) => borrar(`/api/admin/cobranza/acuerdos/${plan.id}`),
  };

  function cerrarYRefrescar(cerrar: () => void) {
    cerrar();
    router.refresh();
  }

  const modales = (
    <>
      {nuevoPlan && (
        <NuevoPlanPagoModal
          tipo={tipo}
          unidades={unidades}
          unidadIdInicial={nuevoPlan.unidadId}
          onClose={() => setNuevoPlan(null)}
          onCreated={() => cerrarYRefrescar(() => setNuevoPlan(null))}
        />
      )}
      {editarPlan && (
        <EditarPlanModal
          plan={editarPlan}
          onClose={() => setEditarPlan(null)}
          onSaved={() => cerrarYRefrescar(() => setEditarPlan(null))}
        />
      )}
      {registrar && (
        <RegistrarMovimientoModal
          acuerdo={registrar}
          onClose={() => setRegistrar(null)}
          onSaved={() => cerrarYRefrescar(() => setRegistrar(null))}
        />
      )}
      {editar && (
        <EditarMovimientoModal
          acuerdo={editar.plan}
          movimiento={editar.pago}
          onClose={() => setEditar(null)}
          onSaved={() => cerrarYRefrescar(() => setEditar(null))}
        />
      )}
    </>
  );

  return { acciones, modales };
}

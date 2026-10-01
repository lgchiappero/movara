"use client";

import { filasPorUnidad, type UnidadParaPlanes } from "@/lib/cobranza/planes-unidad";
import type { TipoAcuerdo } from "@/lib/cobranza/constantes";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import DetallePlanesUnidad from "@/components/admin/planes/DetallePlanesUnidad";
import { useAccionesPlanes } from "@/components/admin/planes/useAccionesPlanes";

/** Sección de la ficha de la unidad (/admin/unidades/[id]):
 * - cobro → "Cobranza": el plan de pago del cliente y sus pagos recibidos
 * - pago  → "Pagos": los planes de pago a proveedores y los pagos realizados
 * Mismo detalle que se despliega en /admin/cobranza y /admin/pagos. */
export default function PlanesUnidadSection({
  tipo,
  unidad,
  planes,
  rol,
  ahora,
  children,
}: {
  tipo: TipoAcuerdo;
  unidad: UnidadParaPlanes;
  /** Solo los planes de este tipo. */
  planes: AcuerdoConDetalle[];
  rol: string;
  /** ISO — se calcula en el servidor para que el render sea determinista. */
  ahora: string;
  /** Contenido extra al final de la sección (ej: referencia a la logística
   * internacional del envío, en Pagos). */
  children?: React.ReactNode;
}) {
  const { acciones, modales } = useAccionesPlanes({
    tipo,
    unidades: [
      {
        id: unidad.id,
        numeroUnidad: unidad.numeroUnidad,
        clienteNombre: unidad.clienteNombre,
        tienePlanCobro: tipo === "cobro" && planes.length > 0,
      },
    ],
  });
  const filas = filasPorUnidad([unidad], planes, new Date(ahora));

  return (
    <div id={tipo === "cobro" ? "cobranza" : "pagos"}>
      <h2 className="text-sm font-bold uppercase tracking-widest text-sage-600 mb-4">
        {tipo === "cobro" ? "Cobranza" : "Pagos a proveedores"}
      </h2>
      <div className="space-y-4">
        {filas.map((fila) => (
          <DetallePlanesUnidad key={fila.key} tipo={tipo} fila={fila} rol={rol} acciones={acciones} />
        ))}
        {children}
      </div>
      {modales}
    </div>
  );
}

import { fechaEnRango } from "@/lib/cobranza/planes-unidad";
import type { EstadoRecibo } from "./constantes";

export type FilaRecibo = {
  id: string;
  numeroRecibo: string;
  estado: EstadoRecibo;
  clienteId: string;
  clienteNombre: string;
  unidadId: string;
  numeroUnidad: string;
  modelo: string;
  fechaEntrega: string; // ISO, medianoche UTC
  confirmadoAt: string | null;
};

export type FiltrosRecibos = {
  estado: EstadoRecibo | "todos";
  rango: { desde: Date; hasta: Date } | null; // período sobre la fecha de entrega
  unidadId: string; // "" = todas
  clienteId: string; // "" = todos
};

export const FILTROS_RECIBOS_VACIOS: FiltrosRecibos = { estado: "todos", rango: null, unidadId: "", clienteId: "" };

/** Filtro de /admin/recibos (en el cliente, como la grilla de cobranza). */
export function filtrarRecibos(filas: FilaRecibo[], f: FiltrosRecibos): FilaRecibo[] {
  return filas.filter(
    (r) =>
      (f.estado === "todos" || r.estado === f.estado) &&
      (!f.unidadId || r.unidadId === f.unidadId) &&
      (!f.clienteId || r.clienteId === f.clienteId) &&
      (!f.rango || fechaEnRango(r.fechaEntrega, f.rango))
  );
}

/** Opciones únicas (id → etiqueta) para los selectores de unidad y cliente. */
export function opcionesUnicas(filas: FilaRecibo[], campo: "unidad" | "cliente"): { value: string; label: string }[] {
  const mapa = new Map<string, string>();
  for (const r of filas) {
    if (campo === "unidad") mapa.set(r.unidadId, `${r.numeroUnidad} · ${r.clienteNombre}`);
    else mapa.set(r.clienteId, r.clienteNombre);
  }
  return [...mapa.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

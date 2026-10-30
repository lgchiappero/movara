import { MOVARA_MODELS } from "@/data/configurador-catalog";
import { getExtrasElegidos, type MaterialesSeleccion } from "@/data/material-catalog";
import { resolvePrecioExtra, type PreciosConfig } from "@/data/precios-extras";

// Precio estimado del configurador. Módulo plano (sin "use client") para que
// lo usen tanto el configurador como /api/pedido, que guarda el desglose del
// momento del envío.

export type PrecioAdicional = { key: string; nombre: string; precio: number };

export type PrecioResumen = {
  base: number;
  adicionales: PrecioAdicional[];
  total: number;
  /** Opciones sin precio de lista elegidas: no suman al total, se cotizan aparte. */
  aConsultar: { key: string; nombre: string }[];
};

const DEFAULT_PRECIO_BASE_M2 = 680;

export function calcularPrecio({
  modelo,
  materiales,
  precios,
}: {
  modelo: string | null;
  materiales: MaterialesSeleccion;
  precios?: PreciosConfig | null;
}): PrecioResumen {
  const precioBaseM2 = precios?.precioBaseM2 ?? DEFAULT_PRECIO_BASE_M2;

  const m = modelo ? MOVARA_MODELS.find((x) => x.key === modelo) : null;
  const base = m ? m.superficie * precioBaseM2 : 0;

  const extras = getExtrasElegidos(materiales);
  const adicionales = extras.flatMap((e) =>
    e.tipo === "precio" ? [{ key: e.key, nombre: e.nombre, precio: resolvePrecioExtra(e.priceName, precios) }] : []
  );
  const aConsultar = extras.flatMap((e) => (e.tipo === "a-consultar" ? [{ key: e.key, nombre: e.nombre }] : []));

  const total = base + adicionales.reduce((sum, a) => sum + a.precio, 0);
  return { base, adicionales, total, aConsultar };
}

/** Foto del desglose que se guarda con el pedido: los PDFs la muestran tal
 *  cual, sin recalcular con los precios del día. */
export type DesgloseEstimado = {
  base: number;
  adicionales: { nombre: string; precio: number }[];
  aConsultar: string[];
  total: number;
};

export function toDesgloseEstimado(r: PrecioResumen): DesgloseEstimado {
  return {
    base: r.base,
    adicionales: r.adicionales.map(({ nombre, precio }) => ({ nombre, precio })),
    aConsultar: r.aConsultar.map((o) => o.nombre),
    total: r.total,
  };
}

/** Lee el JSON guardado en la base; null si no tiene la forma esperada
 *  (pedidos anteriores al desglose). */
export function parseDesgloseEstimado(raw: unknown): DesgloseEstimado | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  if (!esNumero(d.base) || !esNumero(d.total) || !Array.isArray(d.adicionales) || !Array.isArray(d.aConsultar)) return null;
  const adicionales = d.adicionales.filter(
    (a): a is { nombre: string; precio: number } =>
      !!a && typeof a === "object" && typeof (a as { nombre?: unknown }).nombre === "string" && esNumero((a as { precio?: unknown }).precio)
  );
  const aConsultar = d.aConsultar.filter((n): n is string => typeof n === "string");
  return { base: d.base, adicionales, aConsultar, total: d.total };
}

import type { DatosOrigen } from "@/lib/origen-visita/clasificar";

/** Guarda en el navegador el origen de la primera visita (utm, fbclid,
 * gclid, referrer) durante 30 días, para mandarlo con el configurador y los
 * formularios. El localStorage puede no estar disponible (modo privado,
 * bloqueado): en ese caso no se guarda nada y las consultas salen sin origen. */

export const CLAVE_ORIGEN = "movara_origen";
export const DURACION_ORIGEN_MS = 30 * 24 * 60 * 60_000;

type Guardado = { datos: DatosOrigen; expira: number };

const PARAMETROS = ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"] as const;

function leerGuardado(ahora: number): DatosOrigen | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ORIGEN);
    if (!crudo) return null;
    const g = JSON.parse(crudo) as Guardado;
    return typeof g?.expira === "number" && g.expira > ahora && g.datos ? g.datos : null;
  } catch {
    return null;
  }
}

/** Datos de esta visita. El referrer del propio sitio no cuenta (es una
 * navegación interna, no una llegada). */
export function datosDeLaVisita(ahora: number = Date.now()): DatosOrigen {
  const params = new URLSearchParams(window.location.search);
  const datos: DatosOrigen = {};
  for (const p of PARAMETROS) {
    const v = params.get(p)?.trim();
    if (v) datos[p] = v.slice(0, p === "fbclid" || p === "gclid" ? 500 : p === "utm_campaign" ? 200 : 100);
  }
  const referrer = document.referrer;
  let externo = false;
  try {
    externo = !!referrer && new URL(referrer).host !== window.location.host;
  } catch {
    externo = false;
  }
  if (externo) datos.referrer = referrer.slice(0, 500);
  datos.landing = window.location.pathname.slice(0, 300);
  datos.fecha = new Date(ahora).toISOString();
  return datos;
}

/** Primera visita: guarda el origen si no hay uno vigente. Las visitas
 * siguientes dentro de los 30 días no lo pisan. El panel no cuenta. */
export function capturarOrigen(ahora: number = Date.now()): void {
  if (window.location.pathname.startsWith("/admin") || leerGuardado(ahora)) return;
  try {
    const guardado: Guardado = { datos: datosDeLaVisita(ahora), expira: ahora + DURACION_ORIGEN_MS };
    window.localStorage.setItem(CLAVE_ORIGEN, JSON.stringify(guardado));
  } catch {
    // Sin almacenamiento: las consultas salen sin origen.
  }
}

/** Origen vigente para mandar en un formulario, o undefined. */
export function leerOrigen(ahora: number = Date.now()): DatosOrigen | undefined {
  return leerGuardado(ahora) ?? undefined;
}

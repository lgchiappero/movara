import { z } from "zod";

/** Origen de la visita: lo captura el navegador en la primera visita
 * (src/lib/origen-visita/navegador.ts) y viaja con el configurador y los
 * formularios. Se guarda en Lead y Cliente (origenVisita, campana,
 * origenDetalle) y no reemplaza a Lead.origen, que carga el vendedor. */

export const ORIGEN_VISITA_OPTIONS = ["meta_ads", "instagram", "google", "google_ads", "directo", "otro"] as const;
export type OrigenVisita = (typeof ORIGEN_VISITA_OPTIONS)[number];

export const ORIGEN_VISITA_LABELS: Record<OrigenVisita, string> = {
  meta_ads: "Meta Ads",
  instagram: "Instagram",
  google: "Google",
  google_ads: "Google Ads",
  directo: "Directo",
  otro: "Otro",
};

export const ORIGEN_VISITA_COLORS: Record<OrigenVisita, string> = {
  meta_ads: "bg-blue-100 text-blue-700",
  instagram: "bg-violet-100 text-violet-700",
  google: "bg-emerald-100 text-emerald-700",
  google_ads: "bg-amber-100 text-amber-700",
  directo: "bg-stone-100 text-stone-600",
  otro: "bg-stone-200 text-stone-700",
};

export function esOrigenVisita(v: unknown): v is OrigenVisita {
  return (ORIGEN_VISITA_OPTIONS as readonly unknown[]).includes(v);
}

const texto = (max: number) => z.string().trim().max(max).optional();

/** Lo que manda el navegador. Todo opcional: un dato raro no frena una
 * consulta, se descarta el origen entero (ver origenDelBody). */
export const datosOrigenSchema = z.object({
  utm_source: texto(100),
  utm_medium: texto(100),
  utm_campaign: texto(200),
  fbclid: texto(500),
  gclid: texto(500),
  referrer: texto(500),
  landing: texto(300),
  fecha: z.iso.datetime().optional(),
});
export type DatosOrigen = z.infer<typeof datosOrigenSchema>;

export type OrigenClasificado = {
  origenVisita: OrigenVisita;
  campana: string | null;
  origenDetalle: DatosOrigen;
};

const MEDIOS_PAGOS = /^(cpc|ppc|paid|paid[_-]?(social|search)|ads?|cpm|display)$/;
const FUENTES_META = /^(facebook|fb|meta|ig|instagram)$/;

function hostDe(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** meta_ads: utm de Meta con medio pago, o fbclid sin otra pista (Meta lo
 * agrega a los clics de sus anuncios). instagram: utm_source instagram sin
 * medio pago o llegada desde instagram.com. google_ads: gclid o utm de Google
 * con medio pago. google: llegada desde un buscador de Google. directo: sin
 * utm ni referrer. otro: el resto. */
export function clasificarOrigen(datos: DatosOrigen): OrigenClasificado {
  const fuente = (datos.utm_source ?? "").toLowerCase();
  const medio = (datos.utm_medium ?? "").toLowerCase();
  const host = hostDe(datos.referrer);
  const pago = MEDIOS_PAGOS.test(medio);
  const desdeInstagram = host === "instagram.com" || host.endsWith(".instagram.com");

  let origenVisita: OrigenVisita;
  if (datos.gclid || (fuente === "google" && pago)) origenVisita = "google_ads";
  else if (FUENTES_META.test(fuente) && pago) origenVisita = "meta_ads";
  else if (fuente === "instagram" || fuente === "ig" || desdeInstagram) origenVisita = "instagram";
  else if (datos.fbclid && !fuente) origenVisita = "meta_ads";
  else if (fuente === "google" || /(^|\.)google\.[a-z.]+$/.test(host)) origenVisita = "google";
  else if (!fuente && !host) origenVisita = "directo";
  else origenVisita = "otro";

  return { origenVisita, campana: datos.utm_campaign || null, origenDetalle: datos };
}

/** Origen clasificado a partir del campo `origen` del body de una ruta
 * pública. Si falta o no valida devuelve null y la consulta sigue igual. */
export function origenDelBody(valor: unknown): OrigenClasificado | null {
  const parsed = datosOrigenSchema.safeParse(valor);
  return parsed.success ? clasificarOrigen(parsed.data) : null;
}

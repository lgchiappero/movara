declare global {
  interface Window {
    fbq?: FbqStub;
    _fbq?: FbqStub;
  }
}

type FbqStub = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

export const META_PIXEL_ID = "996322016615557";
const FBEVENTS_URL = "https://connect.facebook.net/en_US/fbevents.js";

const HOSTS_PRODUCCION = ["movara.com.ar", "www.movara.com.ar"];

/** Rutas que no se miden: admin, CMS y páginas privadas de clientes (cada
 * una con todas sus subrutas). /agendar sí se mide; /agendar/cancelar no. */
const RUTAS_EXCLUIDAS = ["/admin", "/studio", "/recibo", "/mi-pedido", "/agendar/cancelar"];

export function esRutaExcluida(pathname: string): boolean {
  return RUTAS_EXCLUIDAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** El píxel mide solo visitas reales al sitio público en producción: nunca en
 * localhost, previews de Vercel, e2e ni navegadores automatizados. */
export function debeMedir(params: {
  vercelEnv: string | undefined;
  hostname: string;
  pathname: string;
  automatizado: boolean;
}): boolean {
  return (
    params.vercelEnv === "production" &&
    HOSTS_PRODUCCION.includes(params.hostname) &&
    !params.automatizado &&
    !esRutaExcluida(params.pathname)
  );
}

// Lo fija <MetaPixel> según el entorno (viene del servidor); el resto de las
// condiciones se leen del navegador en cada evento.
let vercelEnv: string | undefined;

export function configurarEntornoPixel(env: string | undefined) {
  vercelEnv = env;
}

export function puedeMedirAhora(): boolean {
  if (typeof window === "undefined") return false;
  return debeMedir({
    vercelEnv,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    automatizado: navigator.webdriver === true,
  });
}

/** Snippet oficial de Meta: crea la cola de fbq, inyecta fbevents.js e
 * inicializa el píxel. Idempotente. */
export function cargarPixel() {
  if (window.fbq) return;
  const n: FbqStub = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  };
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const t = document.createElement("script");
  t.async = true;
  t.src = FBEVENTS_URL;
  document.head.appendChild(t);
  n("init", META_PIXEL_ID);
}

function fbq(...args: unknown[]) {
  if (!puedeMedirAhora()) return;
  cargarPixel();
  window.fbq!(...args);
}

export function trackPageView() {
  fbq("track", "PageView");
}

export function trackViewContent(modelo: string) {
  fbq("track", "ViewContent", { content_name: modelo, content_type: "product" });
}

export function trackInitiateCheckout(modelo: string) {
  fbq("track", "InitiateCheckout", { content_name: modelo });
}

export type OrigenLead = "configurador" | "contacto" | "dossier" | "dossier-llamada";

/** Lead confirmado por el servidor. Sin datos personales: solo el formulario
 * de origen y modelo/finalidad/provincia cuando existen. */
export function trackLead(
  origen: OrigenLead,
  datos: { modelo?: string | null; finalidad?: string | null; provincia?: string | null } = {}
) {
  const params: Record<string, string> = { content_name: origen };
  if (datos.modelo) params.modelo = datos.modelo;
  if (datos.finalidad) params.finalidad = datos.finalidad;
  if (datos.provincia) params.provincia = datos.provincia;
  fbq("track", "Lead", params);
}

export function trackExitIntentLead() {
  fbq("track", "Lead", { source: "exit_intent" });
}

export function trackSchedule() {
  fbq("track", "Schedule");
}

export function trackContact(origen: string) {
  fbq("track", "Contact", { content_name: origen });
}

export function esLinkWhatsApp(href: string): boolean {
  try {
    const host = new URL(href, "https://x.invalid").hostname;
    return host === "wa.me" || host === "api.whatsapp.com" || host === "web.whatsapp.com";
  } catch {
    return false;
  }
}

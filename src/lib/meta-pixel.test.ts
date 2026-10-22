import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  META_PIXEL_ID,
  cargarPixel,
  configurarEntornoPixel,
  debeMedir,
  esLinkWhatsApp,
  esRutaExcluida,
  puedeMedirAhora,
  trackContact,
  trackExitIntentLead,
  trackInitiateCheckout,
  trackLead,
  trackPageView,
  trackSchedule,
  trackViewContent,
} from "@/lib/meta-pixel";

const locationOriginal = window.location;

function irA(url: string) {
  Object.defineProperty(window, "location", { configurable: true, value: new URL(url) });
}

function automatizado(valor: boolean) {
  Object.defineProperty(navigator, "webdriver", { configurable: true, get: () => valor });
}

function cola(): unknown[][] {
  return window.fbq?.queue ?? [];
}

function scriptsDelPixel() {
  return document.querySelectorAll('script[src="https://connect.facebook.net/en_US/fbevents.js"]');
}

beforeEach(() => {
  delete window.fbq;
  delete window._fbq;
  scriptsDelPixel().forEach((s) => s.remove());
  configurarEntornoPixel("production");
  automatizado(false);
  irA("https://www.movara.com.ar/");
});

afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: locationOriginal });
  configurarEntornoPixel(undefined);
});

describe("esRutaExcluida", () => {
  it.each(["/admin", "/admin/pedidos/1", "/studio", "/studio/desk", "/recibo/abc", "/mi-pedido", "/mi-pedido/xyz", "/agendar/cancelar/123"])(
    "excluye %s",
    (ruta) => expect(esRutaExcluida(ruta)).toBe(true)
  );

  it.each(["/", "/modelos", "/modelos/flex-38", "/configurador", "/agendar", "/faq", "/administracion", "/recibos-info"])(
    "mide %s",
    (ruta) => expect(esRutaExcluida(ruta)).toBe(false)
  );
});

describe("debeMedir", () => {
  const ok = { vercelEnv: "production", hostname: "movara.com.ar", pathname: "/", automatizado: false };

  it("mide en producción, en el dominio propio y en una ruta pública", () => {
    expect(debeMedir(ok)).toBe(true);
    expect(debeMedir({ ...ok, hostname: "www.movara.com.ar" })).toBe(true);
  });

  it.each([
    ["preview de Vercel", { vercelEnv: "preview" }],
    ["desarrollo / e2e (sin VERCEL_ENV)", { vercelEnv: undefined }],
    ["localhost", { hostname: "localhost" }],
    ["URL *.vercel.app de producción", { hostname: "movara-abc.vercel.app" }],
    ["ruta excluida", { pathname: "/admin" }],
    ["navegador automatizado", { automatizado: true }],
  ])("no mide en %s", (_, cambio) => {
    expect(debeMedir({ ...ok, ...cambio })).toBe(false);
  });
});

describe("puedeMedirAhora", () => {
  it("lee entorno, hostname, ruta y webdriver del navegador", () => {
    expect(puedeMedirAhora()).toBe(true);
    irA("https://www.movara.com.ar/mi-pedido/abc");
    expect(puedeMedirAhora()).toBe(false);
    irA("https://www.movara.com.ar/");
    automatizado(true);
    expect(puedeMedirAhora()).toBe(false);
    automatizado(false);
    configurarEntornoPixel("preview");
    expect(puedeMedirAhora()).toBe(false);
  });
});

describe("cargarPixel", () => {
  it("crea la cola, inyecta fbevents.js una sola vez e inicializa el píxel", () => {
    cargarPixel();
    cargarPixel();
    expect(scriptsDelPixel()).toHaveLength(1);
    expect(cola()).toEqual([["init", META_PIXEL_ID]]);
    expect(window._fbq).toBe(window.fbq);
  });

  it("cuando fbevents.js ya cargó, delega en callMethod", () => {
    cargarPixel();
    const llamadas: unknown[][] = [];
    window.fbq!.callMethod = (...args: unknown[]) => llamadas.push(args);
    trackPageView();
    expect(llamadas).toEqual([["track", "PageView"]]);
  });

  it("no pisa un _fbq existente", () => {
    const previo = Object.assign(() => {}, {});
    window._fbq = previo;
    cargarPixel();
    expect(window._fbq).toBe(previo);
  });
});

describe("eventos", () => {
  it("no cargan nada ni encolan fuera de producción", () => {
    configurarEntornoPixel(undefined);
    trackPageView();
    trackLead("contacto", { provincia: "Córdoba" });
    expect(window.fbq).toBeUndefined();
    expect(scriptsDelPixel()).toHaveLength(0);
  });

  it("no cargan nada en rutas excluidas", () => {
    irA("https://www.movara.com.ar/admin/pedidos");
    trackPageView();
    trackContact("/admin/pedidos");
    expect(window.fbq).toBeUndefined();
  });

  it("el primer evento permitido carga el píxel y queda encolado después del init", () => {
    trackPageView();
    expect(cola()).toEqual([["init", META_PIXEL_ID], ["track", "PageView"]]);
  });

  it("mandan los parámetros esperados", () => {
    trackViewContent("MOVARA Flex 38");
    trackInitiateCheckout("MOVARA Flex 38");
    trackExitIntentLead();
    trackSchedule();
    trackContact("/modelos/flex-38");
    expect(cola().slice(1)).toEqual([
      ["track", "ViewContent", { content_name: "MOVARA Flex 38", content_type: "product" }],
      ["track", "InitiateCheckout", { content_name: "MOVARA Flex 38" }],
      ["track", "Lead", { source: "exit_intent" }],
      ["track", "Schedule"],
      ["track", "Contact", { content_name: "/modelos/flex-38" }],
    ]);
  });

  it("Lead solo lleva origen, modelo, finalidad y provincia (y omite los vacíos)", () => {
    trackLead("configurador", { modelo: "MOVARA Flex 38", finalidad: "inversor", provincia: "Buenos Aires" });
    trackLead("contacto", { provincia: "" });
    trackLead("dossier", { modelo: null, finalidad: null, provincia: null });
    trackLead("dossier-llamada");
    expect(cola().slice(1)).toEqual([
      ["track", "Lead", { content_name: "configurador", modelo: "MOVARA Flex 38", finalidad: "inversor", provincia: "Buenos Aires" }],
      ["track", "Lead", { content_name: "contacto" }],
      ["track", "Lead", { content_name: "dossier" }],
      ["track", "Lead", { content_name: "dossier-llamada" }],
    ]);
  });
});

describe("esLinkWhatsApp", () => {
  it.each(["https://wa.me/5491100000000?text=hola", "https://api.whatsapp.com/send?phone=1", "https://web.whatsapp.com/"])(
    "reconoce %s",
    (href) => expect(esLinkWhatsApp(href)).toBe(true)
  );

  it.each(["/modelos", "https://movara.com.ar/", "mailto:a@b.com", "https://wa.me.evil.com/", "http://[invalida"])(
    "ignora %s",
    (href) => expect(esLinkWhatsApp(href)).toBe(false)
  );
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/sanity/lib/client", () => ({ client: { fetch: fetchMock } }));

import { construirSitemap, PAGINAS_PUBLICAS, RUTAS_PRIVADAS } from "../sitemap";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { hrefModelo } from "@/lib/modelos/rutas";

const BASE = "https://movara.com.ar";
const urls = (s: { url: string }[]) => s.map((e) => e.url);

beforeEach(() => {
  fetchMock.mockReset();
});

describe("construirSitemap", () => {
  it("incluye las 9 páginas fijas con URL absoluta", () => {
    const s = construirSitemap([]);
    expect(urls(s)).toEqual([
      BASE,
      `${BASE}/modelos`,
      `${BASE}/configurador`,
      `${BASE}/agendar`,
      `${BASE}/faq`,
      `${BASE}/nosotros`,
      `${BASE}/producto`,
      `${BASE}/privacidad`,
      `${BASE}/terminos`,
    ]);
    expect(s[0].priority).toBe(1);
    expect(PAGINAS_PUBLICAS).toHaveLength(9);
  });

  it("agrega cada modelo con su página (el Flex en /modelos/flex) y la fecha de Sanity", () => {
    const s = construirSitemap([
      { slug: "movara-flex", actualizado: "2026-10-01T12:00:00Z" },
      { slug: "movara-duplex-76m2", actualizado: null },
    ]);
    const flex = s.find((e) => e.url === `${BASE}/modelos/flex`)!;
    expect(flex.lastModified).toEqual(new Date("2026-10-01T12:00:00Z"));
    const duplex = s.find((e) => e.url === `${BASE}/modelos/movara-duplex-76m2`)!;
    expect(duplex).toBeDefined();
    expect(duplex.lastModified).toBeUndefined();
    expect(s).toHaveLength(11);
  });

  it("sin slug o repetido no se agrega dos veces", () => {
    const s = construirSitemap([{ slug: null }, { slug: "a" }, { slug: "a" }]);
    expect(urls(s).filter((u) => u.endsWith("/modelos/a"))).toHaveLength(1);
    expect(s).toHaveLength(10);
  });

  it("nunca incluye rutas privadas ni con token", () => {
    const s = construirSitemap([{ slug: "x" }]);
    for (const e of s) {
      const ruta = new URL(e.url).pathname;
      expect(RUTAS_PRIVADAS.some((p) => ruta.startsWith(p))).toBe(false);
    }
  });
});

describe("app/sitemap", () => {
  it("lee los modelos de Sanity", async () => {
    fetchMock.mockResolvedValue([{ slug: "movara-duplex-76m2", actualizado: "2026-10-01T00:00:00Z" }]);
    const s = await sitemap();
    expect(urls(s)).toContain(`${BASE}/modelos/movara-duplex-76m2`);
  });

  it("si Sanity falla, sale igual con las páginas fijas", async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error("sin red");
    });
    expect(await sitemap()).toHaveLength(9);
  });
});

describe("app/robots", () => {
  it("permite el sitio, bloquea las rutas privadas y apunta al sitemap", () => {
    const r = robots();
    expect(r.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/studio", "/api", "/recibo", "/mi-pedido", "/agendar/cancelar"],
    });
    expect(r.sitemap).toBe(`${BASE}/sitemap.xml`);
  });
});

describe("hrefModelo", () => {
  it("Flex a su página, el resto por slug, sin slug al catálogo", () => {
    expect(hrefModelo("movara-flex")).toBe("/modelos/flex");
    expect(hrefModelo("otro")).toBe("/modelos/otro");
    expect(hrefModelo(undefined)).toBe("/modelos");
  });
});

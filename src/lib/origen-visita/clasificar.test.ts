import { describe, it, expect } from "vitest";
import { clasificarOrigen, origenDelBody, esOrigenVisita } from "@/lib/origen-visita/clasificar";

describe("clasificarOrigen", () => {
  it.each([
    [{ gclid: "x" }, "google_ads"],
    [{ utm_source: "google", utm_medium: "cpc" }, "google_ads"],
    [{ utm_source: "facebook", utm_medium: "paid" }, "meta_ads"],
    [{ utm_source: "ig", utm_medium: "paid_social" }, "meta_ads"],
    [{ utm_source: "Meta", utm_medium: "CPC" }, "meta_ads"],
    [{ fbclid: "x" }, "meta_ads"],
    [{ fbclid: "x", referrer: "https://l.instagram.com/" }, "instagram"],
    [{ utm_source: "instagram", utm_medium: "bio" }, "instagram"],
    [{ referrer: "https://www.instagram.com/movara.homes" }, "instagram"],
    [{ utm_source: "google" }, "google"],
    [{ referrer: "https://www.google.com.ar/" }, "google"],
    [{}, "directo"],
    [{ landing: "/modelos" }, "directo"],
    [{ referrer: "https://www.bing.com/" }, "otro"],
    [{ utm_source: "newsletter" }, "otro"],
    [{ fbclid: "x", utm_source: "newsletter" }, "otro"],
    [{ referrer: "no es una url" }, "directo"],
  ])("%o → %s", (datos, esperado) => {
    expect(clasificarOrigen(datos).origenVisita).toBe(esperado);
  });

  it("guarda la campaña y el detalle completo", () => {
    const datos = { utm_source: "facebook", utm_medium: "paid", utm_campaign: "otono-2026", landing: "/" };
    expect(clasificarOrigen(datos)).toEqual({ origenVisita: "meta_ads", campana: "otono-2026", origenDetalle: datos });
    expect(clasificarOrigen({}).campana).toBeNull();
  });
});

describe("origenDelBody", () => {
  it("valida y clasifica; si falta o no valida, null", () => {
    expect(origenDelBody({ gclid: "abc", fecha: "2026-10-26T12:00:00.000Z" })?.origenVisita).toBe("google_ads");
    expect(origenDelBody(undefined)).toBeNull();
    expect(origenDelBody("x")).toBeNull();
    expect(origenDelBody({ utm_source: "x".repeat(101) })).toBeNull();
    expect(origenDelBody({ fecha: "ayer" })).toBeNull();
  });

  it("descarta campos desconocidos", () => {
    expect(origenDelBody({ utm_source: "google", otro: "x" })?.origenDetalle).toEqual({ utm_source: "google" });
  });
});

describe("esOrigenVisita", () => {
  it("solo los valores de la lista", () => {
    expect(esOrigenVisita("meta_ads")).toBe(true);
    expect(esOrigenVisita("web")).toBe(false);
    expect(esOrigenVisita(null)).toBe(false);
  });
});

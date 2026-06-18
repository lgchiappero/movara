import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getWhatsAppUrl } from "@/lib/whatsapp";

const TEST_NUMBER = "5491111111111";
const FALLBACK = "5491100000000";

describe("getWhatsAppUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", TEST_NUMBER);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa NEXT_PUBLIC_WHATSAPP_NUMBER como número base", () => {
    expect(getWhatsAppUrl("test")).toContain(`wa.me/${TEST_NUMBER}`);
  });

  it("genera URL con formato https://wa.me/[número]?text=", () => {
    const url = getWhatsAppUrl("hola");
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+/);
  });

  it("codifica el mensaje en la URL con encodeURIComponent", () => {
    const msg = "Hola MOVARA! ¿Tienen disponibilidad? 🏠 & precio";
    const url = getWhatsAppUrl(msg);
    expect(url).toBe(`https://wa.me/${TEST_NUMBER}?text=${encodeURIComponent(msg)}`);
  });

  it("codifica espacios y caracteres especiales del mensaje", () => {
    const url = getWhatsAppUrl("hola mundo");
    expect(url).toContain("hola%20mundo");
  });

  it("usa overrideNumber cuando se provee", () => {
    const override = "5499988877766";
    const url = getWhatsAppUrl("test", override);
    expect(url).toContain(`wa.me/${override}`);
    expect(url).not.toContain(TEST_NUMBER);
  });

  it("ignora override de string vacío y usa el env", () => {
    expect(getWhatsAppUrl("test", "")).toContain(TEST_NUMBER);
  });

  it("ignora override de solo espacios y usa el env", () => {
    expect(getWhatsAppUrl("test", "   ")).toContain(TEST_NUMBER);
  });

  it("ignora override null y usa el env", () => {
    expect(getWhatsAppUrl("test", null)).toContain(TEST_NUMBER);
  });

  it("ignora override undefined y usa el env", () => {
    expect(getWhatsAppUrl("test", undefined)).toContain(TEST_NUMBER);
  });

  it("usa el número de fallback hardcodeado cuando el env está vacío", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    const url = getWhatsAppUrl("test");
    expect(url).toContain(`wa.me/${FALLBACK}`);
  });

  it("mensaje vacío produce URL válida", () => {
    const url = getWhatsAppUrl("");
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=$/);
  });

  it("mensaje multilínea se codifica correctamente", () => {
    const msg = "línea1\nlínea2\nlínea3";
    const url = getWhatsAppUrl(msg);
    expect(url).toContain(encodeURIComponent(msg));
    expect(url).not.toContain("\n");
  });
});

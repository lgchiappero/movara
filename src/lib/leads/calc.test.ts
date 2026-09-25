import { describe, it, expect } from "vitest";
import { tasaConversion, buildWhatsAppLeadUrl } from "@/lib/leads/calc";

describe("tasaConversion", () => {
  it("null cuando el total es cero", () => {
    expect(tasaConversion(0, 0)).toBeNull();
  });

  it("null cuando el total es negativo (dato inconsistente, defensivo)", () => {
    expect(tasaConversion(0, -1)).toBeNull();
  });

  it("calcula la fracción ganados/total", () => {
    expect(tasaConversion(3, 10)).toBe(0.3);
  });

  it("1 cuando todos los leads del período se ganaron", () => {
    expect(tasaConversion(5, 5)).toBe(1);
  });

  it("0 cuando no se ganó ninguno", () => {
    expect(tasaConversion(0, 5)).toBe(0);
  });
});

describe("buildWhatsAppLeadUrl", () => {
  it("normaliza el teléfono y arma el link a wa.me sin el '+' inicial", () => {
    const url = buildWhatsAppLeadUrl("+54 9 11 1234-5678", "Juan");
    expect(url).toBe(
      `https://wa.me/5491112345678?text=${encodeURIComponent(
        "Hola Juan! Te escribo de MOVARA por tu consulta. ¿Seguimos charlando por acá?"
      )}`
    );
  });

  it("teléfono sin '+' también funciona", () => {
    const url = buildWhatsAppLeadUrl("011 1234-5678", "Ana");
    expect(url).toContain("https://wa.me/01112345678?text=");
  });

  it("incluye el nombre del lead en el mensaje", () => {
    const url = buildWhatsAppLeadUrl("+5491112345678", "María José");
    expect(decodeURIComponent(url)).toContain("Hola María José!");
  });
});

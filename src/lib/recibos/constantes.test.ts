import { describe, it, expect } from "vitest";
import { esEstadoRecibo, linkRecibo, ESTADO_RECIBO_LABELS, ESTADO_RECIBO_COLORS, estadoReciboOptions } from "./constantes";

describe("constantes de recibos", () => {
  it("linkRecibo usa el dominio público por defecto", () => {
    expect(linkRecibo("abc")).toBe("https://movara.com.ar/recibo/abc");
    expect(linkRecibo("abc", "http://localhost:3000")).toBe("http://localhost:3000/recibo/abc");
  });
  it("esEstadoRecibo", () => {
    expect(esEstadoRecibo("confirmado")).toBe(true);
    expect(esEstadoRecibo("firmado")).toBe(false);
  });
  it("cada estado tiene etiqueta y color", () => {
    for (const e of estadoReciboOptions) {
      expect(ESTADO_RECIBO_LABELS[e]).toBeTruthy();
      expect(ESTADO_RECIBO_COLORS[e]).toBeTruthy();
    }
  });
});

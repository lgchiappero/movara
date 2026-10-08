import { describe, it, expect } from "vitest";
import { calcularHashRecibo, hashAbreviado, type ContenidoHash } from "./hash";

const C: ContenidoHash = {
  numeroRecibo: "REC-2026-001",
  textoConfirmado: "texto",
  clienteNombre: "Ana",
  clienteDni: "1",
  clienteCuit: null,
  clienteEmail: "ana@example.com",
  numeroUnidad: "U1",
  modelo: "Flex 38",
  fechaEntrega: new Date("2026-10-08T00:00:00.000Z"),
  lugarEntrega: "Sunchales",
  observaciones: null,
  confirmadoAt: new Date("2026-10-08T13:00:00.000Z"),
  ipConfirmacion: "190.1.2.3",
  userAgent: "UA",
};

describe("calcularHashRecibo", () => {
  it("es un SHA-256 hex y es determinístico", () => {
    const h = calcularHashRecibo(C);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(calcularHashRecibo({ ...C })).toBe(h);
  });

  it("no depende del orden de las claves del objeto", () => {
    const invertido = Object.fromEntries(Object.entries(C).reverse()) as ContenidoHash;
    expect(calcularHashRecibo(invertido)).toBe(calcularHashRecibo(C));
  });

  it("cambia si cambia cualquier dato del contenido o de la evidencia", () => {
    const h = calcularHashRecibo(C);
    const cambios: Partial<ContenidoHash>[] = [
      { textoConfirmado: "texto." },
      { observaciones: "x" },
      { ipConfirmacion: "190.1.2.4" },
      { userAgent: "otro" },
      { confirmadoAt: new Date("2026-10-08T13:00:01.000Z") },
      { fechaEntrega: new Date("2026-10-09T00:00:00.000Z") },
      { clienteEmail: "otra@example.com" },
    ];
    for (const c of cambios) expect(calcularHashRecibo({ ...C, ...c })).not.toBe(h);
  });
});

describe("hashAbreviado", () => {
  it("abrevia hashes largos y deja los cortos", () => {
    expect(hashAbreviado("a".repeat(8) + "b".repeat(48) + "c".repeat(8))).toBe("aaaaaaaa…cccccccc");
    expect(hashAbreviado("corto")).toBe("corto");
  });
});

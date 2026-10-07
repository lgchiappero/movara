import { describe, it, expect } from "vitest";
import { mensajeErrorPedido } from "../ConfiguradorMovara";

describe("mensajeErrorPedido", () => {
  it("muestra el primer error de validación con su campo", () => {
    expect(
      mensajeErrorPedido({
        error: "Datos inválidos",
        details: [{ path: ["localidad"], message: "Mínimo 2 caracteres" }, { path: ["x"], message: "otro" }],
      })
    ).toBe("localidad: Mínimo 2 caracteres");
  });

  it("sin path usa solo el mensaje del issue", () => {
    expect(mensajeErrorPedido({ details: [{ path: [], message: "Inválido" }] })).toBe("Inválido");
  });

  it("sin details usa el error general del server", () => {
    expect(mensajeErrorPedido({ error: "Demasiadas solicitudes" })).toBe("Demasiadas solicitudes");
  });

  it("respuesta vacía o no-JSON da un mensaje genérico", () => {
    expect(mensajeErrorPedido(null)).toMatch(/Error desconocido/);
    expect(mensajeErrorPedido({ details: [{}] })).toMatch(/Error desconocido/);
  });
});

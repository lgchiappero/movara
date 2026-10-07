import { describe, it, expect } from "vitest";
import { buildEstadoEmail, linkSeguimiento } from "./pedido-estado-email";

const TOKEN = "b".repeat(64);

describe("buildEstadoEmail — confirmado", () => {
  it("incluye el link personal con token, no solo el código correlativo", () => {
    const email = buildEstadoEmail("confirmado", {
      clienteNombre: "Ana",
      numeroPedido: "MOV-2026-007",
      tokenSeguimiento: TOKEN,
      fechaDespacho: null,
      fechaArriboEstimado: null,
    })!;
    expect(email.html).toContain(`href="https://movara.com.ar/mi-pedido?t=${TOKEN}"`);
    expect(email.html).toContain("MOV-2026-007");
  });

  it("linkSeguimiento arma la URL pública", () => {
    expect(linkSeguimiento(TOKEN)).toBe(`https://movara.com.ar/mi-pedido?t=${TOKEN}`);
  });

  it("arma asunto y mensaje del resto de los estados, y null para los que no avisan", () => {
    const base = { clienteNombre: "Ana", numeroPedido: null, tokenSeguimiento: TOKEN, fechaDespacho: null, fechaArriboEstimado: null };
    expect(buildEstadoEmail("en_produccion", { ...base, fechaDespacho: new Date("2026-11-10T12:00:00Z") })!.html).toMatch(/2026/);
    expect(buildEstadoEmail("en_produccion", base)!.html).toContain("a confirmar");
    expect(buildEstadoEmail("en_transito", base)!.subject).toBe("Tu MOVARA está en camino");
    expect(buildEstadoEmail("en_aduana", base)!.html).toContain("aduanero");
    expect(buildEstadoEmail("entregado", base)!.html).toContain("entregada");
    expect(buildEstadoEmail("confirmado", base)!.html).toContain("Tu pedido está confirmado");
    expect(buildEstadoEmail("consulta", base)).toBeNull();
  });
});

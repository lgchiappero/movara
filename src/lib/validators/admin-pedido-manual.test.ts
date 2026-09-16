import { describe, it, expect } from "vitest";
import { nuevoPedidoManualSchema } from "@/lib/validators/admin-pedido-manual";

const valid = {
  clienteNombre: "Juan García",
  tipoCliente: "particular",
  clienteWhatsapp: "+54 9 11 1234-5678",
};

describe("nuevoPedidoManualSchema", () => {
  it("acepta el mínimo requerido: nombre, tipo y whatsapp", () => {
    expect(nuevoPedidoManualSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza sin clienteNombre", () => {
    expect(
      nuevoPedidoManualSchema.safeParse({ ...valid, clienteNombre: undefined }).success
    ).toBe(false);
  });

  it("rechaza clienteWhatsapp inválido", () => {
    expect(
      nuevoPedidoManualSchema.safeParse({ ...valid, clienteWhatsapp: "123" }).success
    ).toBe(false);
  });

  it("acepta sin modelo, finalidad, provincia ni vendedor (todos opcionales)", () => {
    const result = nuevoPedidoManualSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modelo).toBeUndefined();
      expect(result.data.finalidad).toBeUndefined();
      expect(result.data.vendedorAsignado).toBeUndefined();
    }
  });

  it("acepta modelo y finalidad dentro de las opciones válidas", () => {
    expect(
      nuevoPedidoManualSchema.safeParse({ ...valid, modelo: "20ft", finalidad: "agro" }).success
    ).toBe(true);
  });

  it("rechaza modelo fuera de las opciones válidas", () => {
    expect(nuevoPedidoManualSchema.safeParse({ ...valid, modelo: "60ft" }).success).toBe(false);
  });

  it("rechaza tipoCliente empresa sin razonSocial", () => {
    const result = nuevoPedidoManualSchema.safeParse({ ...valid, tipoCliente: "empresa" });
    expect(result.success).toBe(false);
  });

  it("acepta tipoCliente empresa con razonSocial", () => {
    const result = nuevoPedidoManualSchema.safeParse({
      ...valid,
      tipoCliente: "empresa",
      razonSocial: "Constructora Sur S.A.",
    });
    expect(result.success).toBe(true);
  });

  it("acepta clienteEmail vacío (opcional)", () => {
    expect(nuevoPedidoManualSchema.safeParse({ ...valid, clienteEmail: "" }).success).toBe(true);
  });

  it("rechaza clienteEmail malformado cuando no está vacío", () => {
    expect(
      nuevoPedidoManualSchema.safeParse({ ...valid, clienteEmail: "noemail" }).success
    ).toBe(false);
  });

  it("acepta clienteEmail válido", () => {
    expect(
      nuevoPedidoManualSchema.safeParse({ ...valid, clienteEmail: "juan@example.com" }).success
    ).toBe(true);
  });

  it("rechaza objeto vacío", () => {
    expect(nuevoPedidoManualSchema.safeParse({}).success).toBe(false);
  });
});

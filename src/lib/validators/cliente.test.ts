import { describe, it, expect } from "vitest";
import { clienteSchema } from "@/lib/validators/cliente";

const valid = {
  nombre: "Juan García",
  dni: "30123456",
  cuit: "20301234567",
  domicilio: "Av. Siempre Viva 742",
  email: "juan@example.com",
  telefono: "+54 9 11 1234-5678",
  notas: "Cliente frecuente",
};

describe("clienteSchema", () => {
  it("acepta un conjunto de datos válidos", () => {
    expect(clienteSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza nombre demasiado corto", () => {
    expect(clienteSchema.safeParse({ ...valid, nombre: "A" }).success).toBe(false);
  });

  it("acepta todos los campos opcionales en null", () => {
    const result = clienteSchema.safeParse({
      nombre: "Juan García",
      dni: null,
      cuit: null,
      domicilio: null,
      email: null,
      telefono: null,
      notas: null,
    });
    expect(result.success).toBe(true);
  });

  it("normaliza string vacío a null", () => {
    const result = clienteSchema.safeParse({ ...valid, dni: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dni).toBeNull();
  });

  it("rechaza objeto vacío (falta nombre)", () => {
    expect(clienteSchema.safeParse({}).success).toBe(false);
  });
});

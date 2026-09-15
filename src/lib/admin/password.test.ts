import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/admin/password";

describe("hashPassword / verifyPassword", () => {
  it("un hash verifica correctamente contra su propia contraseña", async () => {
    const hash = await hashPassword("Contraseña123!");
    expect(await verifyPassword("Contraseña123!", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("Contraseña123!");
    expect(await verifyPassword("OtraCosa456", hash)).toBe(false);
  });

  it("dos hashes de la misma contraseña son distintos (salt aleatorio)", async () => {
    const a = await hashPassword("igual");
    const b = await hashPassword("igual");
    expect(a).not.toBe(b);
  });

  it("verifyPassword no explota con hash null (usuario inexistente) y siempre da false", async () => {
    expect(await verifyPassword("cualquier-cosa", null)).toBe(false);
  });
});

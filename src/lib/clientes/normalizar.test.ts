import { describe, it, expect } from "vitest";
import { claveEmail, claveTelefono } from "@/lib/clientes/normalizar";

describe("claveEmail", () => {
  it("minúsculas y sin espacios", () => {
    expect(claveEmail("  Ana.Garcia@Example.COM ")).toBe("ana.garcia@example.com");
  });

  it.each([null, undefined, "", "sin-arroba", "a @b.com"])("%s → null", (v) => {
    expect(claveEmail(v)).toBeNull();
  });
});

describe("claveTelefono", () => {
  it.each([
    "+54 9 11 1234-5678",
    "+54 11 1234-5678",
    "5491112345678",
    "541112345678",
    "0054 9 11 1234 5678",
    "011 15 1234-5678",
    "11 15 1234 5678",
    "011 1234-5678",
    "1112345678",
  ])("%s → 1112345678", (tel) => {
    expect(claveTelefono(tel)).toBe("1112345678");
  });

  it("saca el 15 después de un código de área de 3 y de 4 dígitos", () => {
    expect(claveTelefono("0341 15 123-4567")).toBe("3411234567");
    expect(claveTelefono("03493 15 12-3456")).toBe("3493123456");
  });

  it("un número de otro país queda con todos sus dígitos", () => {
    expect(claveTelefono("+1 (305) 555-1234")).toBe("13055551234");
    expect(claveTelefono("+598 99")).toBeNull();
  });

  it("muy corto o vacío → null", () => {
    expect(claveTelefono("1234")).toBeNull();
    expect(claveTelefono("")).toBeNull();
    expect(claveTelefono(null)).toBeNull();
    expect(claveTelefono(undefined)).toBeNull();
  });
});

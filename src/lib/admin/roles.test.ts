import { describe, it, expect } from "vitest";
import { isAllowedForRole } from "@/lib/admin/roles";

describe("isAllowedForRole", () => {
  it("admin puede acceder a cualquier ruta", () => {
    expect(isAllowedForRole("admin", "/admin/usuarios")).toBe(true);
    expect(isAllowedForRole("admin", "/admin/contenido")).toBe(true);
    expect(isAllowedForRole("admin", "/admin/modelos")).toBe(true);
    expect(isAllowedForRole("admin", "/admin/configuracion")).toBe(true);
    expect(isAllowedForRole("admin", "/api/admin/usuarios")).toBe(true);
    expect(isAllowedForRole("admin", "/admin/configuraciones")).toBe(true);
  });

  it("vendedor solo puede acceder a dashboard, leads y pedidos", () => {
    expect(isAllowedForRole("vendedor", "/admin")).toBe(true);
    expect(isAllowedForRole("vendedor", "/admin/leads")).toBe(true);
    expect(isAllowedForRole("vendedor", "/admin/configuraciones")).toBe(true);
    expect(isAllowedForRole("vendedor", "/admin/configuraciones/abc123")).toBe(true);
    expect(isAllowedForRole("vendedor", "/api/admin/configuraciones/abc/documentos")).toBe(true);
  });

  it("vendedor no puede acceder a usuarios, contenido, modelos ni configuración", () => {
    expect(isAllowedForRole("vendedor", "/admin/usuarios")).toBe(false);
    expect(isAllowedForRole("vendedor", "/admin/usuarios/abc")).toBe(false);
    expect(isAllowedForRole("vendedor", "/admin/contenido")).toBe(false);
    expect(isAllowedForRole("vendedor", "/admin/modelos")).toBe(false);
    expect(isAllowedForRole("vendedor", "/admin/configuracion")).toBe(false);
    expect(isAllowedForRole("vendedor", "/api/admin/usuarios")).toBe(false);
    expect(isAllowedForRole("vendedor", "/api/admin/usuarios/abc")).toBe(false);
  });

  it("no confunde /admin/configuracion con /admin/configuraciones (prefijo compartido)", () => {
    // Regresión: "configuracion" es prefijo literal de "configuraciones" —
    // un chequeo con startsWith ingenuo bloquearía Pedidos por accidente.
    expect(isAllowedForRole("vendedor", "/admin/configuracion")).toBe(false);
    expect(isAllowedForRole("vendedor", "/admin/configuraciones")).toBe(true);
    expect(isAllowedForRole("vendedor", "/admin/configuraciones/xyz")).toBe(true);
  });
});

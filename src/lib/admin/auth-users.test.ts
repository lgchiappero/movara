import { describe, it, expect } from "vitest";
import { parseAdminUsers, isAllowedForRole } from "@/lib/admin/auth-users";

describe("parseAdminUsers", () => {
  it("parsea ADMIN_USERS válida", () => {
    const env = {
      ADMIN_USERS: JSON.stringify([
        { user: "luciano", pass: "abc123", rol: "admin" },
        { user: "empleado1", pass: "xyz789", rol: "editor" },
      ]),
    };

    const users = parseAdminUsers(env);
    expect(users).toHaveLength(2);
    expect(users[0]).toEqual({ user: "luciano", pass: "abc123", rol: "admin" });
    expect(users[1].rol).toBe("editor");
  });

  it("cae a ADMIN_USER/ADMIN_PASSWORD si ADMIN_USERS no está seteada", () => {
    const env = { ADMIN_USER: "luciano", ADMIN_PASSWORD: "Lunes12!" };
    const users = parseAdminUsers(env);
    expect(users).toEqual([{ user: "luciano", pass: "Lunes12!", rol: "admin" }]);
  });

  it("cae al legacy si ADMIN_USERS es JSON inválido", () => {
    const env = {
      ADMIN_USERS: "{not valid json",
      ADMIN_USER: "luciano",
      ADMIN_PASSWORD: "Lunes12!",
    };
    const users = parseAdminUsers(env);
    expect(users).toEqual([{ user: "luciano", pass: "Lunes12!", rol: "admin" }]);
  });

  it("cae al legacy si ADMIN_USERS tiene un rol inválido", () => {
    const env = {
      ADMIN_USERS: JSON.stringify([{ user: "x", pass: "y", rol: "superadmin" }]),
      ADMIN_USER: "luciano",
      ADMIN_PASSWORD: "Lunes12!",
    };
    const users = parseAdminUsers(env);
    expect(users).toEqual([{ user: "luciano", pass: "Lunes12!", rol: "admin" }]);
  });

  it("devuelve lista vacía si no hay ninguna variable configurada", () => {
    expect(parseAdminUsers({})).toEqual([]);
  });
});

describe("isAllowedForRole", () => {
  it("admin puede acceder a cualquier ruta", () => {
    expect(isAllowedForRole("admin", "/admin/configuraciones")).toBe(true);
    expect(isAllowedForRole("admin", "/admin/configuracion")).toBe(true);
    expect(isAllowedForRole("admin", "/api/admin/configuraciones/abc")).toBe(true);
    expect(isAllowedForRole("admin", "/admin/leads")).toBe(true);
  });

  it("editor no puede acceder a pedidos ni configuración", () => {
    expect(isAllowedForRole("editor", "/admin/configuraciones")).toBe(false);
    expect(isAllowedForRole("editor", "/admin/configuraciones/abc123")).toBe(false);
    expect(isAllowedForRole("editor", "/admin/configuracion")).toBe(false);
    expect(isAllowedForRole("editor", "/api/admin/configuraciones/abc/pdf")).toBe(false);
  });

  it("editor sí puede acceder a leads y contenido", () => {
    expect(isAllowedForRole("editor", "/admin/leads")).toBe(true);
    expect(isAllowedForRole("editor", "/admin/contenido")).toBe(true);
    expect(isAllowedForRole("editor", "/admin/modelos")).toBe(true);
    expect(isAllowedForRole("editor", "/admin")).toBe(true);
    expect(isAllowedForRole("editor", "/api/admin/leads/export")).toBe(true);
  });
});

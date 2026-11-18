import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindUnique,
  mockUpdate,
  mockBloqueado,
  mockRegistrarFallo,
  mockLimpiarFallos,
  mockVerifyPassword,
  mockCreateSessionToken,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn().mockResolvedValue({}),
  mockBloqueado: vi.fn().mockResolvedValue(false),
  mockRegistrarFallo: vi.fn().mockResolvedValue(undefined),
  mockLimpiarFallos: vi.fn().mockResolvedValue(undefined),
  mockVerifyPassword: vi.fn(),
  mockCreateSessionToken: vi.fn().mockResolvedValue("jwt-token"),
}));

vi.mock("@/lib/db", () => ({ db: { adminUser: { findUnique: mockFindUnique, update: mockUpdate } } }));
vi.mock("@/lib/seguridad/login", () => ({
  loginBloqueado: mockBloqueado,
  registrarFalloLogin: mockRegistrarFallo,
  limpiarFallosLogin: mockLimpiarFallos,
}));
vi.mock("@/lib/admin/password", () => ({ verifyPassword: mockVerifyPassword }));
vi.mock("@/lib/admin/session", () => ({
  createSessionToken: mockCreateSessionToken,
  sessionCookieOptions: () => ({ httpOnly: true, path: "/" }),
  SESSION_COOKIE_NAME: "movara_admin_session",
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const USER = { id: "u1", email: "admin@movara.com.ar", password: "hash", activo: true };

describe("POST /api/admin/auth/login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("429 si la IP o el email están bloqueados por intentos fallidos, sin tocar la base ni bcrypt", async () => {
    mockBloqueado.mockResolvedValueOnce(true);
    const res = await POST(makeRequest({ email: "x@x.com", password: "x" }));
    expect(res.status).toBe(429);
    expect(mockBloqueado).toHaveBeenCalledWith("127.0.0.1", "x@x.com");
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it("413 si el body es demasiado grande", async () => {
    const res = await POST(makeRequest({ email: "x@x.com", password: "x".repeat(3000) }));
    expect(res.status).toBe(413);
    expect(mockBloqueado).not.toHaveBeenCalled();
  });

  it("usa la IP del cliente que pone la plataforma (x-real-ip)", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockVerifyPassword.mockResolvedValueOnce(false);
    const req = new NextRequest("http://localhost/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "x@x.com", password: "x" }),
      headers: { "content-type": "application/json", "x-real-ip": "200.1.2.3" },
    });
    await POST(req);
    expect(mockRegistrarFallo).toHaveBeenCalledWith("200.1.2.3", "x@x.com");
  });

  it("400 con mensaje genérico si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/auth/login", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 con mensaje genérico si el body es inválido", async () => {
    const res = await POST(makeRequest({ email: "no-es-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Email o contraseña incorrectos");
  });

  it("401 y registra el intento fallido con contraseña incorrecta", async () => {
    mockFindUnique.mockResolvedValueOnce(USER);
    mockVerifyPassword.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ email: USER.email, password: "mal" }));
    expect(res.status).toBe(401);
    expect(mockRegistrarFallo).toHaveBeenCalledWith("127.0.0.1", USER.email);
  });

  it("401 cuando el email no existe (verifica igual contra el hash dummy)", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    mockVerifyPassword.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ email: "no-existe@x.com", password: "cualquiera" }));
    expect(res.status).toBe(401);
    expect(mockVerifyPassword).toHaveBeenCalledWith("cualquiera", null);
  });

  it("401 cuando el usuario existe, la contraseña es correcta, pero está desactivado", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...USER, activo: false });
    mockVerifyPassword.mockResolvedValueOnce(true);
    const res = await POST(makeRequest({ email: USER.email, password: "ok" }));
    expect(res.status).toBe(401);
  });

  it("200, resetea intentos, actualiza ultimoLogin y setea la cookie de sesión", async () => {
    mockFindUnique.mockResolvedValueOnce(USER);
    mockVerifyPassword.mockResolvedValueOnce(true);
    const res = await POST(makeRequest({ email: USER.email, password: "ok" }));

    expect(res.status).toBe(200);
    expect(mockLimpiarFallos).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { ultimoLogin: expect.any(Date) } });
    expect(mockCreateSessionToken).toHaveBeenCalledWith("u1");
    expect(res.cookies.get("movara_admin_session")?.value).toBe("jwt-token");
  });
});

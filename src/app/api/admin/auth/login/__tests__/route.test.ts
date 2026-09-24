import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindUnique,
  mockUpdate,
  mockIsLockedOut,
  mockRecordFailedAttempt,
  mockResetAttempts,
  mockVerifyPassword,
  mockCreateSessionToken,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn().mockResolvedValue({}),
  mockIsLockedOut: vi.fn().mockReturnValue(false),
  mockRecordFailedAttempt: vi.fn(),
  mockResetAttempts: vi.fn(),
  mockVerifyPassword: vi.fn(),
  mockCreateSessionToken: vi.fn().mockResolvedValue("jwt-token"),
}));

vi.mock("@/lib/db", () => ({ db: { adminUser: { findUnique: mockFindUnique, update: mockUpdate } } }));
vi.mock("@/lib/admin/login-rate-limit", () => ({
  isLockedOut: mockIsLockedOut,
  recordFailedAttempt: mockRecordFailedAttempt,
  resetAttempts: mockResetAttempts,
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

  it("429 si la IP está bloqueada por intentos fallidos", async () => {
    mockIsLockedOut.mockReturnValueOnce(true);
    const res = await POST(makeRequest({ email: "x@x.com", password: "x" }));
    expect(res.status).toBe(429);
    expect(mockFindUnique).not.toHaveBeenCalled();
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
    expect(mockRecordFailedAttempt).toHaveBeenCalled();
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
    expect(mockResetAttempts).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "u1" }, data: { ultimoLogin: expect.any(Date) } });
    expect(mockCreateSessionToken).toHaveBeenCalledWith("u1");
    expect(res.cookies.get("movara_admin_session")?.value).toBe("jwt-token");
  });
});

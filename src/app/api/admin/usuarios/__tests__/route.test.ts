import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCount, mockFindUnique, mockCreate, mockHashPassword } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockHashPassword: vi.fn().mockResolvedValue("hashed-pw"),
}));

vi.mock("@/lib/db", () => ({
  db: { adminUser: { count: mockCount, findUnique: mockFindUnique, create: mockCreate } },
}));
vi.mock("@/lib/admin/password", () => ({ hashPassword: mockHashPassword }));

import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const VALID = { nombre: "Ana Pérez", email: "ana@movara.com.ar", password: "password123", rol: "vendedor" };

describe("POST /api/admin/usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCount.mockResolvedValue(1);
    mockFindUnique.mockResolvedValue(null);
  });

  it("crea el usuario con la contraseña hasheada y devuelve 201", async () => {
    mockCreate.mockResolvedValueOnce({ id: "u1", email: VALID.email });
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(201);
    expect(mockHashPassword).toHaveBeenCalledWith("password123");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { nombre: VALID.nombre, email: VALID.email, password: "hashed-pw", rol: "vendedor" },
    });
  });

  it("400 si el body no es JSON válido", async () => {
    const req = new NextRequest("http://localhost/api/admin/usuarios", {
      method: "POST",
      body: "no-es-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 si el body es inválido (password corta)", async () => {
    const res = await POST(makeRequest({ ...VALID, password: "123" }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("409 si ya se alcanzó el máximo de usuarios", async () => {
    mockCount.mockResolvedValueOnce(5);
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/máximo/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("409 si el email ya existe", async () => {
    mockFindUnique.mockResolvedValueOnce({ id: "existing" });
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(409);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

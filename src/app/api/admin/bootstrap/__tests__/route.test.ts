import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockCount, mockCreate, mockHashPassword } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockHashPassword: vi.fn().mockResolvedValue("hashed-pw"),
}));

vi.mock("@/lib/db", () => ({ db: { adminUser: { count: mockCount, create: mockCreate } } }));
vi.mock("@/lib/admin/password", () => ({ hashPassword: mockHashPassword }));

import { POST } from "../route";
import { NextRequest } from "next/server";

const SECRET = "test-bootstrap-secret";

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/admin/bootstrap", { method: "POST", headers });
}

describe("POST /api/admin/bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_BOOTSTRAP_SECRET = SECRET;
    process.env.ADMIN_INITIAL_EMAIL = "admin@movara.com.ar";
    process.env.ADMIN_INITIAL_PASSWORD = "initial-pw-123";
    mockCount.mockResolvedValue(0);
  });
  afterEach(() => {
    delete process.env.ADMIN_BOOTSTRAP_SECRET;
    delete process.env.ADMIN_INITIAL_EMAIL;
    delete process.env.ADMIN_INITIAL_PASSWORD;
  });

  it("503 si ADMIN_BOOTSTRAP_SECRET no está configurado", async () => {
    delete process.env.ADMIN_BOOTSTRAP_SECRET;
    const res = await POST(makeRequest());
    expect(res.status).toBe(503);
  });

  it("401 si el secreto del header no coincide", async () => {
    const res = await POST(makeRequest({ "x-bootstrap-secret": "incorrecto" }));
    expect(res.status).toBe(401);
  });

  it("409 si ya existe algún AdminUser", async () => {
    mockCount.mockResolvedValueOnce(1);
    const res = await POST(makeRequest({ "x-bootstrap-secret": SECRET }));
    expect(res.status).toBe(409);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("500 si faltan las variables de admin inicial", async () => {
    delete process.env.ADMIN_INITIAL_EMAIL;
    const res = await POST(makeRequest({ "x-bootstrap-secret": SECRET }));
    expect(res.status).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("201 y crea el admin inicial con la contraseña hasheada", async () => {
    mockCreate.mockResolvedValueOnce({ email: "admin@movara.com.ar" });
    const res = await POST(makeRequest({ "x-bootstrap-secret": SECRET }));
    expect(res.status).toBe(201);
    expect(mockHashPassword).toHaveBeenCalledWith("initial-pw-123");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { nombre: "Admin", email: "admin@movara.com.ar", password: "hashed-pw", rol: "admin", activo: true },
    });
  });
});

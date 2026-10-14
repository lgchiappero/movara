import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ sesion: vi.fn(), firmar: vi.fn() }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.sesion }));
vi.mock("@/lib/admin/subidas", () => ({ firmarSubida: m.firmar }));

import { POST } from "../route";

const MB = 1024 * 1024;
const pedir = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/admin/subidas", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const valido = { destino: "envios", entidadId: "cm1abc", nombre: "plano.pdf", tipo: "application/pdf", tamano: 12 * MB };

beforeEach(() => {
  vi.clearAllMocks();
  m.sesion.mockResolvedValue({ email: "admin@movara.com.ar", rol: "admin" });
  m.firmar.mockResolvedValue({ ok: true, value: { path: "envios/cm1abc/uuid-plano.pdf", signedUrl: "https://sube" } });
});

describe("POST /api/admin/subidas", () => {
  it("401 sin sesión, sin firmar nada", async () => {
    m.sesion.mockResolvedValueOnce(null);
    expect((await pedir(valido)).status).toBe(401);
    expect(m.firmar).not.toHaveBeenCalled();
  });

  it("firma la subida y devuelve path y URL", async () => {
    const res = await pedir(valido);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ path: "envios/cm1abc/uuid-plano.pdf", signedUrl: "https://sube" });
    expect(m.firmar).toHaveBeenCalledWith("envios", "cm1abc", { nombre: "plano.pdf", tipo: "application/pdf", tamano: 12 * MB });
  });

  it("valida en el servidor antes de firmar: tamaño, destino, id y cuerpo", async () => {
    const r = await pedir({ ...valido, tamano: 20 * MB + 1 });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe("El archivo supera el máximo de 20MB");
    for (const malo of [{ ...valido, destino: "otro" }, { ...valido, entidadId: "../x" }, { ...valido, tamano: 0 }, { ...valido, nombre: " " }]) {
      expect((await pedir(malo)).status).toBe(400);
    }
    expect((await pedir("{roto")).status).toBe(400);
    expect(m.firmar).not.toHaveBeenCalled();
  });

  it("devuelve el error de firmarSubida con su status", async () => {
    m.firmar.mockResolvedValueOnce({ ok: false, error: "No encontrado", status: 404 });
    const res = await pedir(valido);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No encontrado" });
  });
});

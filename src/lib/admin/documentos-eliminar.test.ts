// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  getAdminUser: vi.fn(),
  eliminarArchivo: vi.fn(),
  unidadFind: vi.fn(),
  unidadDelete: vi.fn(),
  envioFind: vi.fn(),
  envioDelete: vi.fn(),
  pedidoFind: vi.fn(),
  pedidoDelete: vi.fn(),
  reciboFind: vi.fn(),
  configFind: vi.fn(),
  configUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    documentoUnidad: { findFirst: m.unidadFind, delete: m.unidadDelete },
    documentoEnvio: { findFirst: m.envioFind, delete: m.envioDelete },
    documentoPedido: { findFirst: m.pedidoFind, delete: m.pedidoDelete },
    reciboConformidad: { findFirst: m.reciboFind },
    configuracionPedido: { findUnique: m.configFind, update: m.configUpdate },
    $transaction: m.transaction,
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.getAdminUser }));
vi.mock("@/lib/admin/storage", () => ({
  BUCKET_MOVARA: "documentos-movara",
  BUCKET_PEDIDOS: "documentos-pedidos",
  eliminarArchivo: m.eliminarArchivo,
}));

import { eliminarDocumento } from "./documentos-eliminar";
import { DELETE as deleteUnidad } from "@/app/api/admin/unidades/[id]/documentos/[documentoId]/route";
import { DELETE as deleteEnvio } from "@/app/api/admin/envios/[id]/documentos/[documentoId]/route";
import { DELETE as deletePedido } from "@/app/api/admin/configuraciones/[id]/documentos/[documentoId]/route";
import { NextRequest } from "next/server";

const ADMIN = { id: "a1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };
const VENDEDOR = { ...ADMIN, rol: "vendedor" };

beforeEach(() => {
  vi.clearAllMocks();
  m.getAdminUser.mockResolvedValue(ADMIN);
  m.eliminarArchivo.mockResolvedValue(true);
  m.unidadFind.mockResolvedValue({ id: "d1", url: "unidades/u1/a.pdf", seccion: "01_cliente" });
  m.envioFind.mockResolvedValue({ id: "d2", url: "envios/e1/b.pdf" });
  m.pedidoFind.mockResolvedValue({ id: "d3", url: "pedidos/p1/c.pdf" });
  m.reciboFind.mockResolvedValue(null);
  m.configFind.mockResolvedValue({ piUrl: null, comprobantePagoUrl: null });
  m.transaction.mockResolvedValue([]);
});

describe("eliminarDocumento", () => {
  it("unidad: busca el documento dentro de la unidad, borra el archivo y después el registro", async () => {
    expect(await eliminarDocumento("unidad", "u1", "d1")).toEqual({ ok: true });
    expect(m.unidadFind).toHaveBeenCalledWith({
      where: { id: "d1", unidadId: "u1" },
      select: { id: true, url: true, seccion: true },
    });
    expect(m.eliminarArchivo).toHaveBeenCalledWith("documentos-movara", "unidades/u1/a.pdf");
    expect(m.unidadDelete).toHaveBeenCalledWith({ where: { id: "d1" } });
    expect(m.eliminarArchivo.mock.invocationCallOrder[0]).toBeLessThan(m.unidadDelete.mock.invocationCallOrder[0]);
    // Fuera de 07_entrega no hace falta mirar los recibos.
    expect(m.reciboFind).not.toHaveBeenCalled();
  });

  it("404 si el documento no es de esa entidad", async () => {
    m.unidadFind.mockResolvedValueOnce(null);
    expect(await eliminarDocumento("unidad", "otra", "d1")).toEqual({ ok: false, status: 404, error: "Documento no encontrado" });
    expect(m.eliminarArchivo).not.toHaveBeenCalled();
  });

  it("07_entrega: no deja eliminar el PDF de un Recibo en Conformidad confirmado", async () => {
    m.unidadFind.mockResolvedValueOnce({ id: "d1", url: "unidades/u1/REC.pdf", seccion: "07_entrega" });
    m.reciboFind.mockResolvedValueOnce({ numeroRecibo: "REC-2026-004" });
    const r = await eliminarDocumento("unidad", "u1", "d1");
    expect(r).toEqual({ ok: false, status: 409, error: "No se puede eliminar: es el Recibo en Conformidad REC-2026-004 confirmado" });
    expect(m.reciboFind).toHaveBeenCalledWith({
      where: { unidadId: "u1", estado: "confirmado", pdfPath: "unidades/u1/REC.pdf" },
      select: { numeroRecibo: true },
    });
    expect(m.eliminarArchivo).not.toHaveBeenCalled();
    expect(m.unidadDelete).not.toHaveBeenCalled();
  });

  it("07_entrega: otros documentos de la sección (acta, fotos) sí se eliminan", async () => {
    m.unidadFind.mockResolvedValueOnce({ id: "d1", url: "unidades/u1/acta.pdf", seccion: "07_entrega" });
    expect(await eliminarDocumento("unidad", "u1", "d1")).toEqual({ ok: true });
    expect(m.unidadDelete).toHaveBeenCalled();
  });

  it("si Storage no pudo borrar el archivo, el registro queda y devuelve error", async () => {
    m.eliminarArchivo.mockResolvedValueOnce(false);
    const r = await eliminarDocumento("unidad", "u1", "d1");
    expect(r).toMatchObject({ ok: false, status: 502 });
    expect(m.unidadDelete).not.toHaveBeenCalled();
  });

  it("envío: bucket documentos-movara", async () => {
    expect(await eliminarDocumento("envio", "e1", "d2")).toEqual({ ok: true });
    expect(m.envioFind).toHaveBeenCalledWith({ where: { id: "d2", envioId: "e1" }, select: { id: true, url: true } });
    expect(m.eliminarArchivo).toHaveBeenCalledWith("documentos-movara", "envios/e1/b.pdf");
    expect(m.envioDelete).toHaveBeenCalledWith({ where: { id: "d2" } });
  });

  it("pedido: bucket documentos-pedidos; sin campos del pedido apuntando al archivo", async () => {
    m.pedidoDelete.mockReturnValueOnce("delete-op");
    expect(await eliminarDocumento("pedido", "p1", "d3")).toEqual({ ok: true });
    expect(m.pedidoFind).toHaveBeenCalledWith({ where: { id: "d3", pedidoId: "p1" }, select: { id: true, url: true } });
    expect(m.eliminarArchivo).toHaveBeenCalledWith("documentos-pedidos", "pedidos/p1/c.pdf");
    expect(m.transaction).toHaveBeenCalledWith(["delete-op"]);
    expect(m.configUpdate).not.toHaveBeenCalled();
  });

  it("pedido: limpia los campos del pedido que apuntaban al archivo (PI, comprobantes…)", async () => {
    m.configFind.mockResolvedValueOnce({ piUrl: "pedidos/p1/c.pdf", seguroUrl: "pedidos/p1/c.pdf", fotosUrl: "pedidos/p1/otro.pdf" });
    m.pedidoDelete.mockReturnValueOnce("delete-op");
    m.configUpdate.mockReturnValueOnce("update-op");
    await eliminarDocumento("pedido", "p1", "d3");
    expect(m.configUpdate).toHaveBeenCalledWith({ where: { id: "p1" }, data: { piUrl: null, seguroUrl: null } });
    expect(m.transaction).toHaveBeenCalledWith(["delete-op", "update-op"]);
  });

  it("pedido: si el pedido ya no existe, borra solo el documento", async () => {
    m.configFind.mockResolvedValueOnce(null);
    await eliminarDocumento("pedido", "p1", "d3");
    expect(m.configUpdate).not.toHaveBeenCalled();
  });
});

describe("DELETE …/documentos/[documentoId] (unidades, envíos y pedidos)", () => {
  const rutas = [
    { nombre: "unidades", DELETE: deleteUnidad, borra: () => m.unidadDelete },
    { nombre: "envios", DELETE: deleteEnvio, borra: () => m.envioDelete },
    { nombre: "configuraciones", DELETE: deletePedido, borra: () => m.transaction },
  ];
  const req = (nombre: string) => new NextRequest(`http://localhost/api/admin/${nombre}/x1/documentos/d1`, { method: "DELETE" });
  const ctx = { params: Promise.resolve({ id: "x1", documentoId: "d1" }) };

  for (const { nombre, DELETE, borra } of rutas) {
    it(`${nombre}: 401 sin sesión, 403 para vendedor, sin tocar nada`, async () => {
      m.getAdminUser.mockResolvedValueOnce(null);
      const r401 = await DELETE(req(nombre), ctx);
      expect(r401.status).toBe(401);
      m.getAdminUser.mockResolvedValueOnce(VENDEDOR);
      const r403 = await DELETE(req(nombre), ctx);
      expect(r403.status).toBe(403);
      expect(await r403.json()).toEqual({ error: "Solo un administrador puede eliminar" });
      expect(m.eliminarArchivo).not.toHaveBeenCalled();
      expect(borra()).not.toHaveBeenCalled();
    });

    it(`${nombre}: admin elimina → 200`, async () => {
      const res = await DELETE(req(nombre), ctx);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(borra()).toHaveBeenCalled();
    });
  }

  it("devuelve el status y el error de eliminarDocumento", async () => {
    m.eliminarArchivo.mockResolvedValueOnce(false);
    const res = await deleteEnvio(req("envios"), ctx);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/No pudimos borrar el archivo/);
  });
});

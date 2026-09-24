// @vitest-environment node
//
// jsdom trae su propio File/FormData globals, distintos de los que usa
// NextRequest.formData() internamente (basado en las Web APIs nativas de
// Node) — bajo jsdom, `file instanceof File` en el route da falso negativo
// aunque el archivo se parseó bien. Mismo criterio que ya se usa para `jose`
// en otros tests.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUnique, mockTransaction, mockUploadDocument, mockDocCreate } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockUploadDocument: vi.fn().mockResolvedValue(undefined),
  mockDocCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    configuracionPedido: { findUnique: mockFindUnique, update: vi.fn() },
    documentoPedido: { create: mockDocCreate },
    $transaction: mockTransaction,
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/admin/storage", () => ({
  buildStoragePath: (scope: string, id: string, filename: string) => `${scope}/${id}/${filename}`,
  uploadDocument: mockUploadDocument,
  BUCKET_PEDIDOS: "documentos-pedidos",
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

function makeFormRequest(fields: Record<string, string | File>): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new NextRequest("http://localhost/api/admin/configuraciones/p1/documentos", {
    method: "POST",
    body: form,
  });
}

function pdfFile(name = "comprobante.pdf"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });
}

describe("POST /api/admin/configuraciones/[id]/documentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUnique.mockResolvedValue({ id: "p1" });
    mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await POST(makeFormRequest({ file: pdfFile(), tipo: "otro" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(401);
  });

  it("404 si el pedido no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await POST(makeFormRequest({ file: pdfFile(), tipo: "otro" }), {
      params: Promise.resolve({ id: "no-existe" }),
    });
    expect(res.status).toBe(404);
  });

  it("400 si falta el archivo", async () => {
    const res = await POST(makeFormRequest({ tipo: "otro" }), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si el tipo de documento es inválido", async () => {
    const res = await POST(makeFormRequest({ file: pdfFile(), tipo: "no-existe" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 si el campo de destino es inválido", async () => {
    const res = await POST(makeFormRequest({ file: pdfFile(), tipo: "otro", campo: "campoRaro" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 si el archivo no pasa la validación (tipo no permitido)", async () => {
    const file = new File([new Uint8Array([1])], "malware.exe", { type: "application/x-msdownload" });
    const res = await POST(makeFormRequest({ file, tipo: "otro" }), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });

  it("500 si la subida a Storage falla", async () => {
    mockUploadDocument.mockRejectedValueOnce(new Error("storage down"));
    const res = await POST(makeFormRequest({ file: pdfFile(), tipo: "otro" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(500);
  });

  it("201 — sube el archivo y crea el documento, sin tocar campo destino", async () => {
    mockTransaction.mockImplementationOnce(async (ops: Promise<unknown>[]) => {
      expect(ops.length).toBe(1); // sin campo, la transacción es solo el create
      return [{ id: "doc1" }];
    });
    const res = await POST(makeFormRequest({ file: pdfFile(), tipo: "otro" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("doc1");
    expect(json.path).toBe("pedidos/p1/comprobante.pdf");
  });

  it("201 — con campo destino, la transacción incluye también el update del pedido", async () => {
    mockTransaction.mockImplementationOnce(async (ops: Promise<unknown>[]) => {
      expect(ops.length).toBe(2); // create + update del campo
      return [{ id: "doc1" }, {}];
    });
    const res = await POST(
      makeFormRequest({ file: pdfFile(), tipo: "pi_proveedor", campo: "piUrl" }),
      { params: Promise.resolve({ id: "p1" }) }
    );
    expect(res.status).toBe(201);
  });

  it("usa el nombre del archivo si no se manda 'nombre', y null si no se manda 'notas'", async () => {
    let dataUsada: Record<string, unknown> = {};
    mockDocCreate.mockImplementationOnce(async (args: { data: Record<string, unknown> }) => {
      dataUsada = args.data;
      return { id: "doc1" };
    });
    mockTransaction.mockImplementationOnce(async (ops: Promise<unknown>[]) => Promise.all(ops));

    await POST(makeFormRequest({ file: pdfFile("factura.pdf"), tipo: "otro" }), {
      params: Promise.resolve({ id: "p1" }),
    });

    expect(dataUsada.nombre).toBe("factura.pdf");
    expect(dataUsada.notas).toBeNull();
    expect(dataUsada.subidoPor).toBe(SESSION.email);
  });

  it("usa 'nombre' y 'notas' del form cuando vienen", async () => {
    let dataUsada: Record<string, unknown> = {};
    mockDocCreate.mockImplementationOnce(async (args: { data: Record<string, unknown> }) => {
      dataUsada = args.data;
      return { id: "doc1" };
    });
    mockTransaction.mockImplementationOnce(async (ops: Promise<unknown>[]) => Promise.all(ops));

    await POST(
      makeFormRequest({ file: pdfFile(), tipo: "otro", nombre: "Nombre custom", notas: "Una nota" }),
      { params: Promise.resolve({ id: "p1" }) }
    );

    expect(dataUsada.nombre).toBe("Nombre custom");
    expect(dataUsada.notas).toBe("Una nota");
  });

  it("400 si el formData no se puede parsear", async () => {
    const req = new NextRequest("http://localhost/api/admin/configuraciones/p1/documentos", {
      method: "POST",
      body: "no-es-form-data",
      headers: { "content-type": "multipart/form-data" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(400);
  });
});

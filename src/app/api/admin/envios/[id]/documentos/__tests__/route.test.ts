// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUnique, mockCreate, mockUploadDocument } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUploadDocument: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    envio: { findUnique: mockFindUnique },
    documentoEnvio: { create: mockCreate },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
const { mockInfoArchivo, mockEliminarArchivo } = vi.hoisted(() => ({
  mockInfoArchivo: vi.fn(),
  mockEliminarArchivo: vi.fn(),
}));
vi.mock("@/lib/admin/storage", () => ({
  buildStoragePath: (scope: string, id: string, filename: string) => `${scope}/${id}/${filename}`,
  uploadDocument: mockUploadDocument,
  BUCKET_MOVARA: "documentos-movara",
  BUCKET_PEDIDOS: "documentos-pedidos",
  crearUrlSubida: vi.fn(),
  infoArchivo: mockInfoArchivo,
  eliminarArchivo: mockEliminarArchivo,
}));

import { POST } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

function makeFormRequest(fields: Record<string, string | File>): NextRequest {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new NextRequest("http://localhost/api/admin/envios/e1/documentos", { method: "POST", body: form });
}

function pdfFile(name = "bl.pdf"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "application/pdf" });
}

describe("POST /api/admin/envios/[id]/documentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUnique.mockResolvedValue({ id: "e1" });
    mockUploadDocument.mockResolvedValue(undefined);
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await POST(makeFormRequest({ file: pdfFile(), seccion: "05_embarque" }), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(res.status).toBe(401);
  });

  it("404 si el envío no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await POST(makeFormRequest({ file: pdfFile(), seccion: "05_embarque" }), {
      params: Promise.resolve({ id: "no-existe" }),
    });
    expect(res.status).toBe(404);
  });

  it("400 si falta el archivo", async () => {
    const res = await POST(makeFormRequest({ seccion: "05_embarque" }), { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
  });

  it("400 si la sección no es una de las 3 del envío", async () => {
    const res = await POST(makeFormRequest({ file: pdfFile(), seccion: "01_cliente" }), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 si el archivo no pasa la validación (excede 20MB)", async () => {
    const big = new File([new Uint8Array(21 * 1024 * 1024)], "grande.pdf", { type: "application/pdf" });
    const res = await POST(makeFormRequest({ file: big, seccion: "05_embarque" }), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(res.status).toBe(400);
  });

  it("500 si la subida a Storage falla", async () => {
    mockUploadDocument.mockRejectedValueOnce(new Error("storage down"));
    const res = await POST(makeFormRequest({ file: pdfFile(), seccion: "05_embarque" }), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(res.status).toBe(500);
  });

  it("201 — sube el archivo y crea el DocumentoEnvio", async () => {
    mockCreate.mockResolvedValueOnce({ id: "doc1" });
    const res = await POST(
      makeFormRequest({ file: pdfFile(), seccion: "05_embarque", descripcion: "BL original" }),
      { params: Promise.resolve({ id: "e1" }) }
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("doc1");
    expect(json.path).toBe("envios/e1/bl.pdf");
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        envioId: "e1",
        seccion: "05_embarque",
        nombre: "bl.pdf",
        descripcion: "BL original",
        url: "envios/e1/bl.pdf",
        tipo: "application/pdf",
        subidoPor: SESSION.email,
      },
    });
  });

  it("201 — archivo de más de 4,5 MB subido directo: verifica en Storage y lo registra", async () => {
    mockCreate.mockResolvedValueOnce({ id: "doc2" });
    mockInfoArchivo.mockResolvedValueOnce({ tamano: 15 * 1024 * 1024, tipo: "application/pdf" });
    const res = await POST(
      makeFormRequest({ fileSubido: JSON.stringify({ path: "envios/e1/uuid-plano.pdf", nombre: "plano.pdf" }), seccion: "05_embarque" }),
      { params: Promise.resolve({ id: "e1" }) }
    );
    expect(res.status).toBe(201);
    expect(mockUploadDocument).not.toHaveBeenCalled();
    expect(mockInfoArchivo).toHaveBeenCalledWith("documentos-movara", "envios/e1/uuid-plano.pdf");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ nombre: "plano.pdf", url: "envios/e1/uuid-plano.pdf", tipo: "application/pdf" }),
    });
  });

  it("400 — subida directa de otra entidad o que supera 20 MB (se borra), sin registrar", async () => {
    const otra = await POST(
      makeFormRequest({ fileSubido: JSON.stringify({ path: "envios/otro/x.pdf", nombre: "x.pdf" }), seccion: "05_embarque" }),
      { params: Promise.resolve({ id: "e1" }) }
    );
    expect(otra.status).toBe(400);
    mockInfoArchivo.mockResolvedValueOnce({ tamano: 25 * 1024 * 1024, tipo: "application/pdf" });
    const grande = await POST(
      makeFormRequest({ fileSubido: JSON.stringify({ path: "envios/e1/uuid-x.pdf", nombre: "x.pdf" }), seccion: "05_embarque" }),
      { params: Promise.resolve({ id: "e1" }) }
    );
    expect(grande.status).toBe(400);
    expect(mockEliminarArchivo).toHaveBeenCalledWith("documentos-movara", "envios/e1/uuid-x.pdf");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("descripcion vacía/no enviada se guarda como null", async () => {
    mockCreate.mockResolvedValueOnce({ id: "doc1" });
    await POST(makeFormRequest({ file: pdfFile(), seccion: "05_embarque" }), {
      params: Promise.resolve({ id: "e1" }),
    });
    expect(mockCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ descripcion: null }) });
  });

  it("400 si el formData no se puede parsear", async () => {
    const req = new NextRequest("http://localhost/api/admin/envios/e1/documentos", {
      method: "POST",
      body: "no-es-form-data",
      headers: { "content-type": "multipart/form-data" },
    });
    const res = await POST(req, { params: Promise.resolve({ id: "e1" }) });
    expect(res.status).toBe(400);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted para que los mocks existan cuando corre el factory de vi.mock ──
const { mockUpload, mockCreateBucket, mockFrom } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockCreateBucket: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: mockFrom,
      createBucket: mockCreateBucket,
    },
  })),
}));

import { buildStoragePath, uploadDocument } from "@/lib/admin/storage";

describe("buildStoragePath", () => {
  it("incluye el scope, el id y el nombre de archivo saneado", () => {
    const path = buildStoragePath("pedidos", "pedido123", "comprobante final.pdf");
    expect(path).toMatch(/^pedidos\/pedido123\/[0-9a-f-]{36}-comprobante_final\.pdf$/);
  });

  it("dos llamadas con el mismo archivo generan paths distintos", () => {
    const a = buildStoragePath("pedidos", "pedido123", "doc.pdf");
    const b = buildStoragePath("pedidos", "pedido123", "doc.pdf");
    expect(a).not.toBe(b);
  });

  it("sanea caracteres fuera de [a-zA-Z0-9._-]", () => {
    const path = buildStoragePath("pedidos", "p1", "áéíóú ñ #$%.pdf");
    expect(path).not.toMatch(/[áéíóúñ#$%\s]/);
    expect(path.endsWith(".pdf")).toBe(true);
  });

  it("distintos scopes producen prefijos distintos", () => {
    const path = buildStoragePath("unidades", "u1", "doc.pdf");
    expect(path).toMatch(/^unidades\/u1\//);
  });
});

describe("uploadDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    mockFrom.mockReturnValue({ upload: mockUpload });
  });

  const bytes = new ArrayBuffer(1);

  it("sube directo si el bucket ya existe — no intenta crearlo", async () => {
    mockUpload.mockResolvedValueOnce({ error: null });

    await uploadDocument("bucket-x", "path", bytes, "application/pdf");

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockCreateBucket).not.toHaveBeenCalled();
  });

  it("crea el bucket y reintenta una vez si no existe", async () => {
    mockUpload
      .mockResolvedValueOnce({ error: { message: "Bucket not found" } })
      .mockResolvedValueOnce({ error: null });
    mockCreateBucket.mockResolvedValueOnce({ error: null });

    await uploadDocument("bucket-x", "path", bytes, "application/pdf");

    expect(mockCreateBucket).toHaveBeenCalledWith("bucket-x", { public: false });
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it("tolera un choque de 'ya existe' al crear (carrera) y reintenta igual", async () => {
    mockUpload
      .mockResolvedValueOnce({ error: { message: "Bucket not found" } })
      .mockResolvedValueOnce({ error: null });
    mockCreateBucket.mockResolvedValueOnce({ error: { message: "Bucket already exists" } });

    await expect(uploadDocument("bucket-x", "path", bytes, "application/pdf")).resolves.toBeUndefined();
    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it("lanza si crear el bucket falla por otro motivo (ej. permisos)", async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: "Bucket not found" } });
    mockCreateBucket.mockResolvedValueOnce({ error: { message: "Permission denied" } });

    await expect(uploadDocument("bucket-x", "path", bytes, "application/pdf")).rejects.toThrow(
      /Permission denied/
    );
  });

  it("lanza si el reintento después de crear el bucket también falla", async () => {
    mockUpload
      .mockResolvedValueOnce({ error: { message: "Bucket not found" } })
      .mockResolvedValueOnce({ error: { message: "Disk full" } });
    mockCreateBucket.mockResolvedValueOnce({ error: null });

    await expect(uploadDocument("bucket-x", "path", bytes, "application/pdf")).rejects.toThrow(/Disk full/);
  });
});

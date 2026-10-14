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

describe("storage local (dev/tests)", () => {
  it("usaStorageLocal: solo sin credenciales y fuera de producción", async () => {
    const { usaStorageLocal } = await import("@/lib/admin/storage");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(usaStorageLocal()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(usaStorageLocal()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("en producción sin credenciales tira error, nunca cae a local", async () => {
    const { uploadDocument, downloadDocument } = await import("@/lib/admin/storage");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    await expect(uploadDocument("b", "p.pdf", new ArrayBuffer(1), "application/pdf")).rejects.toThrow("no configurados");
    await expect(downloadDocument("b", "p.pdf")).rejects.toThrow("no configurados");
    vi.unstubAllEnvs();
  });

  it("rutaLocal no deja salir de la carpeta", async () => {
    const { rutaLocal, LOCAL_STORAGE_DIR } = await import("@/lib/admin/storage");
    expect(rutaLocal("bucket", "unidades/u1/a.pdf")).toBe(`${LOCAL_STORAGE_DIR}/bucket/unidades/u1/a.pdf`);
    expect(() => rutaLocal("bucket", "../../../etc/passwd")).toThrow("fuera del storage local");
  });

  it("sube, firma y descarga en la carpeta local", async () => {
    const { uploadDocument, downloadDocument, getSignedUrl, LOCAL_STORAGE_DIR } = await import("@/lib/admin/storage");
    const { rm } = await import("fs/promises");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const path = `tests/${Date.now()}/hola.txt`;
    await uploadDocument("vitest", path, new TextEncoder().encode("hola").buffer as ArrayBuffer, "text/plain");
    expect((await downloadDocument("vitest", path)).toString()).toBe("hola");
    expect(await getSignedUrl("vitest", path)).toBe(`/api/admin/storage-local?bucket=vitest&path=${encodeURIComponent(path)}`);
    await rm(`${LOCAL_STORAGE_DIR}/vitest`, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("downloadDocument con Supabase: devuelve el archivo o tira el error", async () => {
    const { downloadDocument } = await import("@/lib/admin/storage");
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    const mockDownload = vi.fn()
      .mockResolvedValueOnce({ data: new Blob(["pdf"]), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Object not found" } })
      .mockResolvedValueOnce({ data: null, error: null });
    mockFrom.mockReturnValue({ download: mockDownload });
    expect((await downloadDocument("b", "p")).toString()).toBe("pdf");
    await expect(downloadDocument("b", "p")).rejects.toThrow("Object not found");
    await expect(downloadDocument("b", "p")).rejects.toThrow("sin datos");
  });
});

describe("getSignedUrl con Supabase", () => {
  it("devuelve la URL firmada, o null si Supabase falla", async () => {
    const { getSignedUrl } = await import("@/lib/admin/storage");
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const createSignedUrl = vi.fn()
      .mockResolvedValueOnce({ data: { signedUrl: "https://firmada" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue({ createSignedUrl });
    expect(await getSignedUrl("b", "p")).toBe("https://firmada");
    expect(createSignedUrl).toHaveBeenCalledWith("p", 300);
    expect(await getSignedUrl("b", "p", 60)).toBeNull();
  });
});

describe("subida directa — storage local (dev/e2e)", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });

  it("firma una URL de subida local que vence y no se puede adulterar", async () => {
    const { crearUrlSubida, firmaSubidaLocalValida } = await import("@/lib/admin/storage");
    const url = new URL(await crearUrlSubida("b", "envios/e1/x.pdf"), "http://localhost");
    expect(url.pathname).toBe("/api/admin/storage-local");
    const q = url.searchParams;
    const vence = Number(q.get("vence"));
    expect(firmaSubidaLocalValida("b", "envios/e1/x.pdf", vence, q.get("firma")!)).toBe(true);
    expect(firmaSubidaLocalValida("b", "envios/e1/otro.pdf", vence, q.get("firma")!)).toBe(false);
    expect(firmaSubidaLocalValida("b", "envios/e1/x.pdf", vence, "corta")).toBe(false);
    expect(firmaSubidaLocalValida("b", "envios/e1/x.pdf", Date.now() - 1, q.get("firma")!)).toBe(false);
    expect(firmaSubidaLocalValida("b", "envios/e1/x.pdf", NaN, q.get("firma")!)).toBe(false);
    vi.unstubAllEnvs();
  });

  it("guarda la subida, informa tamaño y tipo, no pisa y la borra", async () => {
    const { guardarSubidaLocal, infoArchivo, eliminarArchivo, LOCAL_STORAGE_DIR } = await import("@/lib/admin/storage");
    const { rm, unlink } = await import("fs/promises");
    const path = `tests/${Date.now()}/grande.pdf`;
    await guardarSubidaLocal("vitest-subidas", path, new Uint8Array(5).buffer, "application/pdf");
    expect(await infoArchivo("vitest-subidas", path)).toEqual({ tamano: 5, tipo: "application/pdf" });
    await expect(guardarSubidaLocal("vitest-subidas", path, new Uint8Array(1).buffer, "application/pdf")).rejects.toThrow();
    await unlink(`${LOCAL_STORAGE_DIR}/vitest-subidas/${path}.tipo`);
    expect(await infoArchivo("vitest-subidas", path)).toEqual({ tamano: 5, tipo: "" });
    await eliminarArchivo("vitest-subidas", path);
    expect(await infoArchivo("vitest-subidas", path)).toBeNull();
    await rm(`${LOCAL_STORAGE_DIR}/vitest-subidas`, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("sin AUTH_SECRET firma igual con NEXTAUTH_SECRET o el secreto de desarrollo", async () => {
    const { firmaSubidaLocal } = await import("@/lib/admin/storage");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    const dev = firmaSubidaLocal("b", "p", 1);
    vi.stubEnv("NEXTAUTH_SECRET", "otro");
    expect(firmaSubidaLocal("b", "p", 1)).not.toBe(dev);
    vi.unstubAllEnvs();
  });
});

describe("subida directa — Supabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("crearUrlSubida usa createSignedUploadUrl y crea el bucket si falta", async () => {
    const { crearUrlSubida } = await import("@/lib/admin/storage");
    const createSignedUploadUrl = vi.fn()
      .mockResolvedValueOnce({ data: { signedUrl: "https://sube" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Bucket not found" } })
      .mockResolvedValueOnce({ data: { signedUrl: "https://sube2" }, error: null });
    mockFrom.mockReturnValue({ createSignedUploadUrl });
    expect(await crearUrlSubida("b", "p")).toBe("https://sube");
    expect(createSignedUploadUrl).toHaveBeenCalledWith("p");
    mockCreateBucket.mockResolvedValueOnce({ error: null });
    expect(await crearUrlSubida("b", "p")).toBe("https://sube2");
    expect(mockCreateBucket).toHaveBeenCalledWith("b", { public: false });
  });

  it("crearUrlSubida tira si no puede firmar o crear el bucket", async () => {
    const { crearUrlSubida } = await import("@/lib/admin/storage");
    const createSignedUploadUrl = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: "denied" } })
      .mockResolvedValueOnce({ data: null, error: { message: "Bucket not found" } });
    mockFrom.mockReturnValue({ createSignedUploadUrl });
    await expect(crearUrlSubida("b", "p")).rejects.toThrow("denied");
    mockCreateBucket.mockResolvedValueOnce({ error: { message: "permission denied" } });
    await expect(crearUrlSubida("b", "p")).rejects.toThrow("Error al crear el bucket");
    createSignedUploadUrl.mockResolvedValueOnce({ data: null, error: null });
    await expect(crearUrlSubida("b", "p")).rejects.toThrow("sin datos");
  });

  it("infoArchivo devuelve tamaño y tipo, o null si no existe", async () => {
    const { infoArchivo } = await import("@/lib/admin/storage");
    const info = vi.fn()
      .mockResolvedValueOnce({ data: { size: 9_000_000, contentType: "application/pdf" }, error: null })
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "Object not found" } });
    mockFrom.mockReturnValue({ info });
    expect(await infoArchivo("b", "p")).toEqual({ tamano: 9_000_000, tipo: "application/pdf" });
    expect(await infoArchivo("b", "p")).toEqual({ tamano: 0, tipo: "" });
    expect(await infoArchivo("b", "p")).toBeNull();
  });

  it("eliminarArchivo borra y solo loguea si falla", async () => {
    const { eliminarArchivo } = await import("@/lib/admin/storage");
    const remove = vi.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "x" } });
    mockFrom.mockReturnValue({ remove });
    await eliminarArchivo("b", "p");
    expect(remove).toHaveBeenCalledWith(["p"]);
    await expect(eliminarArchivo("b", "p")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

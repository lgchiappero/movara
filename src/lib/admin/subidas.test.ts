import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  pedido: vi.fn(),
  envio: vi.fn(),
  unidad: vi.fn(),
  acuerdo: vi.fn(),
  crearUrl: vi.fn(),
  info: vi.fn(),
  eliminar: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    configuracionPedido: { findUnique: m.pedido },
    envio: { findUnique: m.envio },
    unidad: { findUnique: m.unidad },
    acuerdoPago: { findUnique: m.acuerdo },
  },
}));
vi.mock("@/lib/admin/storage", () => ({
  BUCKET_MOVARA: "documentos-movara",
  BUCKET_PEDIDOS: "documentos-pedidos",
  buildStoragePath: (scope: string, id: string, nombre: string) => `${scope}/${id}/uuid-${nombre}`,
  crearUrlSubida: m.crearUrl,
  infoArchivo: m.info,
  eliminarArchivo: m.eliminar,
  uploadDocument: m.upload,
}));

import { archivoDelFormulario, CONFIG_DESTINOS, firmarSubida, verificarSubida } from "./subidas";

const PDF = "application/pdf";
const MB = 1024 * 1024;

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of [m.pedido, m.envio, m.unidad, m.acuerdo]) f.mockResolvedValue({ id: "x" });
  m.crearUrl.mockResolvedValue("https://sube");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("firmarSubida", () => {
  it("firma una subida de 15 MB y devuelve el path dentro de la entidad", async () => {
    const r = await firmarSubida("envios", "e1", { nombre: "plano.pdf", tipo: PDF, tamano: 15 * MB });
    expect(r).toEqual({ ok: true, value: { path: "envios/e1/uuid-plano.pdf", signedUrl: "https://sube" } });
    expect(m.crearUrl).toHaveBeenCalledWith("documentos-movara", "envios/e1/uuid-plano.pdf");
  });

  it("pedidos va al bucket de pedidos y también acepta hasta 20 MB", async () => {
    const r = await firmarSubida("pedidos", "p1", { nombre: "a.pdf", tipo: PDF, tamano: 20 * MB });
    expect(r.ok).toBe(true);
    expect(m.crearUrl).toHaveBeenCalledWith("documentos-pedidos", "pedidos/p1/uuid-a.pdf");
  });

  it("rechaza más de 20 MB o un tipo no permitido, sin firmar", async () => {
    expect(await firmarSubida("unidades", "u1", { nombre: "a.pdf", tipo: PDF, tamano: 20 * MB + 1 })).toMatchObject({
      ok: false,
      status: 400,
      error: "El archivo supera el máximo de 20MB",
    });
    expect(await firmarSubida("cobranza", "a1", { nombre: "a.exe", tipo: "application/x-msdownload", tamano: 10 })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(m.crearUrl).not.toHaveBeenCalled();
  });

  it("404 si la entidad no existe", async () => {
    m.acuerdo.mockResolvedValueOnce(null);
    expect(await firmarSubida("cobranza", "nada", { nombre: "a.pdf", tipo: PDF, tamano: 10 })).toMatchObject({ ok: false, status: 404 });
  });

  it("500 si Storage no firma", async () => {
    m.crearUrl.mockRejectedValueOnce(new Error("caído"));
    expect(await firmarSubida("logistica", "e1", { nombre: "a.pdf", tipo: PDF, tamano: 10 })).toMatchObject({ ok: false, status: 500 });
    m.crearUrl.mockRejectedValueOnce("raro");
    expect(await firmarSubida("logistica", "e1", { nombre: "a.pdf", tipo: PDF, tamano: 10 })).toMatchObject({ ok: false, status: 500 });
  });

  it("cada destino verifica su propia entidad", async () => {
    for (const destino of Object.keys(CONFIG_DESTINOS) as (keyof typeof CONFIG_DESTINOS)[]) {
      expect(await CONFIG_DESTINOS[destino].existe("x")).toBe(true);
    }
    m.unidad.mockResolvedValueOnce(null);
    expect(await CONFIG_DESTINOS.unidades.existe("x")).toBe(false);
  });
});

describe("verificarSubida", () => {
  it("acepta el archivo subido con tamaño y tipo reales válidos", async () => {
    m.info.mockResolvedValueOnce({ tamano: 9 * MB, tipo: PDF });
    expect(await verificarSubida("envios", "e1", "envios/e1/uuid-a.pdf")).toEqual({
      ok: true,
      value: { path: "envios/e1/uuid-a.pdf", tipo: PDF, tamano: 9 * MB },
    });
    expect(m.info).toHaveBeenCalledWith("documentos-movara", "envios/e1/uuid-a.pdf");
  });

  it("rechaza paths de otra entidad, con '..' o demasiado largos, sin mirar Storage", async () => {
    for (const path of ["envios/otro/a.pdf", "unidades/e1/a.pdf", "envios/e1/../x/a.pdf", `envios/e1/${"a".repeat(400)}`]) {
      expect(await verificarSubida("envios", "e1", path)).toMatchObject({ ok: false, status: 400, error: "Archivo inválido" });
    }
    expect(m.info).not.toHaveBeenCalled();
  });

  it("si el archivo no está, pide reintentar", async () => {
    m.info.mockResolvedValueOnce(null);
    expect(await verificarSubida("envios", "e1", "envios/e1/a.pdf")).toMatchObject({ ok: false, status: 400 });
  });

  it("si el archivo real no pasa la validación, lo borra", async () => {
    m.info.mockResolvedValueOnce({ tamano: 25 * MB, tipo: PDF });
    expect(await verificarSubida("envios", "e1", "envios/e1/a.pdf")).toMatchObject({
      ok: false,
      error: "El archivo supera el máximo de 20MB",
    });
    expect(m.eliminar).toHaveBeenCalledWith("documentos-movara", "envios/e1/a.pdf");
    m.info.mockResolvedValueOnce({ tamano: 10, tipo: "text/html" });
    expect((await verificarSubida("envios", "e1", "envios/e1/b.pdf")).ok).toBe(false);
    expect(m.eliminar).toHaveBeenCalledTimes(2);
  });
});

describe("archivoDelFormulario", () => {
  const conArchivo = (campo: string, file: File) => {
    const f = new FormData();
    f.set(campo, file);
    return f;
  };

  it("sin archivo devuelve null", async () => {
    expect(await archivoDelFormulario(new FormData(), "file", "envios", "e1")).toEqual({ ok: true, value: null });
    expect(await archivoDelFormulario(conArchivo("file", new File([], "vacio.pdf")), "file", "envios", "e1")).toEqual({ ok: true, value: null });
  });

  it("archivo chico: valida y lo sube como hasta ahora", async () => {
    const file = new File(["%PDF"], "a.pdf", { type: PDF });
    expect(await archivoDelFormulario(conArchivo("file", file), "file", "unidades", "u1")).toEqual({
      ok: true,
      value: { path: "unidades/u1/uuid-a.pdf", nombre: "a.pdf", tipo: PDF },
    });
    expect(m.upload).toHaveBeenCalledWith("documentos-movara", "unidades/u1/uuid-a.pdf", expect.any(ArrayBuffer), PDF);
  });

  it("archivo chico inválido o que no se pudo subir", async () => {
    const malo = new File(["x"], "a.txt", { type: "text/plain" });
    expect(await archivoDelFormulario(conArchivo("file", malo), "file", "envios", "e1")).toMatchObject({ ok: false, status: 400 });
    m.upload.mockRejectedValueOnce(new Error("caído"));
    const file = new File(["%PDF"], "a.pdf", { type: PDF });
    expect(await archivoDelFormulario(conArchivo("comprobante", file), "comprobante", "cobranza", "a1", "No pudimos subir el comprobante")).toEqual({
      ok: false,
      status: 500,
      error: "No pudimos subir el comprobante",
    });
    m.upload.mockRejectedValueOnce("raro");
    expect(await archivoDelFormulario(conArchivo("file", file), "file", "envios", "e1")).toMatchObject({
      error: "No pudimos subir el archivo",
    });
  });

  it("archivo grande ya subido: verifica la referencia y usa el nombre original", async () => {
    m.info.mockResolvedValueOnce({ tamano: 12 * MB, tipo: PDF });
    const f = new FormData();
    f.set("comprobanteSubido", JSON.stringify({ path: "cobranza/a1/uuid-recibo.pdf", nombre: " recibo.pdf " }));
    expect(await archivoDelFormulario(f, "comprobante", "cobranza", "a1")).toEqual({
      ok: true,
      value: { path: "cobranza/a1/uuid-recibo.pdf", nombre: "recibo.pdf", tipo: PDF },
    });
    m.info.mockResolvedValueOnce({ tamano: 12 * MB, tipo: PDF });
    f.set("comprobanteSubido", JSON.stringify({ path: "cobranza/a1/uuid-recibo.pdf", nombre: "  " }));
    expect(await archivoDelFormulario(f, "comprobante", "cobranza", "a1")).toMatchObject({ value: { nombre: "uuid-recibo.pdf" } });
  });

  it("referencia mal formada, de otra entidad o que no pasa la verificación", async () => {
    const f = new FormData();
    for (const valor of ["{no es json", JSON.stringify({ path: 1, nombre: "a" }), JSON.stringify({ path: "x" })]) {
      f.set("fileSubido", valor);
      expect(await archivoDelFormulario(f, "file", "envios", "e1")).toMatchObject({ ok: false, status: 400, error: "Archivo inválido" });
    }
    f.set("fileSubido", JSON.stringify({ path: "envios/otro/a.pdf", nombre: "a.pdf" }));
    expect(await archivoDelFormulario(f, "file", "envios", "e1")).toMatchObject({ ok: false, status: 400 });
  });
});

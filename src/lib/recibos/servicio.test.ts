import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReciboConformidad } from "@prisma/client";

const m = vi.hoisted(() => ({
  unidadFindUnique: vi.fn(),
  unidadUpdate: vi.fn(),
  reciboFindFirst: vi.fn(),
  reciboFindUnique: vi.fn(),
  reciboFindUniqueOrThrow: vi.fn(),
  reciboCreate: vi.fn(),
  reciboUpdate: vi.fn(),
  reciboUpdateMany: vi.fn(),
  reciboFindMany: vi.fn().mockResolvedValue([]),
  documentoCreate: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  enviar: vi.fn(),
  render: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const recibo = {
    findFirst: m.reciboFindFirst,
    findUnique: m.reciboFindUnique,
    findUniqueOrThrow: m.reciboFindUniqueOrThrow,
    create: m.reciboCreate,
    update: m.reciboUpdate,
    updateMany: m.reciboUpdateMany,
    findMany: m.reciboFindMany,
  };
  const tx = { reciboConformidad: recibo, unidad: { update: m.unidadUpdate } };
  return {
    db: {
      unidad: { findUnique: m.unidadFindUnique },
      reciboConformidad: recibo,
      documentoUnidad: { create: m.documentoCreate },
      $transaction: (arg: unknown) => (typeof arg === "function" ? (arg as (t: typeof tx) => unknown)(tx) : Promise.all(arg as unknown[])),
    },
  };
});
vi.mock("@/lib/admin/storage", () => ({
  BUCKET_MOVARA: "documentos-movara",
  LOCAL_STORAGE_DIR: "/tmp/no-usado",
  buildStoragePath: (scope: string, id: string, nombre: string) => `${scope}/${id}/uuid-${nombre}`,
  uploadDocument: m.upload,
  downloadDocument: m.download,
}));
vi.mock("./enviar-email", async (orig) => ({
  ...(await orig<typeof import("./enviar-email")>()),
  enviarEmailRecibo: m.enviar,
}));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: m.render }));
vi.mock("@/lib/pdf/ReciboConformidadDocument", () => ({ ReciboConformidadDocument: (props: unknown) => props }));

import {
  crearRecibo,
  enviarSolicitud,
  reciboPorToken,
  confirmarRecibo,
  verificarHash,
  generarPdfRecibo,
  obtenerPdfRecibo,
  despuesDeConfirmar,
  anularRecibo,
  lugarPorDefecto,
  faltantesParaRecibo,
  nombreArchivoPdf,
} from "./servicio";

const TOKEN = "a".repeat(64);

const UNIDAD = {
  id: "u1",
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
  cliente: { nombre: "Ana García", dni: "30123456", cuit: null, email: " ana@movara.test ", telefono: "+54 9 11" },
};

function recibo(o: Partial<ReciboConformidad> = {}): ReciboConformidad {
  return {
    id: "r1",
    createdAt: new Date("2026-10-01T12:00:00Z"),
    updatedAt: new Date("2026-10-01T12:00:00Z"),
    unidadId: "u1",
    numeroRecibo: "REC-2026-001",
    token: TOKEN,
    estado: "pendiente",
    fechaEntrega: new Date("2026-10-08T00:00:00.000Z"),
    lugarEntrega: "Sunchales, Santa Fe",
    observaciones: null,
    creadoPor: "admin@movara.com.ar",
    clienteNombre: "Ana García",
    clienteDni: "30123456",
    clienteCuit: null,
    clienteEmail: "ana@movara.test",
    clienteTelefono: null,
    numeroUnidad: "MOV-UNIDAD-2026-001",
    modelo: "Flex 38",
    emailEnviadoAt: null,
    emailEnviadoA: null,
    confirmadoAt: null,
    ipConfirmacion: null,
    userAgent: null,
    textoConfirmado: null,
    hashContenido: null,
    pdfPath: null,
    anuladoAt: null,
    anuladoPor: null,
    ...o,
  };
}

const INPUT = { unidadId: "u1", fechaEntrega: new Date("2026-10-08T00:00:00.000Z"), lugarEntrega: "Sunchales, Santa Fe", observaciones: null };

beforeEach(() => {
  vi.clearAllMocks();
  m.reciboFindMany.mockResolvedValue([]);
  m.render.mockResolvedValue(Buffer.from("%PDF-1.7"));
  m.enviar.mockResolvedValue({ ok: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("helpers", () => {
  it("lugarPorDefecto une dirección, localidad y provincia con lo que haya", () => {
    expect(lugarPorDefecto({ direccionEntrega: "Ruta 34 km 230", localidadDestino: " Sunchales ", provinciaDestino: "Santa Fe" })).toBe(
      "Ruta 34 km 230, Sunchales, Santa Fe"
    );
    expect(lugarPorDefecto({ direccionEntrega: null, localidadDestino: "", provinciaDestino: "Santa Fe" })).toBe("Santa Fe");
  });

  it("faltantesParaRecibo exige Nº, modelo y email del cliente", () => {
    expect(faltantesParaRecibo(UNIDAD)).toEqual([]);
    expect(faltantesParaRecibo({ numeroUnidad: null, modelo: " ", cliente: { email: null } })).toEqual([
      "Nº de unidad",
      "modelo",
      "email del cliente",
    ]);
  });

  it("nombre del PDF", () => expect(nombreArchivoPdf({ numeroRecibo: "REC-2026-001" })).toBe("Recibo en Conformidad REC-2026-001.pdf"));
});

describe("crearRecibo", () => {
  it("404 si la unidad no existe", async () => {
    m.unidadFindUnique.mockResolvedValue(null);
    expect(await crearRecibo(INPUT, "admin")).toEqual({ ok: false, status: 404, error: "Unidad no encontrada" });
  });

  it("400 con la lista de lo que falta", async () => {
    m.unidadFindUnique.mockResolvedValue({ ...UNIDAD, modelo: null, cliente: { ...UNIDAD.cliente, email: null } });
    expect(await crearRecibo(INPUT, "admin")).toEqual({ ok: false, status: 400, error: "Para emitir el recibo falta: modelo, email del cliente" });
  });

  it("409 si la unidad ya tiene un recibo no anulado", async () => {
    m.unidadFindUnique.mockResolvedValue(UNIDAD);
    m.reciboFindFirst.mockResolvedValue({ numeroRecibo: "REC-2026-004" });
    expect(await crearRecibo(INPUT, "admin")).toEqual({ ok: false, status: 409, error: "La unidad ya tiene el recibo REC-2026-004 sin anular" });
    expect(m.reciboFindFirst.mock.calls[0][0].where).toEqual({ unidadId: "u1", estado: { not: "anulado" } });
  });

  it("crea con número correlativo y snapshot de cliente y unidad", async () => {
    m.unidadFindUnique.mockResolvedValue(UNIDAD);
    m.reciboFindFirst.mockResolvedValue(null);
    m.reciboCreate.mockImplementation(({ data }) => Promise.resolve(recibo(data)));
    const res = await crearRecibo(INPUT, "admin@movara.com.ar");
    expect(res.ok).toBe(true);
    expect(m.reciboCreate.mock.calls[0][0].data).toMatchObject({
      numeroRecibo: "REC-" + new Date().getFullYear() + "-001",
      creadoPor: "admin@movara.com.ar",
      clienteNombre: "Ana García",
      clienteDni: "30123456",
      clienteEmail: "ana@movara.test",
      clienteTelefono: "+54 9 11",
      numeroUnidad: "MOV-UNIDAD-2026-001",
      modelo: "Flex 38",
    });
  });

  it("propaga errores inesperados", async () => {
    m.unidadFindUnique.mockResolvedValue(UNIDAD);
    m.reciboFindFirst.mockRejectedValue(new Error("db"));
    await expect(crearRecibo(INPUT, "admin")).rejects.toThrow("db");
  });
});

describe("enviarSolicitud", () => {
  it("manda el email con el link y registra cuándo y a quién", async () => {
    const res = await enviarSolicitud(recibo(), "http://localhost:3000");
    expect(res).toEqual({ ok: true });
    const [email, opciones] = m.enviar.mock.calls[0];
    expect(email.to).toBe("ana@movara.test");
    expect(email.subject).toBe("Confirmá la recepción de tu MOVARA · REC-2026-001");
    expect(email.html).toContain(`http://localhost:3000/recibo/${TOKEN}`);
    expect(opciones).toEqual({ prueba: false });
    expect(m.reciboUpdate.mock.calls[0][0].data).toMatchObject({ emailEnviadoA: "ana@movara.test", emailEnviadoAt: expect.any(Date) });
  });

  it("si falla, no registra el envío y lo loguea", async () => {
    m.enviar.mockResolvedValue({ ok: false, error: "rebotó" });
    expect(await enviarSolicitud(recibo())).toEqual({ ok: false, error: "rebotó" });
    expect(m.reciboUpdate).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("recibo de prueba (@example.com) va a la bandeja local", async () => {
    await enviarSolicitud(recibo({ clienteEmail: "x@example.com" }));
    expect(m.enviar.mock.calls[0][1]).toEqual({ prueba: true });
  });
});

describe("reciboPorToken", () => {
  it("devuelve null si no existe o está anulado", async () => {
    m.reciboFindUnique.mockResolvedValueOnce(null);
    expect(await reciboPorToken(TOKEN)).toBeNull();
    m.reciboFindUnique.mockResolvedValueOnce(recibo({ estado: "anulado" }));
    expect(await reciboPorToken(TOKEN)).toBeNull();
    m.reciboFindUnique.mockResolvedValueOnce(recibo());
    expect(await reciboPorToken(TOKEN)).toMatchObject({ id: "r1" });
  });
});

describe("confirmarRecibo", () => {
  const ev = { ip: "190.1.2.3", userAgent: "Mozilla/5.0" };
  const ahora = new Date("2026-10-08T13:00:00.000Z");

  it("404 si el link no es válido o el recibo está anulado", async () => {
    m.reciboFindUnique.mockResolvedValue(recibo({ estado: "anulado" }));
    expect(await confirmarRecibo(TOKEN, ev)).toMatchObject({ ok: false, status: 404 });
  });

  it("409 si ya estaba confirmado (no vuelve a escribir nada)", async () => {
    m.reciboFindUnique.mockResolvedValue(recibo({ estado: "confirmado" }));
    expect(await confirmarRecibo(TOKEN, ev)).toMatchObject({ ok: false, status: 409 });
    expect(m.reciboUpdateMany).not.toHaveBeenCalled();
  });

  it("confirma con evidencia + hash y en la misma transacción entrega la unidad con garantía de 12 meses", async () => {
    m.reciboFindUnique.mockResolvedValue(recibo());
    m.reciboUpdateMany.mockResolvedValue({ count: 1 });
    m.reciboFindUniqueOrThrow.mockImplementation(() =>
      Promise.resolve(recibo({ estado: "confirmado", ...m.reciboUpdateMany.mock.calls[0][0].data }))
    );
    const res = await confirmarRecibo(TOKEN, ev, ahora);
    expect(res.ok).toBe(true);

    const upd = m.reciboUpdateMany.mock.calls[0][0];
    expect(upd.where).toEqual({ id: "r1", estado: "pendiente" });
    expect(upd.data).toMatchObject({ estado: "confirmado", confirmadoAt: ahora, ipConfirmacion: "190.1.2.3", userAgent: "Mozilla/5.0" });
    expect(upd.data.textoConfirmado).toContain("RECIBO EN CONFORMIDAD DE ENTREGA");
    expect(upd.data.hashContenido).toMatch(/^[a-f0-9]{64}$/);

    expect(m.unidadUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        estadoFabricacion: "entregado",
        fechaEntrega: new Date("2026-10-08T00:00:00.000Z"),
        garantiaActivada: true,
        garantiaInicio: new Date("2026-10-08T00:00:00.000Z"),
        garantiaFin: new Date("2027-10-08T00:00:00.000Z"),
      },
    });
    if (res.ok) expect(verificarHash(res.recibo)).toBe(true);
  });

  it("dos confirmaciones simultáneas: la que pierde la carrera recibe 409 y no toca la unidad", async () => {
    m.reciboFindUnique.mockResolvedValue(recibo());
    m.reciboUpdateMany.mockResolvedValue({ count: 0 });
    expect(await confirmarRecibo(TOKEN, ev, ahora)).toMatchObject({ ok: false, status: 409 });
    expect(m.unidadUpdate).not.toHaveBeenCalled();
  });

  it("usa la hora actual por defecto", async () => {
    m.reciboFindUnique.mockResolvedValue(recibo());
    m.reciboUpdateMany.mockResolvedValue({ count: 1 });
    m.reciboFindUniqueOrThrow.mockResolvedValue(recibo({ estado: "confirmado" }));
    await confirmarRecibo(TOKEN, ev);
    expect(m.reciboUpdateMany.mock.calls[0][0].data.confirmadoAt).toBeInstanceOf(Date);
  });
});

describe("verificarHash", () => {
  async function confirmado() {
    m.reciboFindUnique.mockResolvedValue(recibo());
    m.reciboUpdateMany.mockResolvedValue({ count: 1 });
    m.reciboFindUniqueOrThrow.mockImplementation(() =>
      Promise.resolve(recibo({ estado: "confirmado", ...m.reciboUpdateMany.mock.calls.at(-1)![0].data }))
    );
    const res = await confirmarRecibo(TOKEN, { ip: "1.1.1.1", userAgent: "UA" }, new Date("2026-10-08T13:00:00Z"));
    return (res as { recibo: ReciboConformidad }).recibo;
  }

  it("detecta cambios en los datos guardados o en el texto", async () => {
    const r = await confirmado();
    expect(verificarHash(r)).toBe(true);
    expect(verificarHash({ ...r, ipConfirmacion: "2.2.2.2" })).toBe(false);
    expect(verificarHash({ ...r, observaciones: "agregado después" })).toBe(false);
    expect(verificarHash({ ...r, textoConfirmado: r.textoConfirmado + " " })).toBe(false);
  });

  it("false si no está confirmado", () => {
    expect(verificarHash(recibo())).toBe(false);
  });
});

describe("PDF", () => {
  const confirmado = recibo({ estado: "confirmado", confirmadoAt: new Date("2026-10-08T13:00:00Z"), hashContenido: "f".repeat(64) });

  it("generarPdfRecibo solo para recibos confirmados", async () => {
    await expect(generarPdfRecibo(recibo())).rejects.toThrow("no está confirmado");
    expect(await generarPdfRecibo(confirmado)).toEqual(Buffer.from("%PDF-1.7"));
    const props = m.render.mock.calls[0][0];
    expect(props.texto.numero).toBe("Nº REC-2026-001");
    expect(props.evidencia).toMatchObject({ clienteEmail: "ana@movara.test", hashContenido: "f".repeat(64) });
  });

  it("obtenerPdfRecibo usa el guardado y, si no se puede leer, lo regenera", async () => {
    m.download.mockResolvedValueOnce(Buffer.from("guardado"));
    expect(await obtenerPdfRecibo({ ...confirmado, pdfPath: "p.pdf" })).toEqual(Buffer.from("guardado"));
    m.download.mockRejectedValueOnce(new Error("no existe"));
    expect(await obtenerPdfRecibo({ ...confirmado, pdfPath: "p.pdf" })).toEqual(Buffer.from("%PDF-1.7"));
    expect(await obtenerPdfRecibo(confirmado)).toEqual(Buffer.from("%PDF-1.7"));
  });
});

describe("despuesDeConfirmar", () => {
  const r = recibo({ estado: "confirmado", confirmadoAt: new Date("2026-10-08T13:00:00Z"), hashContenido: "f".repeat(64) });

  it("guarda el PDF en 07_entrega y lo manda al cliente y a contacto@movara.com.ar", async () => {
    await despuesDeConfirmar(r);
    expect(m.upload.mock.calls[0][0]).toBe("documentos-movara");
    expect(m.upload.mock.calls[0][1]).toBe("unidades/u1/uuid-Recibo en Conformidad REC-2026-001.pdf");
    expect(m.documentoCreate.mock.calls[0][0].data).toMatchObject({
      unidadId: "u1",
      seccion: "07_entrega",
      nombre: "Recibo en Conformidad REC-2026-001.pdf",
      tipo: "application/pdf",
    });
    expect(m.reciboUpdate.mock.calls[0][0].data).toEqual({ pdfPath: "unidades/u1/uuid-Recibo en Conformidad REC-2026-001.pdf" });
    expect(m.enviar.mock.calls.map(([e]) => e.to)).toEqual(["ana@movara.test", "contacto@movara.com.ar"]);
    expect(m.enviar.mock.calls[0][0].attachments[0].filename).toBe("Recibo en Conformidad REC-2026-001.pdf");
  });

  it("si falla el PDF no sigue (el recibo ya quedó confirmado)", async () => {
    m.render.mockRejectedValue(new Error("pdf"));
    await despuesDeConfirmar(r);
    expect(m.upload).not.toHaveBeenCalled();
    expect(m.enviar).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("si falla el guardado igual manda los emails; si falla un email lo loguea", async () => {
    m.upload.mockRejectedValue(new Error("storage"));
    m.enviar.mockResolvedValueOnce({ ok: false, error: "rebotó" });
    await despuesDeConfirmar(r);
    expect(m.documentoCreate).not.toHaveBeenCalled();
    expect(m.enviar).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

describe("anularRecibo", () => {
  it("anula si está pendiente", async () => {
    m.reciboUpdateMany.mockResolvedValue({ count: 1 });
    expect(await anularRecibo("r1", "admin@movara.com.ar")).toEqual({ ok: true });
    expect(m.reciboUpdateMany.mock.calls[0][0]).toMatchObject({
      where: { id: "r1", estado: "pendiente" },
      data: { estado: "anulado", anuladoPor: "admin@movara.com.ar" },
    });
  });

  it("404 si no existe, 409 si no está pendiente", async () => {
    m.reciboUpdateMany.mockResolvedValue({ count: 0 });
    m.reciboFindUnique.mockResolvedValueOnce(null);
    expect(await anularRecibo("x", "a")).toMatchObject({ ok: false, status: 404 });
    m.reciboFindUnique.mockResolvedValueOnce({ estado: "confirmado" });
    expect(await anularRecibo("r1", "a")).toMatchObject({ ok: false, status: 409 });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { adjuntarArchivo, enviarConProgreso, enviarFormularioConArchivos, ErrorSubida, mensajeDeError } from "./subida-cliente";

const MB = 1024 * 1024;
const archivo = (bytes: number, nombre = "plano.pdf", type = "application/pdf") => {
  const f = new File(["x"], nombre, { type });
  Object.defineProperty(f, "size", { value: bytes });
  return f;
};

/** Respuesta que va a dar el próximo XMLHttpRequest. */
type RespuestaXhr = { status?: number; body?: string; progreso?: [number, number][]; red?: "error" | "abort"; sinLongitud?: boolean };

/** XMLHttpRequest falso: guarda lo que se envió y responde con la cola. */
class XhrFalso {
  static enviados: XhrFalso[] = [];
  static cola: RespuestaXhr[] = [];
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  responseText = "";
  upload: { onprogress: ((e: { loaded: number; total: number; lengthComputable: boolean }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v;
  }
  send(body: unknown) {
    this.body = body;
    XhrFalso.enviados.push(this);
    const r = XhrFalso.cola.shift() ?? { status: 200, body: "{}" };
    queueMicrotask(() => {
      for (const [loaded, total] of r.progreso ?? []) this.upload.onprogress?.({ loaded, total, lengthComputable: !r.sinLongitud });
      if (r.red === "error") return this.onerror?.();
      if (r.red === "abort") return this.onabort?.();
      this.status = r.status ?? 200;
      this.responseText = r.body ?? "";
      this.onload?.();
    });
  }
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  XhrFalso.enviados = [];
  XhrFalso.cola = [];
  vi.stubGlobal("XMLHttpRequest", XhrFalso);
});
afterEach(() => vi.unstubAllGlobals());

describe("adjuntarArchivo", () => {
  it("hasta 4 MB va en el mismo formulario, sin subida directa", async () => {
    const form = new FormData();
    const file = archivo(4 * MB);
    await adjuntarArchivo(form, "file", file, "envios", "e1");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("más de 4 MB: pide la firma, sube con PUT y el formulario lleva la referencia", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ path: "envios/e1/uuid-plano.pdf", signedUrl: "https://sube" }) });
    XhrFalso.cola.push({ status: 200, progreso: [[6 * MB, 12 * MB], [12 * MB, 12 * MB]] });
    const form = new FormData();
    const file = archivo(12 * MB);
    const progreso = vi.fn();
    await adjuntarArchivo(form, "comprobante", file, "cobranza", "a1", progreso);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/admin/subidas", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      destino: "cobranza",
      entidadId: "a1",
      nombre: "plano.pdf",
      tipo: "application/pdf",
      tamano: 12 * MB,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [put] = XhrFalso.enviados;
    expect(put).toMatchObject({ method: "PUT", url: "https://sube", headers: { "Content-Type": "application/pdf" }, body: file });
    expect(progreso.mock.calls).toEqual([[0.5], [1]]);
    expect(form.get("comprobante")).toBeNull();
    expect(JSON.parse(form.get("comprobanteSubido") as string)).toEqual({ path: "envios/e1/uuid-plano.pdf", nombre: "plano.pdf" });
  });

  it("sin tipo sube como application/octet-stream", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ path: "p", signedUrl: "https://sube" }) });
    await adjuntarArchivo(new FormData(), "file", archivo(5 * MB, "x", ""), "envios", "e1");
    expect(XhrFalso.enviados[0].headers).toEqual({ "Content-Type": "application/octet-stream" });
  });

  it("más de 20 MB se rechaza sin llamar al servidor", async () => {
    await expect(adjuntarArchivo(new FormData(), "file", archivo(21 * MB), "envios", "e1")).rejects.toThrow(
      "El archivo supera el máximo de 20MB"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si el servidor no firma, muestra su error (o uno genérico)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Tipo de archivo no permitido" }) });
    await expect(adjuntarArchivo(new FormData(), "file", archivo(5 * MB), "envios", "e1")).rejects.toThrow("Tipo de archivo no permitido");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("no json"); } });
    await expect(adjuntarArchivo(new FormData(), "file", archivo(5 * MB), "envios", "e1")).rejects.toThrow(
      "No pudimos preparar la subida del archivo."
    );
  });

  it("si falla el PUT a Storage (error o caída de red), avisa y no deja referencia", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ path: "p", signedUrl: "https://sube" }) });
    XhrFalso.cola.push({ status: 403 }, { red: "error" });
    const form = new FormData();
    await expect(adjuntarArchivo(form, "file", archivo(5 * MB), "envios", "e1")).rejects.toBeInstanceOf(ErrorSubida);
    await expect(adjuntarArchivo(form, "file", archivo(5 * MB), "envios", "e1")).rejects.toThrow("No pudimos subir el archivo. Probá de nuevo.");
    expect(form.get("fileSubido")).toBeNull();
  });
});

describe("enviarConProgreso", () => {
  it("envía con método y headers, informa el progreso y devuelve el JSON", async () => {
    XhrFalso.cola.push({ status: 201, body: JSON.stringify({ ok: true, id: "d1" }), progreso: [[1, 4], [4, 4]] });
    const progreso = vi.fn();
    const res = await enviarConProgreso("/api/x", { method: "POST", body: "cuerpo", headers: { "X-A": "1" } }, progreso);
    expect(res).toEqual({ ok: true, status: 201, json: { ok: true, id: "d1" } });
    expect(XhrFalso.enviados[0]).toMatchObject({ method: "POST", url: "/api/x", headers: { "X-A": "1" }, body: "cuerpo" });
    expect(progreso.mock.calls).toEqual([[0.25], [1]]);
  });

  it("sin longitud conocida no informa progreso; sin alProgresar tampoco falla", async () => {
    XhrFalso.cola.push({ status: 200, body: "{}", progreso: [[1, 4]], sinLongitud: true }, { status: 200, body: "{}", progreso: [[1, 4]] });
    const progreso = vi.fn();
    await enviarConProgreso("/a", { method: "POST", body: "" }, progreso);
    expect(progreso).not.toHaveBeenCalled();
    await expect(enviarConProgreso("/a", { method: "POST", body: "" })).resolves.toMatchObject({ ok: true });
  });

  it("respuesta de error, sin JSON o con JSON que no es objeto → json vacío", async () => {
    XhrFalso.cola.push({ status: 400, body: JSON.stringify({ error: "Sección inválida" }) }, { status: 502, body: "<html>" }, { status: 200, body: "null" });
    expect(await enviarConProgreso("/a", { method: "POST", body: "" })).toEqual({ ok: false, status: 400, json: { error: "Sección inválida" } });
    expect(await enviarConProgreso("/a", { method: "POST", body: "" })).toEqual({ ok: false, status: 502, json: {} });
    expect(await enviarConProgreso("/a", { method: "POST", body: "" })).toEqual({ ok: true, status: 200, json: {} });
  });

  it("error de red o subida cancelada rechazan", async () => {
    XhrFalso.cola.push({ red: "error" }, { red: "abort" });
    await expect(enviarConProgreso("/a", { method: "POST", body: "" })).rejects.toThrow("Error de red");
    await expect(enviarConProgreso("/a", { method: "POST", body: "" })).rejects.toThrow("Subida cancelada");
  });
});

describe("enviarFormularioConArchivos", () => {
  it("archivo chico: va en el formulario y el porcentaje sigue la subida del formulario hasta 100", async () => {
    XhrFalso.cola.push({ status: 201, body: JSON.stringify({ ok: true }), progreso: [[1, 2], [2, 2]] });
    const form = new FormData();
    form.set("seccion", "01_cliente");
    const progreso = vi.fn();
    const res = await enviarFormularioConArchivos({
      url: "/api/admin/unidades/u1/documentos",
      form,
      archivos: [{ campo: "file", file: archivo(2 * MB) }],
      destino: "unidades",
      entidadId: "u1",
      alProgresar: progreso,
    });
    expect(res.ok).toBe(true);
    expect(XhrFalso.enviados[0]).toMatchObject({ method: "POST", url: "/api/admin/unidades/u1/documentos", body: form });
    expect(form.get("file")).toBeInstanceOf(File);
    expect(progreso.mock.calls.map(([p]) => p)).toEqual([0, 50, 99, 100]);
  });

  it("archivo grande + chico: pondera por tamaño (PUT directo primero, después el formulario)", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ path: "p", signedUrl: "https://sube" }) });
    XhrFalso.cola.push(
      { status: 200, progreso: [[3 * MB, 6 * MB], [6 * MB, 6 * MB]] },
      { status: 200, body: "{}", progreso: [[2 * MB, 2 * MB]] }
    );
    const form = new FormData();
    const progreso = vi.fn();
    await enviarFormularioConArchivos({
      url: "/api/x",
      method: "PATCH",
      form,
      archivos: [{ campo: "grande", file: archivo(6 * MB) }, { campo: "chico", file: archivo(2 * MB) }],
      destino: "envios",
      entidadId: "e1",
      alProgresar: progreso,
    });
    // 3/8 = 37 %, 6/8 = 75 %, 8/8 = 99 % hasta la respuesta, después 100.
    expect(progreso.mock.calls.map(([p]) => p)).toEqual([0, 37, 75, 99, 100]);
    expect(XhrFalso.enviados[1].method).toBe("PATCH");
    expect(form.has("grandeSubido")).toBe(true);
    expect(form.get("chico")).toBeInstanceOf(File);
  });

  it("sin archivos envía igual; si el servidor responde error no llega a 100", async () => {
    XhrFalso.cola.push({ status: 400, body: JSON.stringify({ error: "Falta la fecha" }) });
    const progreso = vi.fn();
    const res = await enviarFormularioConArchivos({ url: "/api/x", form: new FormData(), archivos: [], destino: "cobranza", entidadId: "a1", alProgresar: progreso });
    expect(res).toEqual({ ok: false, status: 400, json: { error: "Falta la fecha" } });
    expect(progreso.mock.calls).toEqual([[0]]);
    // Sin alProgresar también funciona.
    XhrFalso.cola.push({ status: 200, body: "{}" });
    await expect(enviarFormularioConArchivos({ url: "/api/x", form: new FormData(), archivos: [], destino: "cobranza", entidadId: "a1" })).resolves.toMatchObject({ ok: true });
  });
});

describe("mensajeDeError", () => {
  it("usa el mensaje de la subida o el genérico", () => {
    expect(mensajeDeError(new ErrorSubida("Supera 20MB"), "genérico")).toBe("Supera 20MB");
    expect(mensajeDeError(new TypeError("Failed to fetch"), "genérico")).toBe("genérico");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { adjuntarArchivo, ErrorSubida, mensajeDeError } from "./subida-cliente";

const MB = 1024 * 1024;
const archivo = (bytes: number, nombre = "plano.pdf", type = "application/pdf") => {
  const f = new File(["x"], nombre, { type });
  Object.defineProperty(f, "size", { value: bytes });
  return f;
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
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
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ path: "envios/e1/uuid-plano.pdf", signedUrl: "https://sube" }) })
      .mockResolvedValueOnce({ ok: true });
    const form = new FormData();
    const file = archivo(12 * MB);
    await adjuntarArchivo(form, "comprobante", file, "cobranza", "a1");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/admin/subidas", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      destino: "cobranza",
      entidadId: "a1",
      nombre: "plano.pdf",
      tipo: "application/pdf",
      tamano: 12 * MB,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://sube", {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
    expect(form.get("comprobante")).toBeNull();
    expect(JSON.parse(form.get("comprobanteSubido") as string)).toEqual({ path: "envios/e1/uuid-plano.pdf", nombre: "plano.pdf" });
  });

  it("sin tipo sube como application/octet-stream", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ path: "p", signedUrl: "https://sube" }) })
      .mockResolvedValueOnce({ ok: true });
    await adjuntarArchivo(new FormData(), "file", archivo(5 * MB, "x", ""), "envios", "e1");
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ "Content-Type": "application/octet-stream" });
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

  it("si falla el PUT a Storage, avisa y no deja referencia", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ path: "p", signedUrl: "https://sube" }) })
      .mockResolvedValueOnce({ ok: false });
    const form = new FormData();
    await expect(adjuntarArchivo(form, "file", archivo(5 * MB), "envios", "e1")).rejects.toBeInstanceOf(ErrorSubida);
    expect(form.get("fileSubido")).toBeNull();
  });
});

describe("mensajeDeError", () => {
  it("usa el mensaje de la subida o el genérico", () => {
    expect(mensajeDeError(new ErrorSubida("Supera 20MB"), "genérico")).toBe("Supera 20MB");
    expect(mensajeDeError(new TypeError("Failed to fetch"), "genérico")).toBe("genérico");
  });
});

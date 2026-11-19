import { describe, it, expect, vi, beforeEach } from "vitest";

const rl = vi.hoisted(() => ({
  consumir: vi.fn(),
  contar: vi.fn(),
  registrar: vi.fn(),
  borrar: vi.fn(),
}));
vi.mock("@/lib/rate-limit-db", async (orig) => ({
  ...(await orig<typeof import("@/lib/rate-limit-db")>()),
  consumirRateLimit: rl.consumir,
  contarHits: rl.contar,
  registrarHit: rl.registrar,
  borrarHits: rl.borrar,
}));

import { igualSeguro } from "../igual-seguro";
import { ipCliente } from "../ip";
import {
  CAMPO_TRAMPA,
  LIMITES,
  MAX_BODY,
  demasiadosPedidos,
  esTrampa,
  leerJsonLimitado,
  permitirClave,
  permitirIP,
  respuestaTrampa,
} from "../publico";
import { MAX_FALLOS_EMAIL, MAX_FALLOS_IP, VENTANA_LOGIN_MS, limpiarFallosLogin, loginBloqueado, registrarFalloLogin } from "../login";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = "secreto-de-test";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const peticion = (headers: Record<string, string> = {}, body?: BodyInit) =>
  new Request("http://localhost/api/x", { method: "POST", headers, body });

describe("igualSeguro", () => {
  it("compara contenido, sin importar el largo", () => {
    expect(igualSeguro("abc", "abc")).toBe(true);
    expect(igualSeguro("abc", "abd")).toBe(false);
    expect(igualSeguro("abc", "abcd")).toBe(false);
    expect(igualSeguro("", "")).toBe(true);
  });
});

describe("ipCliente", () => {
  it("x-real-ip, si no el primero de x-forwarded-for, si no 127.0.0.1", () => {
    expect(ipCliente(peticion({ "x-real-ip": " 1.1.1.1 ", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(ipCliente(peticion({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
    expect(ipCliente(peticion({ "x-forwarded-for": " " }))).toBe("127.0.0.1");
    expect(ipCliente(peticion())).toBe("127.0.0.1");
  });
});

describe("permitirIP / permitirClave", () => {
  it("consume en la tabla compartida con una clave sin la IP en claro", async () => {
    rl.consumir.mockResolvedValue(true);
    await expect(permitirIP(peticion({ "x-real-ip": "9.9.9.9" }), "pedido", LIMITES.pedido)).resolves.toBe(true);
    const [clave, max, ventana] = rl.consumir.mock.calls[0];
    expect(clave).toMatch(/^pedido:[a-f0-9]{64}$/);
    expect(clave).not.toContain("9.9.9.9");
    expect([max, ventana]).toEqual([10, 3_600_000]);
  });

  it("sin cupo devuelve false", async () => {
    rl.consumir.mockResolvedValue(false);
    await expect(permitirClave("k", "s", { max: 1, ventanaMs: 1 })).resolves.toBe(false);
  });

  it("si la tabla no responde, deja pasar y lo registra", async () => {
    rl.consumir.mockRejectedValue(new Error("db caída"));
    await expect(permitirClave("k", "citas", LIMITES.citas)).resolves.toBe(true);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"citas" no disponible'));
  });

  it("factor ×100 solo para los e2e y nunca en producción", async () => {
    rl.consumir.mockResolvedValue(true);
    vi.stubEnv("E2E_LIMITES_ALTOS", "1");
    vi.stubEnv("NODE_ENV", "development");
    await permitirClave("k", "pedido", LIMITES.pedido);
    expect(rl.consumir).toHaveBeenLastCalledWith("k", 1000, 3_600_000);
    vi.stubEnv("NODE_ENV", "production");
    await permitirClave("k", "pedido", LIMITES.pedido);
    expect(rl.consumir).toHaveBeenLastCalledWith("k", 10, 3_600_000);
    vi.unstubAllEnvs();
    await permitirClave("k", "pedido", LIMITES.pedido);
    expect(rl.consumir).toHaveBeenLastCalledWith("k", 10, 3_600_000);
  });

  it("los límites son los acordados", () => {
    expect(LIMITES).toMatchObject({
      leadsEmail: { max: 5 },
      pedido: { max: 10 },
      citas: { max: 10 },
      cancelarCitaIP: { max: 10 },
      cancelarCitaId: { max: 5 },
      miPedido: { max: 30 },
      reciboPdf: { max: 30 },
      revalidate: { max: 120, ventanaMs: 60_000 },
    });
  });
});

describe("leerJsonLimitado", () => {
  it("lee un JSON dentro del límite", async () => {
    await expect(leerJsonLimitado(peticion({}, JSON.stringify({ a: 1 })), 100)).resolves.toEqual({ ok: true, datos: { a: 1 } });
  });

  it("413 por el Content-Length declarado, sin leer el body", async () => {
    const r = await leerJsonLimitado(peticion({ "content-length": "5000" }, "{}"), 100);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.respuesta.status).toBe(413);
      expect(await r.respuesta.json()).toEqual({ error: "El envío es demasiado grande." });
    }
  });

  it("413 cortando el stream aunque no haya Content-Length", async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("x".repeat(60)));
        c.enqueue(new TextEncoder().encode("x".repeat(60)));
        c.close();
      },
    });
    const req = new Request("http://localhost/api/x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    const r = await leerJsonLimitado(req, 100);
    expect(r.ok).toBe(false);
  });

  it("JSON mal formado o sin body: datos null (lo rechaza el esquema de la ruta)", async () => {
    await expect(leerJsonLimitado(peticion({}, "no-json"), 100)).resolves.toEqual({ ok: true, datos: null });
    await expect(leerJsonLimitado(new Request("http://localhost/api/x", { method: "POST" }), 100)).resolves.toEqual({ ok: true, datos: null });
  });

  it("los tamaños por formulario", () => {
    expect(MAX_BODY).toEqual({ leadsEmail: 4096, leads: 8192, citas: 16384, pedido: 65536, whatsapp: 65536, chico: 2048 });
  });
});

describe("campo trampa", () => {
  it("se llama empresa_web y detecta cualquier valor no vacío", () => {
    expect(CAMPO_TRAMPA).toBe("empresa_web");
    expect(esTrampa({ empresa_web: "spam.com" })).toBe(true);
    expect(esTrampa({ empresa_web: 1 })).toBe(true);
    expect(esTrampa({ empresa_web: "  " })).toBe(false);
    expect(esTrampa({ empresa_web: "" })).toBe(false);
    expect(esTrampa({ nombre: "Ana" })).toBe(false);
    expect(esTrampa(null)).toBe(false);
    expect(esTrampa("texto")).toBe(false);
  });

  it("al bot se le responde como si hubiera salido bien", async () => {
    const r = respuestaTrampa();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(await respuestaTrampa({ id: "x" }).json()).toEqual({ id: "x" });
  });

  it("429 con el mensaje por defecto o uno propio", async () => {
    expect(demasiadosPedidos().status).toBe(429);
    expect((await demasiadosPedidos().json()).error).toMatch(/muchos envíos/);
    expect((await demasiadosPedidos("Otro").json()).error).toBe("Otro");
  });
});

describe("bloqueo de login", () => {
  it(`bloquea con ${MAX_FALLOS_IP} fallos por IP o ${MAX_FALLOS_EMAIL} por email en 15 minutos`, async () => {
    expect(VENTANA_LOGIN_MS).toBe(15 * 60_000);
    rl.contar.mockResolvedValueOnce(4).mockResolvedValueOnce(9);
    await expect(loginBloqueado("1.1.1.1", "a@x.com")).resolves.toBe(false);
    rl.contar.mockResolvedValueOnce(5).mockResolvedValueOnce(0);
    await expect(loginBloqueado("1.1.1.1", "a@x.com")).resolves.toBe(true);
    rl.contar.mockResolvedValueOnce(0).mockResolvedValueOnce(10);
    await expect(loginBloqueado("2.2.2.2", "a@x.com")).resolves.toBe(true);
  });

  it("el email cuenta igual con mayúsculas o espacios, y nunca va en claro", async () => {
    rl.contar.mockResolvedValue(0);
    await loginBloqueado("1.1.1.1", " Ana@X.com ");
    await loginBloqueado("1.1.1.1", "ana@x.com");
    const claves = rl.contar.mock.calls.map(([k]) => k);
    expect(claves[1]).toBe(claves[3]);
    expect(claves[1]).toMatch(/^login-email:[a-f0-9]{64}$/);
    expect(claves[0]).toMatch(/^login-ip:[a-f0-9]{64}$/);
  });

  it("registra el fallo en los dos contadores y un login correcto los limpia", async () => {
    rl.registrar.mockResolvedValue(undefined);
    rl.borrar.mockResolvedValue(undefined);
    await registrarFalloLogin("1.1.1.1", "a@x.com");
    expect(rl.registrar).toHaveBeenCalledTimes(2);
    await limpiarFallosLogin("1.1.1.1", "a@x.com");
    expect(rl.borrar).toHaveBeenCalledTimes(2);
  });

  it("si la tabla no responde no bloquea ni rompe el login (con log)", async () => {
    rl.contar.mockRejectedValue(new Error("db"));
    rl.registrar.mockRejectedValue(new Error("db"));
    rl.borrar.mockRejectedValue(new Error("db"));
    await expect(loginBloqueado("1.1.1.1", "a@x.com")).resolves.toBe(false);
    await expect(registrarFalloLogin("1.1.1.1", "a@x.com")).resolves.toBeUndefined();
    await expect(limpiarFallosLogin("1.1.1.1", "a@x.com")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledTimes(3);
  });
});

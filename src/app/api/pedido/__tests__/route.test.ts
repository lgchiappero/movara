import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindMany, mockSend, mockRegistrar, mockSanityFetch } = vi.hoisted(() => ({
  mockSanityFetch: vi.fn().mockResolvedValue(null),
  mockRegistrar: vi.fn().mockResolvedValue({ clienteId: "c1", leadId: "l1" }),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn().mockResolvedValue([]),
  mockSend: vi.fn().mockResolvedValue({ data: { id: "e1" }, error: null }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock("@/lib/db", () => {
  const tx = { configuracionPedido: { create: mockCreate, findMany: mockFindMany } };
  return { db: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } };
});

vi.mock("@/lib/clientes/servicio", () => ({
  conSavepoint: (_tx: unknown, _nombre: string, fn: () => Promise<unknown>) => fn(),
  registrarContacto: mockRegistrar,
}));

vi.mock("@/sanity/lib/client", () => ({ client: { fetch: mockSanityFetch } }));

import { POST } from "../route";
import { NextRequest } from "next/server";

const BASE = {
  clienteNombre: "Ana García",
  clienteWhatsapp: "+5491155554444",
  clienteEmail: "ana@example.com",
  tipoCliente: "particular",
  modelo: "20ft",
  finalidad: "inversor",
  provincia: "Buenos Aires",
  localidad: "La Plata",
  habitaciones: 2,
  incluyeCocina: true,
  tipoCocina: "electrico",
  incluyeBano: true,
  tipoAgua: "calefon-electrico",
  lavarropas: "sin",
  materiales: {},
  upgrades: [],
};

function req(body: unknown, ip: string) {
  return new NextRequest("http://localhost/api/pedido", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/pedido", () => {
  it("devuelve el número de consulta y el token de seguimiento generado por la base", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    const res = await POST(req(BASE, "10.0.0.1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.numeroConsulta).toMatch(/^MOV-CONSULTA-\d{4}-001$/);
    expect(json.tokenSeguimiento).toBe("f".repeat(64));
    expect(mockCreate.mock.calls[0][0].select).toEqual({ id: true, tokenSeguimiento: true });
  });

  it("crea o reutiliza cliente y lead en la misma transacción, con el origen de la visita", async () => {
    mockCreate.mockResolvedValue({ id: "p1", tokenSeguimiento: "f".repeat(64) });
    await POST(
      req(
        { ...BASE, tipoCliente: "empresa", razonSocial: "Agro SA", nombreContacto: "Ana García", origen: { gclid: "abc" } },
        "10.0.0.30"
      )
    );
    const [tx, datos, contexto, origen] = mockRegistrar.mock.calls[0];
    expect(tx).toHaveProperty("configuracionPedido");
    expect(datos).toEqual({
      nombre: "Ana García",
      email: "ana@example.com",
      telefono: "+5491155554444",
      tipoCliente: "empresa",
      razonSocial: "Agro SA",
      nombreContacto: "Ana García",
      provincia: "Buenos Aires",
      localidad: "La Plata",
    });
    expect(contexto).toEqual({ tipo: "pedido", pedidoId: "p1", numeroConsulta: expect.stringMatching(/^MOV-CONSULTA-/) });
    expect(origen).toMatchObject({ origenVisita: "google_ads" });
  });

  it("si falla el alta del cliente, el pedido se guarda igual y el error queda en el log sin datos personales", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockResolvedValue({ id: "p1", tokenSeguimiento: "f".repeat(64) });
    mockRegistrar.mockRejectedValueOnce(Object.assign(new Error("ana@example.com"), { code: "P2002" }));
    const res = await POST(req(BASE, "10.0.0.31"));
    expect(res.status).toBe(200);
    const linea = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(linea).toMatch(/\[pedido\] MOV-CONSULTA-\d{4}-\d{3} No se pudo vincular cliente y lead: Error \(P2002\)/);
    expect(linea).not.toContain("ana@example.com");
  });

  it("400 con el detalle del campo cuando falta la localidad", async () => {
    const res = await POST(req({ ...BASE, localidad: "" }, "10.0.0.2"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details[0].path).toEqual(["localidad"]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("avisa al admin por email con el número de consulta (y tolera que falle)", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req(BASE, "10.0.0.3"));
    expect(mockSend.mock.calls[0][0].subject).toMatch(/Nueva consulta — Ana García/);

    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSend.mockRejectedValueOnce(new Error("resend"));
    expect((await POST(req(BASE, "10.0.0.4"))).status).toBe(200);
    delete process.env.RESEND_API_KEY;
  });

  it("si Resend devuelve { error } lo loguea con el tipo, sin datos personales, y responde 200", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    mockSend.mockResolvedValueOnce({ data: null, error: { name: "validation_error", statusCode: 422, message: "to: ana@example.com" } });
    expect((await POST(req(BASE, "10.0.0.6"))).status).toBe(200);
    const linea = log.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(linea).toMatch(/\[pedido\] MOV-CONSULTA-\d{4}-\d{3} Falló el email a MOVARA: validation_error \(422\)/);
    expect(linea).not.toMatch(/Ana|ana@example\.com/);
    delete process.env.RESEND_API_KEY;
  });

  it("escapa el nombre del cliente en el HTML del aviso", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, clienteNombre: "Ana & Hijos" }, "10.0.0.7"));
    expect(mockSend.mock.calls[0][0].html).toContain("Ana &amp; Hijos completó");
    delete process.env.RESEND_API_KEY;
  });

  it("guarda las notas de configuración (recortadas) y null si vienen vacías", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, notasConfiguracion: "  Necesito rampa  " }, "10.0.0.20"));
    expect(mockCreate.mock.calls[0][0].data.notasConfiguracion).toBe("Necesito rampa");
    await POST(req({ ...BASE, notasConfiguracion: "   " }, "10.0.0.21"));
    expect(mockCreate.mock.calls[1][0].data.notasConfiguracion).toBeNull();
    await POST(req(BASE, "10.0.0.22"));
    expect(mockCreate.mock.calls[2][0].data.notasConfiguracion).toBeNull();
  });

  it("400 si las notas superan los 1000 caracteres", async () => {
    const res = await POST(req({ ...BASE, notasConfiguracion: "a".repeat(1001) }, "10.0.0.23"));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("guarda el precio y el desglose que calcula el servidor, no los que manda el navegador", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(
      req(
        {
          ...BASE,
          materiales: { balcon: "frontal", techoBalcon: "solo-balcon", inodoro: "inteligente-bidet", banera: "banera-01" },
          precioEstimado: 1,
          desgloseEstimado: { base: 1, adicionales: [], aConsultar: [], total: 1 },
        },
        "10.0.0.40"
      )
    );
    const { data } = mockCreate.mock.calls[0][0];
    expect(data.precioEstimado).toBe(38 * 680 + 3100 + 580);
    expect(data.desgloseEstimado).toEqual({
      base: 38 * 680,
      adicionales: [
        { nombre: "Inodoro inteligente con bidet", precio: 580 },
        { nombre: "Balcón frontal de 2 m con sobretecho, deck y barandas", precio: 3100 },
      ],
      aConsultar: ["Bañera — opción 1"],
      total: 38 * 680 + 3100 + 580,
    });
  });

  it("sin baño no guarda ni cobra lo del baño aunque el navegador lo mande", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, incluyeBano: false, materiales: { inodoro: "inteligente-bidet", panelesBano: "marmol-venas", piso: "spc-8917" } }, "10.0.0.43"));
    const { data } = mockCreate.mock.calls[0][0];
    expect(data.materiales).toMatchObject({ inodoro: null, panelesBano: null, piso: "spc-8917" });
    expect(data.precioEstimado).toBe(38 * 680 + 390);
  });

  it("con el amoblamiento 4 guarda la base de ducha blanca (USD 165) en el precio y el desglose", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, materiales: { amoblamientoBano: "amoblamiento-04" } }, "10.0.0.44"));
    const { data } = mockCreate.mock.calls[0][0];
    expect(data.precioEstimado).toBe(38 * 680 + 165);
    expect(data.desgloseEstimado).toEqual({
      base: 38 * 680,
      adicionales: [{ nombre: "Base de ducha (blanca)", precio: 165 }],
      aConsultar: [],
      total: 38 * 680 + 165,
    });
  });

  it("puerta doble hoja moderna + cocina en U + amoblamiento 4: base + 330 + 655 + 165, con el desglose", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, materiales: { puertaPrincipal: "doble-hoja-moderna", cocinaAmpliada: "ushape-01", amoblamientoBano: "amoblamiento-04" } }, "10.0.0.46"));
    const { data } = mockCreate.mock.calls[0][0];
    expect(data.precioEstimado).toBe(38 * 680 + 330 + 655 + 165);
    expect(data.desgloseEstimado.adicionales).toEqual([
      { nombre: "Base de ducha (blanca)", precio: 165 },
      { nombre: "Cocina en U — opción 1", precio: 655 },
      { nombre: "Puerta doble hoja moderna", precio: 330 },
    ]);
  });

  it("la base de ducha toma el precio de Sanity si está cargado", async () => {
    mockSanityFetch.mockResolvedValueOnce({ preciosExtras: [{ nombre: "Base de ducha", precio: 200 }] });
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, materiales: { amoblamientoBano: "amoblamiento-02" } }, "10.0.0.45"));
    expect(mockCreate.mock.calls[0][0].data.desgloseEstimado.adicionales).toEqual([{ nombre: "Base de ducha (negra)", precio: 200 }]);
  });

  it("usa los precios cargados en Sanity", async () => {
    mockSanityFetch.mockResolvedValueOnce({ preciosExtras: [{ nombre: "Inodoro inteligente", precio: 700 }] });
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(req({ ...BASE, materiales: { inodoro: "inteligente-bidet" } }, "10.0.0.41"));
    expect(mockCreate.mock.calls[0][0].data.precioEstimado).toBe(38 * 680 + 700);
  });

  it("si Sanity no responde, calcula con los precios del código y guarda el pedido igual", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSanityFetch.mockRejectedValueOnce(new Error("sanity caído"));
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    const res = await POST(req({ ...BASE, materiales: { piso: "spc-8917" } }, "10.0.0.42"));
    expect(res.status).toBe(200);
    expect(mockCreate.mock.calls[0][0].data.precioEstimado).toBe(38 * 680 + 390);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("No se pudieron leer los precios de Sanity"));
  });

  it("el aviso por email lista el balcón con sobretecho completo como A consultar y las notas escapadas", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    await POST(
      req(
        { ...BASE, materiales: { balcon: "frontal", techoBalcon: "completo" }, notasConfiguracion: "<img src=x onerror=alert(1)>" },
        "10.0.0.24"
      )
    );
    const html: string = mockSend.mock.calls[0][0].html;
    expect(html).toContain("Balcón frontal — <strong style=\"color:#854F0B;\">A consultar</strong>");
    expect(html).toContain("Sobretecho completo: balcón y toda la unidad — <strong");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img");
    delete process.env.RESEND_API_KEY;
  });

  it("500 si falla la base", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error("db"));
    expect((await POST(req(BASE, "10.0.0.5"))).status).toBe(500);
  });

  it("si no se puede guardar (columna faltante, como el 3/11), igual llega a MOVARA un email para recontactar, sin datos en los logs", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const errores = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSend.mockClear();
    mockCreate.mockRejectedValueOnce(
      Object.assign(new Error("The column `configuraciones_pedido.desgloseEstimado` does not exist in the current database."), { code: "P2022" })
    );
    const res = await POST(req(BASE, "10.0.0.6"));
    expect(res.status).toBe(500);
    expect(mockSend).toHaveBeenCalledTimes(1);
    const { subject, html } = mockSend.mock.calls[0][0];
    expect(subject).toBe(`⚠️ Consulta NO guardada — recontactar a ${BASE.clienteNombre}`);
    expect(html).toContain(BASE.clienteWhatsapp);
    expect(html).toContain(BASE.clienteEmail);
    expect(html).toContain("La Plata, Buenos Aires");
    const logueado = errores.mock.calls.flat().join(" ");
    expect(logueado).not.toContain(BASE.clienteWhatsapp);
    expect(logueado).not.toContain(BASE.clienteNombre);
    delete process.env.RESEND_API_KEY;
  });

  it("si el pedido se guardó, un error posterior no manda el aviso de no guardada", async () => {
    process.env.RESEND_API_KEY = "re_test";
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSend.mockClear();
    mockCreate.mockResolvedValueOnce({ tokenSeguimiento: "f".repeat(64) });
    mockSend.mockRejectedValueOnce(new Error("resend caído"));
    await POST(req(BASE, "10.0.0.7"));
    expect(mockSend.mock.calls.map((c) => c[0].subject).some((s: string) => s.includes("NO guardada"))).toBe(false);
    delete process.env.RESEND_API_KEY;
  });

  it("429 al superar el límite por IP", async () => {
    mockCreate.mockResolvedValue({ tokenSeguimiento: "f".repeat(64) });
    let ultimo = 0;
    for (let i = 0; i < 61; i++) ultimo = (await POST(req(BASE, "10.0.0.99"))).status;
    expect(ultimo).toBe(429);
  });
});

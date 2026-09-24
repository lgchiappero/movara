import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockUpdate, mockFindUniqueOrThrow, mockEnsureNumeroPedido, mockBuildEstadoEmail, mockSend } =
  vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockFindUniqueOrThrow: vi.fn(),
    mockEnsureNumeroPedido: vi.fn(),
    mockBuildEstadoEmail: vi.fn(),
    mockSend: vi.fn().mockResolvedValue({ id: "email1" }),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    configuracionPedido: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      findUniqueOrThrow: mockFindUniqueOrThrow,
    },
  },
}));
vi.mock("@/lib/pedido/numero-pedido", () => ({ ensureNumeroPedido: mockEnsureNumeroPedido }));
vi.mock("@/lib/email/pedido-estado-email", () => ({ buildEstadoEmail: mockBuildEstadoEmail }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/configuraciones/p1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const BASE = {
  estadoPedido: "consulta",
  precioFinal: null,
  anticipo: null,
  numeroFabrica: null,
  numeroContenedor: null,
  numeroBL: null,
  fechaConfirmacion: null,
  fechaProduccion: null,
  fechaDespacho: null,
  fechaArriboEstimado: null,
  fechaEntrega: null,
  notasInternas: null,
  notasCliente: null,
  costoProveedor: null,
  costoFlete: null,
  costoAduana: null,
  costoOtros: null,
  vendedorAsignado: null,
  piProveedor: null,
  fechaPIPagado: null,
  montoPI: null,
  seguroTransporte: false,
  inspeccionFabrica: false,
  fotosDespachadas: false,
  notasDespachador: null,
  gastosDespachante: null,
  impuestosAduana: null,
  gastosPortuarios: null,
  costoGruaDescarga: null,
  costoTransporteLocal: null,
  instalacionFecha: null,
  instalacionNotas: null,
  satisfaccionCliente: null,
  garantiaActivada: false,
  garantiaFechaInicio: null,
};

const CONFIG_BASE = {
  id: "p1",
  estadoPedido: "consulta",
  clienteEmail: "juan@x.com",
  clienteNombre: "Juan García",
  numeroPedido: null,
  fechaDespacho: null,
  fechaArriboEstimado: null,
};

describe("PATCH /api/admin/configuraciones/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    mockFindUnique.mockResolvedValue({
      estadoPedido: "consulta",
      clienteEmail: CONFIG_BASE.clienteEmail,
      clienteNombre: CONFIG_BASE.clienteNombre,
    });
  });

  it("400 si el body no cumple el schema", async () => {
    const res = await PATCH(makeRequest({ ...BASE, estadoPedido: "invalido" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(400);
  });

  it("guarda saldoPendiente/costoTotal/margen como null si no hay precioFinal/costos", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE });
    const res = await PATCH(makeRequest(BASE), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({
        saldoPendiente: null,
        costoTotal: null,
        margenUSD: null,
        margenPorcentaje: null,
      }),
    });
  });

  it("calcula saldoPendiente = precioFinal - anticipo", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE });
    await PATCH(makeRequest({ ...BASE, precioFinal: 10000, anticipo: 3000 }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ saldoPendiente: 7000 }),
    });
  });

  it("anticipo null cuenta como 0 para el saldo pendiente", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE });
    await PATCH(makeRequest({ ...BASE, precioFinal: 10000 }), { params: Promise.resolve({ id: "p1" }) });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ saldoPendiente: 10000 }),
    });
  });

  it("calcula costoTotal/margenUSD/margenPorcentaje cuando hay al menos un costo cargado", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE });
    await PATCH(makeRequest({ ...BASE, precioFinal: 10000, costoProveedor: 6000, costoFlete: 1000 }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ costoTotal: 7000, margenUSD: 3000, margenPorcentaje: 30 }),
    });
  });

  it("margenPorcentaje null si precioFinal es null aunque haya costos", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE });
    await PATCH(makeRequest({ ...BASE, costoProveedor: 500 }), { params: Promise.resolve({ id: "p1" }) });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: expect.objectContaining({ costoTotal: 500, margenUSD: null, margenPorcentaje: null }),
    });
  });

  it("calcula garantiaFechaFin +12 meses cuando hay fecha de inicio", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE });
    await PATCH(makeRequest({ ...BASE, garantiaFechaInicio: "2026-01-15" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    const call = mockUpdate.mock.calls[0][0];
    expect(call.data.garantiaFechaFin.getUTCFullYear()).toBe(2027);
  });

  it("no envía email ni toca numeroPedido si el estado no cambió", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "consulta" });
    const res = await PATCH(makeRequest(BASE), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(mockEnsureNumeroPedido).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("al pasar a 'confirmado' sin numeroPedido, lo genera y recarga la config", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "confirmado", numeroPedido: null });
    mockFindUniqueOrThrow.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "confirmado", numeroPedido: "MOV-2026-001" });
    mockBuildEstadoEmail.mockReturnValueOnce(null);

    const res = await PATCH(makeRequest({ ...BASE, estadoPedido: "confirmado" }), {
      params: Promise.resolve({ id: "p1" }),
    });

    expect(res.status).toBe(200);
    expect(mockEnsureNumeroPedido).toHaveBeenCalledWith("p1");
    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({ where: { id: "p1" } });
    const json = await res.json();
    expect(json.config.numeroPedido).toBe("MOV-2026-001");
  });

  it("no regenera numeroPedido si 'confirmado' ya tenía uno", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "confirmado", numeroPedido: "MOV-2026-001" });
    mockBuildEstadoEmail.mockReturnValueOnce(null);
    await PATCH(makeRequest({ ...BASE, estadoPedido: "confirmado" }), { params: Promise.resolve({ id: "p1" }) });
    expect(mockEnsureNumeroPedido).not.toHaveBeenCalled();
  });

  it("cambio de estado sin buildEstadoEmail (null) no manda correo", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "presupuestado" });
    mockBuildEstadoEmail.mockReturnValueOnce(null);
    await PATCH(makeRequest({ ...BASE, estadoPedido: "presupuestado" }), { params: Promise.resolve({ id: "p1" }) });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("cambio de estado con email disponible lo envía", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "presupuestado" });
    mockBuildEstadoEmail.mockReturnValueOnce({ subject: "Actualización", html: "<p>hola</p>" });
    await PATCH(makeRequest({ ...BASE, estadoPedido: "presupuestado" }), { params: Promise.resolve({ id: "p1" }) });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "juan@x.com", subject: "Actualización" })
    );
  });

  it("no manda email si el cliente no tiene clienteEmail cargado", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "presupuestado", clienteEmail: null });
    await PATCH(makeRequest({ ...BASE, estadoPedido: "presupuestado" }), { params: Promise.resolve({ id: "p1" }) });
    expect(mockBuildEstadoEmail).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("no manda email si RESEND_API_KEY no está configurado", async () => {
    delete process.env.RESEND_API_KEY;
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "presupuestado" });
    mockBuildEstadoEmail.mockReturnValueOnce({ subject: "x", html: "y" });
    const res = await PATCH(makeRequest({ ...BASE, estadoPedido: "presupuestado" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sigue devolviendo 200 si falla el envío del email de estado", async () => {
    mockUpdate.mockResolvedValueOnce({ ...CONFIG_BASE, estadoPedido: "presupuestado" });
    mockBuildEstadoEmail.mockReturnValueOnce({ subject: "x", html: "y" });
    mockSend.mockRejectedValueOnce(new Error("resend down"));
    const res = await PATCH(makeRequest({ ...BASE, estadoPedido: "presupuestado" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(200);
  });

  it("500 si la DB falla", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("db down"));
    const res = await PATCH(makeRequest(BASE), { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(500);
  });
});

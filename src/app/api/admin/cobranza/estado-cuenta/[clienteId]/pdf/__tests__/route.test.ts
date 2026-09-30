// @vitest-environment node
//
// @react-pdf/renderer se mockea entero: renderizar un PDF real es lento y
// depende de fuentes/assets del sistema de archivos — lo que se prueba acá
// es la lógica de la ruta (auth, 404, armado de los datos que le pasa al
// documento), no el renderizado en sí.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetAdminUser, mockFindUniqueCliente, mockFindManyAcuerdo, mockRenderToBuffer, mockEstadoCuentaDocument } =
  vi.hoisted(() => ({
    mockGetAdminUser: vi.fn(),
    mockFindUniqueCliente: vi.fn(),
    mockFindManyAcuerdo: vi.fn(),
    mockRenderToBuffer: vi.fn().mockResolvedValue(Buffer.from("pdf-bytes")),
    mockEstadoCuentaDocument: vi.fn(() => "document-element"),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    cliente: { findUnique: mockFindUniqueCliente },
    acuerdoPago: { findMany: mockFindManyAcuerdo },
  },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: mockRenderToBuffer }));
vi.mock("@/lib/pdf/EstadoCuentaDocument", () => ({ EstadoCuentaDocument: mockEstadoCuentaDocument }));

import { GET } from "../route";
import { NextRequest } from "next/server";

const SESSION = { id: "u1", nombre: "Admin", email: "admin@movara.com.ar", rol: "admin" };

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/cobranza/estado-cuenta/c1/pdf");
}

describe("GET /api/admin/cobranza/estado-cuenta/[clienteId]/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(SESSION);
    mockFindUniqueCliente.mockResolvedValue({ id: "c1", nombre: "Juan García" });
    mockFindManyAcuerdo.mockResolvedValue([]);
    mockRenderToBuffer.mockResolvedValue(Buffer.from("pdf-bytes"));
  });

  it("401 sin sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ clienteId: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("404 si el cliente no existe", async () => {
    mockFindUniqueCliente.mockResolvedValueOnce(null);
    const res = await GET(makeRequest(), { params: Promise.resolve({ clienteId: "no-existe" }) });
    expect(res.status).toBe(404);
  });

  it("consulta solo acuerdos de tipo cobro de las unidades del cliente", async () => {
    await GET(makeRequest(), { params: Promise.resolve({ clienteId: "c1" }) });
    expect(mockFindManyAcuerdo).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tipo: "cobro", unidad: { clienteId: "c1" } } })
    );
  });

  it("200 con el PDF como adjunto, nombrado con el cliente", async () => {
    const res = await GET(makeRequest(), { params: Promise.resolve({ clienteId: "c1" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("estado-cuenta-juan-garcía.pdf");
  });

  it("arma los acuerdos con pendiente y estado derivados, y el saldo agrupado por moneda", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        id: "a1",
        moneda: "USD",
        concepto: "venta",
        totalAcordado: 1000,
        unidad: { numeroUnidad: "MOV-1" },
        cuotas: [],
        movimientos: [{ id: "m1", fecha: new Date("2026-01-10"), importe: 400, modalidad: "transferencia" }],
      },
    ]);
    await GET(makeRequest(), { params: Promise.resolve({ clienteId: "c1" }) });
    expect(mockEstadoCuentaDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteNombre: "Juan García",
        acuerdos: [expect.objectContaining({ id: "a1", pendiente: 600, estado: "parcial" })],
        movimientos: [expect.objectContaining({ id: "m1", importe: 400 })],
        saldosPorMoneda: [["USD", 600]],
      })
    );
  });

  it("el historial de movimientos queda ordenado del más reciente al más antiguo entre todos los acuerdos", async () => {
    mockFindManyAcuerdo.mockResolvedValueOnce([
      {
        id: "a1",
        moneda: "USD",
        concepto: "venta",
        totalAcordado: 1000,
        unidad: { numeroUnidad: "MOV-1" },
        cuotas: [],
        movimientos: [{ id: "m-vieja", fecha: new Date("2026-01-01"), importe: 100, modalidad: "efectivo" }],
      },
      {
        id: "a2",
        moneda: "USD",
        concepto: "venta",
        totalAcordado: 2000,
        unidad: { numeroUnidad: "MOV-2" },
        cuotas: [],
        movimientos: [{ id: "m-nueva", fecha: new Date("2026-06-01"), importe: 200, modalidad: "efectivo" }],
      },
    ]);
    await GET(makeRequest(), { params: Promise.resolve({ clienteId: "c1" }) });
    const call = mockEstadoCuentaDocument.mock.calls[0][0] as { movimientos: { id: string }[] };
    expect(call.movimientos.map((m) => m.id)).toEqual(["m-nueva", "m-vieja"]);
  });
});

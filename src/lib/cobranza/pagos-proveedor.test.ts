import { describe, it, expect } from "vitest";
import { vistaPagoProveedor, ordenarPagosProveedor } from "./pagos-proveedor";
import type { AcuerdoConDetalle } from "./types";

const HOY = new Date("2026-10-07T00:00:00Z");

function acuerdo(over: Partial<AcuerdoConDetalle>): AcuerdoConDetalle {
  return {
    id: "p1",
    unidadId: "u1",
    unidadNumero: "MOV-1",
    unidadModelo: null,
    unidadEstado: "pendiente",
    clienteId: "c1",
    clienteNombre: "Ana",
    tipo: "pago",
    concepto: "fabrica",
    descripcion: null,
    contraparte: "Heshi",
    moneda: "USD",
    totalAcordado: 1000,
    notas: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}

const cuota = (vencimiento: string | null) => ({ id: "q", descripcion: "x", importe: 1000, vencimiento, estado: "pendiente" });
const mov = (id: string, importe: number, fecha: string, extra: Partial<{ comprobanteSignedUrl: string; modalidad: string }> = {}) => ({
  id,
  fecha,
  importe,
  modalidad: "transferencia",
  cuotaId: null,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a@x.com",
  ...extra,
});

describe("vistaPagoProveedor", () => {
  it("pagado: fecha, modalidad y comprobante del pago", () => {
    const v = vistaPagoProveedor(
      acuerdo({
        cuotas: [cuota("2026-09-01T00:00:00.000Z")],
        movimientos: [mov("m1", 1000, "2026-09-10T00:00:00.000Z", { comprobanteSignedUrl: "https://x", modalidad: "cripto" })],
      }),
      HOY
    );
    expect(v).toMatchObject({ estado: "pagado", fecha: "2026-09-10T00:00:00.000Z", modalidad: "cripto", comprobanteSignedUrl: "https://x", pagado: 1000, importe: 1000, legado: false });
  });

  it("pendiente con fecha futura, vencido con fecha pasada, sin fecha → pendiente", () => {
    expect(vistaPagoProveedor(acuerdo({ cuotas: [cuota("2026-12-01T00:00:00.000Z")] }), HOY)).toMatchObject({
      estado: "pendiente",
      fecha: "2026-12-01T00:00:00.000Z",
      modalidad: null,
      comprobanteSignedUrl: null,
    });
    expect(vistaPagoProveedor(acuerdo({ cuotas: [cuota("2026-08-01T00:00:00.000Z")] }), HOY).estado).toBe("vencido");
    expect(vistaPagoProveedor(acuerdo({}), HOY)).toMatchObject({ estado: "pendiente", fecha: null });
  });

  it("formato anterior: varias cuotas o pagos parciales → legado y 'parcial', con el último pago como fecha", () => {
    const v = vistaPagoProveedor(
      acuerdo({
        cuotas: [cuota(null), { ...cuota(null), id: "q2" }],
        movimientos: [mov("m1", 200, "2026-07-01T00:00:00.000Z"), mov("m2", 300, "2026-08-01T00:00:00.000Z")],
      }),
      HOY
    );
    expect(v).toMatchObject({ estado: "parcial", legado: true, pagado: 500, fecha: "2026-08-01T00:00:00.000Z" });
  });
});

describe("ordenarPagosProveedor", () => {
  it("del más reciente al más viejo; sin fecha al final; empate por fecha de alta", () => {
    const vistas = [
      acuerdo({ id: "viejo", cuotas: [cuota("2026-01-01T00:00:00.000Z")] }),
      acuerdo({ id: "sinFecha" }),
      acuerdo({ id: "nuevo", cuotas: [cuota("2026-10-01T00:00:00.000Z")] }),
      acuerdo({ id: "sinFecha2", createdAt: "2026-09-05T00:00:00.000Z" }),
      acuerdo({ id: "empate", cuotas: [cuota("2026-10-01T00:00:00.000Z")], createdAt: "2026-09-10T00:00:00.000Z" }),
    ].map((a) => vistaPagoProveedor(a, HOY));
    expect(ordenarPagosProveedor(vistas).map((v) => v.acuerdo.id)).toEqual(["empate", "nuevo", "viejo", "sinFecha2", "sinFecha"]);
  });
});

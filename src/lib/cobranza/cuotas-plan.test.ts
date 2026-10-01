import { describe, it, expect } from "vitest";
import {
  renumerarCuotas,
  nuevaCuota,
  cambiarTipoCuota,
  importesPorPorcentaje,
  cuotasDesdePreset,
  PRESET_FABRICA,
  PRESET_PAGO_UNICO,
  type CuotaPlanForm,
} from "./cuotas-plan";

const desc = (cs: CuotaPlanForm[]) => renumerarCuotas(cs).map((c) => c.descripcion);

describe("renumerarCuotas", () => {
  it("genera Anticipo / Cuota k/N / Saldo según el tipo", () => {
    expect(desc([nuevaCuota("anticipo"), nuevaCuota("cuota"), nuevaCuota("cuota"), nuevaCuota("cuota"), nuevaCuota("saldo")])).toEqual([
      "Anticipo",
      "Cuota 1/3",
      "Cuota 2/3",
      "Cuota 3/3",
      "Saldo",
    ]);
  });

  it("re-numera al agregar o quitar cuotas", () => {
    const dos = renumerarCuotas([nuevaCuota("cuota"), nuevaCuota("cuota")]);
    expect(dos.map((c) => c.descripcion)).toEqual(["Cuota 1/2", "Cuota 2/2"]);
    expect(desc([...dos, nuevaCuota("cuota")])).toEqual(["Cuota 1/3", "Cuota 2/3", "Cuota 3/3"]);
    expect(desc([dos[1]])).toEqual(["Cuota 1/1"]);
  });

  it("respeta las descripciones editadas a mano", () => {
    const editada: CuotaPlanForm = { ...nuevaCuota("anticipo"), descripcion: "Anticipo 30%", editada: true };
    expect(desc([editada, nuevaCuota("cuota")])).toEqual(["Anticipo 30%", "Cuota 1/1"]);
  });

  it("'Otro' arranca vacío (texto libre)", () => {
    expect(desc([nuevaCuota("otro")])).toEqual([""]);
  });
});

describe("cambiarTipoCuota", () => {
  it("a un tipo automático: la descripción vuelve a generarse", () => {
    const c: CuotaPlanForm = { ...nuevaCuota("anticipo"), descripcion: "Anticipo 30%", editada: true };
    const cambiada = cambiarTipoCuota(c, "saldo");
    expect(cambiada.editada).toBe(false);
    expect(renumerarCuotas([cambiada])[0].descripcion).toBe("Saldo");
  });

  it("a 'Otro': conserva el texto y queda como editada", () => {
    const c: CuotaPlanForm = { ...nuevaCuota("cuota"), descripcion: "Cuota 1/1" };
    const cambiada = cambiarTipoCuota(c, "otro");
    expect(cambiada).toMatchObject({ tipo: "otro", descripcion: "Cuota 1/1", editada: true });
  });
});

describe("presets de cuotas (pagos a proveedores)", () => {
  it("importesPorPorcentaje reparte el total y la diferencia de redondeo va a la última", () => {
    expect(importesPorPorcentaje(30000, [50, 50])).toEqual(["15000", "15000"]);
    expect(importesPorPorcentaje(100.01, [50, 50])).toEqual(["50", "50.01"]);
    expect(importesPorPorcentaje(100, [100])).toEqual(["100"]);
    expect(importesPorPorcentaje(0, [50, 50])).toEqual(["", ""]);
  });

  it("fábrica: 50% al confirmar + 50% antes del embarque", () => {
    expect(cuotasDesdePreset(PRESET_FABRICA, 30000)).toEqual([
      { tipo: "anticipo", descripcion: "Anticipo 50% (al confirmar)", editada: true, importe: "15000", vencimiento: "" },
      { tipo: "saldo", descripcion: "Saldo 50% (antes del embarque)", editada: true, importe: "15000", vencimiento: "" },
    ]);
  });

  it("logística: pago único por el total", () => {
    expect(cuotasDesdePreset(PRESET_PAGO_UNICO, 1200)).toEqual([
      { tipo: "otro", descripcion: "Pago único", editada: true, importe: "1200", vencimiento: "" },
    ]);
  });
});

import { describe, it, expect } from "vitest";
import { claveMes, DIAS_VENTANA_AGENDA, hayDiaDisponibleEnVentana, mesesDeLaVentana } from "./ventana-agenda";

describe("mesesDeLaVentana", () => {
  it("60 días desde el 16/11 cubren noviembre, diciembre y enero (cruza el año)", () => {
    expect(DIAS_VENTANA_AGENDA).toBe(60);
    expect(mesesDeLaVentana("2026-11-16")).toEqual([
      { anio: 2026, mesIdx0: 10 },
      { anio: 2026, mesIdx0: 11 },
      { anio: 2027, mesIdx0: 0 },
    ]);
  });

  it("una ventana corta dentro del mes es un solo mes", () => {
    expect(mesesDeLaVentana("2026-03-01", 10)).toEqual([{ anio: 2026, mesIdx0: 2 }]);
  });
});

describe("hayDiaDisponibleEnVentana", () => {
  const HOY = "2026-11-16";
  const vacios = { [claveMes(2026, 10)]: {}, [claveMes(2026, 11)]: {}, [claveMes(2027, 0)]: {} };

  it("null mientras falte cargar algún mes", () => {
    expect(hayDiaDisponibleEnVentana({ [claveMes(2026, 10)]: {} }, HOY)).toBeNull();
  });

  it("false con todos los meses vacíos (showroom sin días habilitados)", () => {
    expect(hayDiaDisponibleEnVentana(vacios, HOY)).toBe(false);
  });

  it("true con un día disponible dentro de la ventana, en otro mes", () => {
    expect(hayDiaDisponibleEnVentana({ ...vacios, [claveMes(2027, 0)]: { "2027-01-15": "disponible" } }, HOY)).toBe(true);
  });

  it("no cuentan los días completos, los pasados ni los de después de la ventana", () => {
    expect(
      hayDiaDisponibleEnVentana(
        {
          ...vacios,
          [claveMes(2026, 10)]: { "2026-11-15": "disponible", "2026-11-20": "completo" },
          [claveMes(2027, 0)]: { "2027-01-16": "disponible" },
        },
        HOY
      )
    ).toBe(false);
  });
});

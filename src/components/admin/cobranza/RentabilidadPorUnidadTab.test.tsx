import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockPush, mockWriteFile } = vi.hoisted(() => ({ mockPush: vi.fn(), mockWriteFile: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock("xlsx", () => ({
  utils: { json_to_sheet: vi.fn((rows: unknown[]) => rows), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: mockWriteFile,
}));

import RentabilidadPorUnidadTab from "./RentabilidadPorUnidadTab";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

const PERIODO = { desde: "2026-09-01T00:00:00.000Z", hasta: "2026-10-01T00:00:00.000Z" };
const mov = (importe: number) => ({
  id: `m${importe}`,
  fecha: "2026-09-15T00:00:00.000Z",
  importe,
  modalidad: "transferencia",
  cuotaId: null,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a",
});
function acuerdo(over: Partial<AcuerdoConDetalle>): AcuerdoConDetalle {
  return {
    id: "a",
    unidadId: "u1",
    unidadNumero: "MOV-1",
    unidadModelo: "Flex 38",
    unidadEstado: "en_transito",
    clienteId: "c1",
    clienteNombre: "Ana",
    tipo: "cobro",
    concepto: "venta",
    descripcion: null,
    contraparte: "Ana",
    moneda: "USD",
    totalAcordado: 0,
    notas: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}

describe("RentabilidadPorUnidadTab", () => {
  it("cobrado − fábrica − logística nacional − logística internacional = margen real USD", async () => {
    const user = userEvent.setup();
    render(
      <RentabilidadPorUnidadTab
        acuerdosCobro={[acuerdo({ movimientos: [mov(50000)] })]}
        acuerdosPago={[
          acuerdo({ id: "f", tipo: "pago", concepto: "fabrica", movimientos: [mov(30000)] }),
          acuerdo({ id: "t", tipo: "pago", concepto: "transporte", movimientos: [mov(1200)] }),
        ]}
        prorrateos={[
          { unidadId: "u1", unidadNumero: "MOV-1", unidadModelo: "Flex 38", unidadEstado: "en_transito", clienteNombre: "Ana", importe: 2100, fecha: "2026-09-20T00:00:00.000Z" },
        ]}
        periodo={PERIODO}
      />
    );
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Unidad",
      "Cliente",
      "Cobrado",
      "− Fábrica",
      "− Log. nacional",
      "− Log. internacional",
      "= Margen real USD",
      "Margen %",
      "Estado unidad",
    ]);
    const fila = screen.getAllByRole("row")[1];
    expect(fila).toHaveTextContent("USD 50.000");
    expect(fila).toHaveTextContent("USD 30.000");
    expect(fila).toHaveTextContent("USD 1.200");
    expect(fila).toHaveTextContent("USD 2.100");
    expect(fila).toHaveTextContent("USD 16.700");
    expect(fila).toHaveTextContent("33.4%");

    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    const xlsx = await import("xlsx");
    const rows = (xlsx.utils.json_to_sheet as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1)![0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ "Fábrica USD": 30000, "Logística nacional USD": 1200, "Logística internacional USD": 2100, "Margen real USD": 16700 });

    await user.click(fila);
    expect(mockPush).toHaveBeenCalledWith("/admin/unidades/u1");
  });

  it("sin datos en el período", () => {
    render(<RentabilidadPorUnidadTab acuerdosCobro={[]} acuerdosPago={[]} periodo={PERIODO} />);
    expect(screen.getByText("No hay cobros ni pagos en USD en este período.")).toBeInTheDocument();
  });
});

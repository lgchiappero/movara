import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import UnidadesEnMovimientoGrid, { type UnidadMovimiento } from "./UnidadesEnMovimientoGrid";

const BASE: UnidadMovimiento = {
  id: "u1",
  numeroUnidad: "MOV-UNIDAD-2026-001",
  clienteNombre: "Juan",
  modelo: "Flex 38",
  envioNumeroPI: null,
  estadoFabricacion: "pendiente",
  tienePrecio: true,
  fechaEmbarque: null,
  fechaArriboEstimado: null,
  fechaEntrega: null,
  provinciaDestino: null,
  cobradoUSD: 0,
  ultimoCobroFecha: null,
  proximoPaso: "Cobrar anticipo",
};

describe("UnidadesEnMovimientoGrid — columnas de cobranza", () => {
  it("muestra 'Cobrado' y 'Fecha último cobro' con los valores de cada unidad", () => {
    render(
      <UnidadesEnMovimientoGrid
        activas={[
          { ...BASE, cobradoUSD: 22500, ultimoCobroFecha: "2026-02-20T00:00:00.000Z", proximoPaso: "Registrar pago a fábrica" },
          { ...BASE, id: "u2", numeroUnidad: "MOV-UNIDAD-2026-002" },
        ]}
        entregadas={[]}
      />
    );

    expect(screen.getByRole("columnheader", { name: "Cobrado" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Fecha último cobro" })).toBeInTheDocument();

    const fila1 = screen.getByText("MOV-UNIDAD-2026-001").closest("tr")!;
    expect(fila1).toHaveTextContent("USD 22.500");
    expect(fila1).toHaveTextContent("20/2/2026");
    expect(fila1).toHaveTextContent("Registrar pago a fábrica");

    const fila2 = screen.getByText("MOV-UNIDAD-2026-002").closest("tr")!;
    expect(fila2).toHaveTextContent("USD 0");
    expect(fila2).toHaveTextContent("Cobrar anticipo");
  });
});

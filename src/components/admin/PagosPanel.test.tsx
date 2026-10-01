import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ToastProvider } from "./Toast";
import PagosPanel from "./PagosPanel";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

const PAGO: AcuerdoConDetalle = {
  id: "a1",
  unidadId: "u1",
  unidadNumero: "MOV-UNIDAD-2026-001",
  unidadModelo: "Flex 38",
  unidadEstado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana",
  tipo: "pago",
  concepto: "fabrica",
  descripcion: "Primera cuota fábrica",
  contraparte: "Heshi",
  moneda: "USD",
  totalAcordado: 30000,
  notas: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  cuotas: [],
  movimientos: [],
};

function renderPanel() {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <PagosPanel acuerdos={[PAGO]} unidades={[{ id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana" }]} rol="admin" />
    </ToastProvider>
  );
  return { user };
}

describe("PagosPanel", () => {
  it("lista solo pagos a proveedores, sin el selector Cobros/Pagos", () => {
    renderPanel();
    expect(screen.getByText("Pagos a proveedores")).toBeInTheDocument();
    expect(screen.getByText("Heshi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cobros" })).not.toBeInTheDocument();
  });

  it("'+ Nuevo pago' abre el modal de plan a proveedor", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole("button", { name: "+ Nuevo pago" }));
    expect(screen.getByRole("heading", { name: "Nuevo plan de pago a proveedor" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("heading", { name: "Nuevo plan de pago a proveedor" })).not.toBeInTheDocument();
  });

  it("'Registrar pago realizado' abre el modal del acuerdo", async () => {
    const { user } = renderPanel();
    await user.click(screen.getAllByRole("button", { name: "Registrar pago realizado" })[0]);
    expect(screen.getByRole("heading", { name: "Heshi" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Cuota que salda/)).toBeInTheDocument();
  });
});

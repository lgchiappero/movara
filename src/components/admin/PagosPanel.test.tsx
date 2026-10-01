import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ToastProvider } from "./Toast";
import PagosPanel from "./PagosPanel";
import { filasPorUnidad } from "@/lib/cobranza/planes-unidad";
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

const FILAS = filasPorUnidad(
  [{ id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana", modelo: "Flex 38", precioCliente: 24700 }],
  [PAGO],
  new Date("2026-10-07T12:00:00")
);

function renderPanel() {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <PagosPanel
        filas={FILAS}
        unidades={[{ id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana" }]}
        rol="admin"
        metricas={{ pagadoMes: { USD: 9000, ARS: 150000 }, pendiente: { USD: 21000, ARS: 0 }, unidadesCompletasMes: 2, unidadesConVencidas: 1 }}
      />
    </ToastProvider>
  );
  return { user };
}

describe("PagosPanel", () => {
  it("métricas de pagos a proveedores, con links a la grilla filtrada", () => {
    renderPanel();
    const pagado = screen.getByText("Pagado este mes").parentElement!;
    expect(pagado).toHaveTextContent("USD 9.000");
    expect(pagado).toHaveTextContent("ARS 150.000");
    expect(screen.getByText("Pendiente de pagar").closest("a")).toHaveAttribute("href", "/admin/pagos?estado=con_saldo");
    expect(screen.getByText("Pendiente de pagar").parentElement).toHaveTextContent("USD 21.000");
    expect(screen.getByText("Unidades con pagos completos este mes").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Unidades con pagos vencidos").closest("a")).toHaveAttribute("href", "/admin/pagos?estado=vencidas");
  });

  it("grilla por unidad en modo pagos (total, pagado, pendiente)", () => {
    renderPanel();
    expect(screen.getByText("Pagos a proveedores por unidad")).toBeInTheDocument();
    const fila = screen.getByRole("link", { name: "MOV-UNIDAD-2026-001" }).closest("tr")!;
    expect(fila).toHaveTextContent("USD 30.000");
    expect(screen.getByRole("columnheader", { name: "Pendiente" })).toBeInTheDocument();
  });

  it("'+ Nuevo pago a proveedor' abre el modal de pago directo (sin cuotas)", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole("button", { name: "+ Nuevo pago a proveedor" }));
    expect(screen.getByRole("heading", { name: "Nuevo pago a proveedor" })).toBeInTheDocument();
    expect(screen.queryByText("+ Agregar cuota")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("heading", { name: "Nuevo pago a proveedor" })).not.toBeInTheDocument();
  });

  it("'+ Pago' en la fila abre el alta con la unidad preseleccionada; no hay 'Registrar pago'", async () => {
    const { user } = renderPanel();
    const fila = screen.getByRole("link", { name: "MOV-UNIDAD-2026-001" }).closest("tr")!;
    expect(within(fila).queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
    await user.click(within(fila).getByRole("button", { name: "+ Pago" }));
    expect(screen.getByRole("heading", { name: "Nuevo pago a proveedor" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("MOV-UNIDAD-2026-001 — Ana")).toBeInTheDocument();
  });
});

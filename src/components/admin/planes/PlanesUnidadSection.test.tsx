import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ToastProvider } from "@/components/admin/Toast";
import PlanesUnidadSection from "./PlanesUnidadSection";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

const UNIDAD = { id: "u1", numeroUnidad: "MOV-1", clienteNombre: "Ana", modelo: "Flex 38", precioCliente: 24700 };

const PLAN: AcuerdoConDetalle = {
  id: "a1",
  unidadId: "u1",
  unidadNumero: "MOV-1",
  unidadModelo: "Flex 38",
  unidadEstado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana",
  tipo: "cobro",
  concepto: "venta",
  descripcion: "Venta financiada",
  contraparte: "Ana",
  moneda: "USD",
  totalAcordado: 24700,
  notas: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  cuotas: [],
  movimientos: [],
};

function renderSeccion(props: Partial<Parameters<typeof PlanesUnidadSection>[0]>) {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <PlanesUnidadSection tipo="cobro" unidad={UNIDAD} planes={[]} rol="admin" ahora="2026-10-07T12:00:00.000Z" {...props} />
    </ToastProvider>
  );
  return { user };
}

describe("PlanesUnidadSection", () => {
  it("cobro: sección 'Cobranza' con ancla #cobranza, plan del cliente y su descripción", () => {
    const { container } = render(
      <ToastProvider>
        <PlanesUnidadSection tipo="cobro" unidad={UNIDAD} planes={[PLAN]} rol="admin" ahora="2026-10-07T12:00:00.000Z" />
      </ToastProvider>
    );
    expect(container.querySelector("#cobranza")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Cobranza" })).toBeInTheDocument();
    expect(screen.getByText("Venta financiada")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Plan de pago" })).toHaveTextContent("Valor de la unidad: USD 24.700");
    // Ya tiene plan → no se ofrece crear otro.
    expect(screen.queryByRole("button", { name: "+ Nuevo plan de pago" })).not.toBeInTheDocument();
  });

  it("pago: sección 'Pagos a proveedores' con ancla #pagos", () => {
    const { container } = render(
      <ToastProvider>
        <PlanesUnidadSection tipo="pago" unidad={UNIDAD} planes={[]} rol="admin" ahora="2026-10-07T12:00:00.000Z" />
      </ToastProvider>
    );
    expect(container.querySelector("#pagos")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Pagos a proveedores" })).toBeInTheDocument();
    expect(screen.getByText(/Todavía no hay pagos a proveedores \(fábrica o logística nacional\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Nuevo pago a proveedor" })).toBeInTheDocument();
  });

  it("sin plan: '+ Nuevo plan de pago' abre el modal con la unidad preseleccionada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const { user } = renderSeccion({});
      await user.click(screen.getByRole("button", { name: "+ Nuevo plan de pago" }));
      const modal = screen.getByRole("heading", { name: "Nuevo plan de pago" }).closest("div.p-6")!;
      expect(within(modal as HTMLElement).getByDisplayValue("MOV-1 — Ana")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/unidades/u1");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("pago: cada pago a proveedor como un plan (proveedor · concepto, cuotas y pagos realizados) + contenido extra", () => {
    render(
      <ToastProvider>
        <PlanesUnidadSection
          tipo="pago"
          unidad={UNIDAD}
          planes={[{ ...PLAN, id: "p1", tipo: "pago", concepto: "fabrica", contraparte: "Heshi", descripcion: null }]}
          rol="admin"
          ahora="2026-10-07T12:00:00.000Z"
        >
          <p>Referencia logística</p>
        </PlanesUnidadSection>
      </ToastProvider>
    );
    const plan = screen.getByRole("region", { name: "Heshi · Fábrica" });
    expect(plan).toHaveTextContent("Unidad MOV-1 · Ana");
    expect(plan).toHaveTextContent("Total pagado");
    expect(plan).toHaveTextContent("Pagos realizados");
    expect(screen.getByRole("button", { name: "Registrar pago realizado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Nuevo pago a proveedor" })).toBeInTheDocument();
    expect(screen.getByText("Referencia logística")).toBeInTheDocument();
  });
});

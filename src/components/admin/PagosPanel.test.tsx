import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ToastProvider } from "./Toast";
import PagosPanel from "./PagosPanel";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";

const FABRICA: AcuerdoConDetalle = {
  id: "p1",
  unidadId: "u1",
  unidadNumero: "MOV-UNIDAD-2026-001",
  unidadModelo: "Flex 38",
  unidadEstado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana",
  tipo: "pago",
  concepto: "fabrica",
  descripcion: null,
  contraparte: "Heshi",
  moneda: "USD",
  totalAcordado: 30000,
  notas: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  cuotas: [],
  movimientos: [],
};

const FLETE: CostoLogisticaRow = {
  id: "c1",
  envioId: "e1",
  envioNumeroPI: "PI-001",
  envioContenedor: "MSCU1234567",
  concepto: "flete",
  descripcion: "Shanghai → Buenos Aires",
  moneda: "USD",
  importe: 4200,
  fecha: "2026-09-01T00:00:00.000Z",
  estado: "pagado",
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  prorrateado: true,
  prorrateos: [
    { unidadId: "u1", unidadNumero: "MOV-UNIDAD-2026-001", importe: 2100 },
    { unidadId: "u2", unidadNumero: "MOV-UNIDAD-2026-002", importe: 2100 },
  ],
  createdAt: "2026-09-01T00:00:00.000Z",
};

const VENCIDO_FLETE = {
  key: "logistica|c1",
  origen: "logistica" as const,
  tipo: "Logística: Flete",
  referencia: "Envío PI-001",
  contraparte: "Maersk",
  vencimiento: "2026-10-01",
  moneda: "USD",
  saldo: 3200,
  href: "/admin/envios/e1",
};

function renderPanel(props: Partial<Parameters<typeof PagosPanel>[0]> = {}) {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <PagosPanel
        planes={[FABRICA]}
        costos={[FLETE]}
        unidades={[{ id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana" }]}
        envios={[{ id: "e1", numeroPI: "PI-001", numeroContenedor: "MSCU1234567", cantidadUnidades: 2 }]}
        rol="admin"
        metricas={{ pagadoMes: { USD: 9000, ARS: 150000 }, pendiente: { USD: 21000, ARS: 0 } }}
        vencidos={[VENCIDO_FLETE]}
        {...props}
      />
    </ToastProvider>
  );
  return { user };
}

describe("PagosPanel", () => {
  it("?estado=vencido: lista exactamente las filas que cuenta la tarjeta, con tipo y saldo por moneda", () => {
    renderPanel({
      estadoInicial: "vencido",
      vencidos: [
        VENCIDO_FLETE,
        { ...VENCIDO_FLETE, key: "plan|a1", origen: "plan", tipo: "Fábrica", referencia: "MOV-UNIDAD-2026-001", moneda: "ARS", saldo: 50000 },
      ],
    });
    const lista = screen.getByTestId("pagos-vencidos");
    expect(within(lista).getByRole("heading")).toHaveTextContent("Pagos vencidos (2)");
    expect(within(lista).getAllByRole("row")).toHaveLength(3); // encabezado + 2
    expect(within(lista).getByText("Logística: Flete")).toBeInTheDocument();
    expect(within(lista).getByText("Fábrica")).toBeInTheDocument();
    expect(within(lista).getAllByText("1/10/2026")).toHaveLength(2);
    expect(lista).toHaveTextContent("Saldo vencido: USD 3.200 + ARS 50.000");
    expect(screen.getByText("Pagos vencidos").parentElement).toHaveTextContent("2");
  });

  it("?estado=vencido sin vencidos: mensaje vacío", () => {
    renderPanel({ estadoInicial: "vencido", vencidos: [] });
    expect(within(screen.getByTestId("pagos-vencidos")).getByText("No hay pagos vencidos.")).toBeInTheDocument();
  });

  it("sin el filtro de vencidos no se muestra la lista", () => {
    renderPanel();
    expect(screen.queryByTestId("pagos-vencidos")).not.toBeInTheDocument();
  });

  it("métricas con links a la grilla filtrada", () => {
    renderPanel();
    const pagado = screen.getByText("Pagado este mes").parentElement!;
    expect(pagado).toHaveTextContent("USD 9.000");
    expect(pagado).toHaveTextContent("ARS 150.000");
    expect(screen.getByText("Pendiente de pagar").closest("a")).toHaveAttribute("href", "/admin/pagos?estado=con_saldo");
    expect(screen.getByText("Pagos vencidos").closest("a")).toHaveAttribute("href", "/admin/pagos?estado=vencido");
    expect(screen.getByText("Pagos vencidos").parentElement).toHaveTextContent("1");
  });

  it("dos tabs: 'Por unidad' (por defecto) y 'Logística internacional'", async () => {
    const { user } = renderPanel();
    expect(screen.getByRole("tab", { name: "Por unidad (1)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Fábrica y logística nacional")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "MOV-UNIDAD-2026-001" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Logística internacional (1)" }));
    expect(screen.getByText("Costos del envío / contenedor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PI-001" })).toHaveAttribute("href", "/admin/envios/e1");
    expect(screen.getByText("Prorrateado ÷2")).toBeInTheDocument();
  });

  it("tab inicial desde la URL", () => {
    renderPanel({ tabInicial: "logistica" });
    expect(screen.getByRole("tab", { name: "Logística internacional (1)" })).toHaveAttribute("aria-selected", "true");
  });

  it("'+ Nuevo pago a proveedor' abre el plan de pago a proveedor", async () => {
    const { user } = renderPanel();
    await user.click(screen.getByRole("button", { name: "+ Nuevo pago a proveedor" }));
    expect(screen.getByRole("heading", { name: "Nuevo pago a proveedor" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
  });

  it("'+ Nuevo costo de logística' abre el modal de logística internacional", async () => {
    const { user } = renderPanel({ tabInicial: "logistica" });
    await user.click(screen.getByRole("button", { name: "+ Nuevo costo de logística" }));
    expect(screen.getByRole("heading", { name: "Nuevo costo de logística" })).toBeInTheDocument();
  });

  it("editar un costo abre el modal en modo edición", async () => {
    const { user } = renderPanel({ tabInicial: "logistica" });
    const fila = screen.getByRole("link", { name: "PI-001" }).closest("tr")!;
    await user.click(within(fila).getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: "Editar costo de logística" })).toBeInTheDocument();
  });
});

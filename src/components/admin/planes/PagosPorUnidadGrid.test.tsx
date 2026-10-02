import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const { mockExportar } = vi.hoisted(() => ({ mockExportar: vi.fn() }));
vi.mock("@/lib/admin/exportar-excel", () => ({ exportarExcel: mockExportar }));

import { ToastProvider } from "@/components/admin/Toast";
import PagosPorUnidadGrid from "./PagosPorUnidadGrid";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import type { AccionesPlanes } from "./useAccionesPlanes";

const HOY = new Date("2026-10-07T12:00:00");

function plan(over: Partial<AcuerdoConDetalle>): AcuerdoConDetalle {
  return {
    id: "p1",
    unidadId: "u1",
    unidadNumero: "MOV-UNIDAD-2026-001",
    unidadModelo: "Flex 38",
    unidadEstado: "pendiente",
    clienteId: "c1",
    clienteNombre: "Ana Pérez",
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
    ...over,
  };
}
const mov = (id: string, importe: number) => ({
  id,
  fecha: "2026-09-10T00:00:00.000Z",
  importe,
  modalidad: "transferencia",
  cuotaId: null,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a@x.com",
});

const PLANES = [
  plan({ id: "p1", movimientos: [mov("m1", 15000)] }), // parcial
  plan({ id: "p2", unidadId: "u2", unidadNumero: "MOV-UNIDAD-2026-002", clienteNombre: "Bruno", concepto: "grua", contraparte: "Grúas Sur", totalAcordado: 800, movimientos: [mov("m2", 800)] }), // pagado
  plan({
    id: "p3",
    concepto: "transporte",
    contraparte: "Transportes Ruta 5",
    totalAcordado: 1200,
    cuotas: [{ id: "q", descripcion: "Pago único", importe: 1200, vencimiento: "2026-09-01T00:00:00", estado: "pendiente" }],
  }), // vencido
  plan({ id: "p4", concepto: "flete", contraparte: "Naviera vieja", totalAcordado: 500, moneda: "ARS" }), // pendiente, concepto viejo
];

function acciones(): AccionesPlanes {
  return {
    abrirNuevoPlan: vi.fn(),
    abrirEditarPlan: vi.fn(),
    abrirRegistrarPago: vi.fn(),
    abrirEditarPago: vi.fn(),
    eliminarPago: vi.fn(async () => ({ ok: true })),
    eliminarPlan: vi.fn(async () => ({ ok: true })),
  };
}

function renderGrid(props: Partial<Parameters<typeof PagosPorUnidadGrid>[0]> = {}) {
  const user = userEvent.setup();
  const a = acciones();
  render(
    <ToastProvider>
      <PagosPorUnidadGrid planes={PLANES} rol="admin" acciones={a} ahora={HOY} {...props} />
    </ToastProvider>
  );
  return { user, acciones: a };
}

const proveedores = () =>
  screen.getAllByRole("row").slice(1).filter((r) => r.getAttribute("aria-expanded") !== null).map((r) => (r as HTMLTableRowElement).cells[2].textContent);

describe("PagosPorUnidadGrid — tab 'Por unidad'", () => {
  it("columnas: Unidad, Cliente, Proveedor, Concepto, Total, Pagado, Pendiente, Estado", () => {
    renderGrid();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Unidad",
      "Cliente",
      "Proveedor",
      "Concepto",
      "Total",
      "Pagado",
      "Pendiente",
      "Estado",
    ]);
  });

  it("una fila por pago con totales y estado", () => {
    renderGrid();
    const heshi = screen.getByText("Heshi").closest("tr")!;
    expect(heshi).toHaveTextContent("MOV-UNIDAD-2026-001");
    expect(heshi).toHaveTextContent("Ana Pérez");
    expect(heshi).toHaveTextContent("Fábrica");
    expect(heshi).toHaveTextContent("USD 30.000");
    expect(heshi).toHaveTextContent("USD 15.000");
    expect(heshi).toHaveTextContent("En curso");
    expect(screen.getByText("Grúas Sur").closest("tr")).toHaveTextContent("Saldado");
    expect(screen.getByText("Transportes Ruta 5").closest("tr")).toHaveTextContent("Vencido");
    expect(screen.getByText("Naviera vieja").closest("tr")).toHaveTextContent("Flete");
    expect(screen.getByText("Naviera vieja").closest("tr")).toHaveTextContent("ARS 500");
    expect(within(heshi).getByRole("link", { name: "MOV-UNIDAD-2026-001" })).toHaveAttribute("href", "/admin/unidades/u1");
  });

  it("filtros: estado, concepto (incluye conceptos viejos) y búsqueda por unidad/cliente/proveedor", async () => {
    const { user } = renderGrid();
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "vencido");
    expect(proveedores()).toEqual(["Transportes Ruta 5"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "todos");
    const conceptos = Array.from((screen.getByLabelText("Filtrar por concepto") as HTMLSelectElement).options).map((o) => o.text);
    expect(conceptos).toEqual(["Todos los conceptos", "Fábrica", "Transporte local", "Grúa", "Instalación", "Otro", "Flete"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por concepto"), "grua");
    expect(proveedores()).toEqual(["Grúas Sur"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por concepto"), "todos");
    await user.type(screen.getByLabelText("Buscar"), "bruno");
    await waitFor(() => expect(proveedores()).toEqual(["Grúas Sur"]));
    await user.clear(screen.getByLabelText("Buscar"));
    await user.type(screen.getByLabelText("Buscar"), "zzz");
    await waitFor(() => expect(screen.getByText("Ningún pago coincide con los filtros.")).toBeInTheDocument());
  });

  it("estado inicial 'con saldo' (desde el dashboard) excluye los pagados y queda seleccionado", () => {
    renderGrid({ estadoInicial: "con_saldo" });
    expect((screen.getByLabelText("Filtrar por estado") as HTMLSelectElement).value).toBe("con_saldo");
    expect(proveedores()).not.toContain("Grúas Sur");
  });

  it("click en la fila despliega el plan (cuotas + pagos realizados); otro click la cierra", async () => {
    const { user, acciones: a } = renderGrid();
    await user.click(screen.getByText("Heshi"));
    const detalle = screen.getByTestId("detalle-pago-p1");
    expect(within(detalle).getByRole("heading", { name: "Heshi · Fábrica" })).toBeInTheDocument();
    expect(detalle).toHaveTextContent("Pagos realizados");
    await user.click(within(detalle).getByRole("button", { name: "Registrar pago realizado" }));
    expect(a.abrirRegistrarPago).toHaveBeenCalledWith(PLANES[0]);
    await user.click(screen.getByText("Heshi", { selector: "td" }));
    expect(screen.queryByTestId("detalle-pago-p1")).not.toBeInTheDocument();
  });

  it("'+ Nuevo pago a proveedor'", async () => {
    const { user, acciones: a } = renderGrid();
    await user.click(screen.getByRole("button", { name: "+ Nuevo pago a proveedor" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith();
  });

  it("sin pagos cargados", () => {
    renderGrid({ planes: [] });
    expect(screen.getByText("Todavía no hay pagos a proveedores cargados.")).toBeInTheDocument();
  });

  it("pagina de a 50", async () => {
    const muchos = Array.from({ length: 51 }, (_, i) => plan({ id: `x${i}`, contraparte: `Prov ${i}` }));
    const { user } = renderGrid({ planes: muchos });
    expect(screen.getByText("Página 1 de 2 (51 pagos)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(screen.getByText("Página 2 de 2 (51 pagos)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "← Anterior" }));
    expect(screen.getByText("Página 1 de 2 (51 pagos)")).toBeInTheDocument();
  });

  it("filtro por estado: Todos | Pendiente | En curso | Saldado | Vencido", async () => {
    const { user } = renderGrid();
    const select = screen.getByLabelText("Filtrar por estado") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual(["Todos los estados", "Pendiente", "En curso", "Saldado", "Vencido"]);
    await user.selectOptions(select, "parcial");
    expect(proveedores()).toEqual(["Heshi"]);
    await user.selectOptions(select, "pagado");
    expect(proveedores()).toEqual(["Grúas Sur"]);
  });

  it("filtro por período: solo pagos con pagos realizados en el rango, y Pagado muestra lo del período", async () => {
    const { user } = renderGrid();
    const periodo = screen.getByLabelText("Filtrar por período") as HTMLSelectElement;
    expect(Array.from(periodo.options).map((o) => o.text)).toEqual([
      "Todo el historial",
      "Este mes",
      "Mes anterior",
      "Este trimestre",
      "Rango personalizado",
    ]);
    // HOY = 7/10/2026; los pagos son del 10/9.
    await user.selectOptions(periodo, "mes_actual");
    expect(screen.getByText("Ningún pago coincide con los filtros.")).toBeInTheDocument();
    await user.selectOptions(periodo, "mes_anterior");
    expect(proveedores()).toEqual(["Grúas Sur", "Heshi"]);
    expect(screen.getByRole("columnheader", { name: "Pagado (período)" })).toBeInTheDocument();
    await user.selectOptions(periodo, "personalizado");
    await user.type(screen.getByLabelText("Desde"), "2026-09-01");
    await user.type(screen.getByLabelText("Hasta"), "2026-09-09");
    expect(screen.getByText("Ningún pago coincide con los filtros.")).toBeInTheDocument();
  });

  it("Exportar Excel descarga exactamente las filas filtradas, con las columnas pedidas", async () => {
    mockExportar.mockClear();
    const { user } = renderGrid();
    await user.selectOptions(screen.getByLabelText("Filtrar por concepto"), "fabrica");
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    const [filas, hoja, archivo] = mockExportar.mock.calls[0];
    expect(hoja).toBe("Pagos por unidad");
    expect(archivo).toBe("pagos-por-unidad.xlsx");
    expect(filas).toEqual([
      {
        "Número unidad": "MOV-UNIDAD-2026-001",
        Cliente: "Ana Pérez",
        Modelo: "Flex 38",
        Proveedor: "Heshi",
        Concepto: "Fábrica",
        Descripción: "",
        Moneda: "USD",
        "Total acordado": 30000,
        "Total pagado": 15000,
        "Saldo pendiente": 15000,
        Estado: "En curso",
        "Fecha último pago": "10/09/2026",
        Notas: "",
      },
    ]);
  });

  it("con período, el Excel agrega lo pagado en el período", async () => {
    mockExportar.mockClear();
    const { user } = renderGrid();
    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "mes_anterior");
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    const filas = mockExportar.mock.calls[0][0] as Record<string, unknown>[];
    expect(filas.map((f) => f["Pagado en el período"])).toEqual([800, 15000]);
  });
});

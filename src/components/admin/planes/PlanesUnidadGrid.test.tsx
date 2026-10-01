import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockWriteFile } = vi.hoisted(() => ({ mockWriteFile: vi.fn() }));
vi.mock("xlsx", () => ({
  utils: { json_to_sheet: vi.fn((rows: unknown[]) => rows), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: mockWriteFile,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { ToastProvider } from "@/components/admin/Toast";
import PlanesUnidadGrid from "./PlanesUnidadGrid";
import { filasPorUnidad, type UnidadParaPlanes } from "@/lib/cobranza/planes-unidad";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";
import type { AccionesPlanes } from "./useAccionesPlanes";

const AHORA = new Date("2026-10-07T12:00:00");

const UNIDADES: UnidadParaPlanes[] = [
  { id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana Pérez", modelo: "Flex 38", precioCliente: 24700 },
  { id: "u2", numeroUnidad: "MOV-UNIDAD-2026-002", clienteNombre: "Bruno Díaz", modelo: "Flex 18", precioCliente: 15000 },
  { id: "u3", numeroUnidad: "MOV-UNIDAD-2026-003", clienteNombre: "Carla Ruiz", modelo: null, precioCliente: null },
];

function pago(id: string, importe: number, fecha: string, cuotaId: string | null = null, extra: Partial<{ notas: string; comprobanteSignedUrl: string }> = {}) {
  return {
    id,
    fecha,
    importe,
    modalidad: "transferencia",
    cuotaId,
    comprobanteUrl: null,
    comprobanteSignedUrl: null,
    notas: null,
    registradoPor: "a@x.com",
    ...extra,
  };
}

function plan(over: Partial<AcuerdoConDetalle>): AcuerdoConDetalle {
  return {
    id: "a1",
    unidadId: "u1",
    unidadNumero: "MOV-UNIDAD-2026-001",
    unidadModelo: "Flex 38",
    unidadEstado: "pendiente",
    clienteId: "c1",
    clienteNombre: "Ana Pérez",
    tipo: "cobro",
    concepto: "venta",
    descripcion: null,
    contraparte: "Ana Pérez",
    moneda: "USD",
    totalAcordado: 24700,
    notas: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    cuotas: [],
    movimientos: [],
    ...over,
  };
}

// u1: plan en curso (anticipo pagado), u2: saldada, u3: sin plan.
const PLAN_U1 = plan({
  descripcion: "Venta Flex 38 financiada en 3 cuotas",
  cuotas: [
    { id: "q1", descripcion: "Anticipo 30%", importe: 7410, vencimiento: "2026-09-01T00:00:00.000Z", estado: "pagado" },
    { id: "q2", descripcion: "Cuota 1/3", importe: 5000, vencimiento: "2026-09-30T00:00:00.000Z", estado: "vencido" },
    { id: "q3", descripcion: "Cuota 2/3", importe: 6000, vencimiento: null, estado: "pendiente" },
    { id: "q4", descripcion: "Cuota 3/3", importe: 6290, vencimiento: null, estado: "pendiente" },
  ],
  movimientos: [
    pago("m2", 2000, "2026-09-20T00:00:00.000Z", "q2", { notas: "Parcial cuota 1" }),
    pago("m1", 7410, "2026-09-05T00:00:00.000Z", "q1", { comprobanteSignedUrl: "https://x/comp.pdf" }),
  ],
});
const PLAN_U2 = plan({
  id: "a2",
  unidadId: "u2",
  totalAcordado: 15000,
  contraparte: "Bruno Díaz",
  cuotas: [{ id: "q9", descripcion: "Saldo", importe: 15000, vencimiento: null, estado: "pagado" }],
  movimientos: [pago("m9", 15000, "2026-10-02T00:00:00.000Z")],
});

function acciones(): AccionesPlanes {
  return {
    abrirNuevoPlan: vi.fn(),
    abrirRegistrarPago: vi.fn(),
    abrirEditarPago: vi.fn(),
    eliminarPago: vi.fn(async () => ({ ok: true })),
    eliminarPlan: vi.fn(async () => ({ ok: true })),
  };
}

function renderGrid(props: Partial<Parameters<typeof PlanesUnidadGrid>[0]> = {}) {
  const user = userEvent.setup();
  const a = acciones();
  render(
    <ToastProvider>
      <PlanesUnidadGrid
        tipo="cobro"
        filas={filasPorUnidad(UNIDADES, [PLAN_U1, PLAN_U2], AHORA)}
        rol="admin"
        acciones={a}
        {...props}
      />
    </ToastProvider>
  );
  return { user, acciones: a };
}

const fila = (numero: string) => screen.getByRole("link", { name: numero }).closest("tr")!;

describe("PlanesUnidadGrid — cobranza", () => {
  beforeEach(() => mockWriteFile.mockReset());

  it("una fila por unidad con las columnas pedidas", () => {
    renderGrid();
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Unidad",
      "Cliente",
      "Modelo",
      "Valor total unidad",
      "Plan de pago",
      "Total cobrado",
      "Saldo pendiente",
      "% cobrado",
      "Estado",
      "Fecha último pago",
      "Acciones",
    ]);
    expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ })).toHaveLength(3);
  });

  it("muestra valor de la unidad, resumen del plan con su descripción, cobrado, saldo, %, estado y último pago", () => {
    renderGrid();
    const f = fila("MOV-UNIDAD-2026-001");
    expect(f).toHaveTextContent("USD 24.700");
    expect(f).toHaveTextContent("Anticipo + 3 cuotas");
    expect(f).toHaveTextContent("Venta Flex 38 financiada en 3 cuotas");
    expect(f).toHaveTextContent("USD 9.410");
    expect(f).toHaveTextContent("USD 15.290");
    expect(within(f).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "38");
    expect(f).toHaveTextContent("En curso");
    expect(f).toHaveTextContent("Vencida");
    expect(f).toHaveTextContent("20/9/2026");
    expect(screen.getByRole("link", { name: "MOV-UNIDAD-2026-001" })).toHaveAttribute("href", "/admin/unidades/u1");
  });

  it("unidad saldada y unidad sin plan", () => {
    renderGrid();
    expect(fila("MOV-UNIDAD-2026-002")).toHaveTextContent("Saldado");
    const sinPlan = fila("MOV-UNIDAD-2026-003");
    expect(sinPlan).toHaveTextContent("Sin plan");
    expect(sinPlan).toHaveTextContent("—");
  });

  it("acciones: 'Crear plan' solo sin plan; 'Registrar pago' abre el modal del plan con saldo", async () => {
    const { user, acciones: a } = renderGrid();
    await user.click(within(fila("MOV-UNIDAD-2026-003")).getByRole("button", { name: "Crear plan" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith("u3");
    expect(within(fila("MOV-UNIDAD-2026-001")).queryByRole("button", { name: "Crear plan" })).not.toBeInTheDocument();
    expect(within(fila("MOV-UNIDAD-2026-002")).queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
    await user.click(within(fila("MOV-UNIDAD-2026-001")).getByRole("button", { name: "Registrar pago" }));
    expect(a.abrirRegistrarPago).toHaveBeenCalledWith(PLAN_U1);
    // Las acciones no despliegan la fila.
    expect(screen.queryByTestId("detalle-u1|USD")).not.toBeInTheDocument();
  });

  it("'+ Nuevo plan de pago' sin unidad preseleccionada", async () => {
    const { user, acciones: a } = renderGrid();
    await user.click(screen.getByRole("button", { name: "+ Nuevo plan de pago" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith();
  });

  it("filtros: estado, moneda y búsqueda", async () => {
    const { user } = renderGrid();
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "sin_plan");
    expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent)).toEqual(["MOV-UNIDAD-2026-003"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "con_saldo");
    expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent)).toEqual(["MOV-UNIDAD-2026-001"]);
    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "todos");
    await user.selectOptions(screen.getByLabelText("Filtrar por moneda"), "ARS");
    expect(screen.getByText("Ninguna unidad coincide con los filtros.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrar por moneda"), "todos");
    await user.type(screen.getByPlaceholderText(/Buscar por unidad/), "bruno");
    expect(await screen.findByText("Bruno Díaz")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 350));
    expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent)).toEqual(["MOV-UNIDAD-2026-002"]);
  });

  it("estado inicial desde la URL", () => {
    renderGrid({ estadoInicial: "saldado" });
    expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent)).toEqual(["MOV-UNIDAD-2026-002"]);
  });

  it("exporta a Excel las filas filtradas", async () => {
    const { user } = renderGrid();
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    expect(mockWriteFile).toHaveBeenCalledWith(expect.anything(), "cobranza.xlsx");
  });

  it("pagina de a 50 unidades", async () => {
    const muchas = Array.from({ length: 51 }, (_, i) => ({ ...UNIDADES[2], id: `x${i}`, numeroUnidad: `MOV-UNIDAD-X-${i}` }));
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <PlanesUnidadGrid tipo="cobro" filas={filasPorUnidad(muchas, [], AHORA)} rol="admin" acciones={acciones()} />
      </ToastProvider>
    );
    expect(screen.getByText("Página 1 de 2 (51 unidades)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    expect(screen.getByText("Página 2 de 2 (51 unidades)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "← Anterior" }));
    expect(screen.getByText("Página 1 de 2 (51 unidades)")).toBeInTheDocument();
  });
});

describe("Detalle de la unidad (fila desplegada)", () => {
  async function abrir(user: ReturnType<typeof userEvent.setup>, numero: string) {
    await user.click(within(fila(numero)).getByText(numero.endsWith("1") ? "Ana Pérez" : numero.endsWith("2") ? "Bruno Díaz" : "Carla Ruiz"));
    return screen.getByTestId(`detalle-${numero.endsWith("1") ? "u1" : numero.endsWith("2") ? "u2" : "u3"}|USD`);
  }

  it("valor total de la unidad arriba, saldo de la unidad completa y % cobrado", async () => {
    const { user } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-001");
    expect(d).toHaveTextContent("Valor total unidad");
    expect(d).toHaveTextContent("USD 24.700");
    expect(d).toHaveTextContent("Saldo pendiente");
    expect(d).toHaveTextContent("USD 15.290");
    expect(d).toHaveTextContent("38% cobrado");
  });

  it("muestra la descripción cargada en el plan (bug: antes no aparecía)", async () => {
    const { user } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-001");
    expect(within(d).getByText("Plan de pago")).toBeInTheDocument();
    expect(within(d).getByText("Venta Flex 38 financiada en 3 cuotas")).toBeInTheDocument();
  });

  it("cuotas con vencimiento, aplicado y estado (incluido Parcial)", async () => {
    const { user } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-001");
    const filaCuota = within(d).getAllByText("Cuota 1/3")[0].closest("tr")!;
    expect(filaCuota).toHaveTextContent("USD 5.000");
    expect(filaCuota).toHaveTextContent("30/9/2026");
    expect(filaCuota).toHaveTextContent("USD 2.000");
    expect(filaCuota).toHaveTextContent("Parcial");
    expect(within(d).getAllByText("Anticipo 30%")[0].closest("tr")).toHaveTextContent("Pagado");
  });

  it("pagos recibidos en orden cronológico con la cuota que saldaron, comprobante y notas", async () => {
    const { user } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-001");
    expect(within(d).getByText("Pagos recibidos")).toBeInTheDocument();
    const filasPagos = within(d).getAllByRole("button", { name: "Editar" }).map((b) => b.closest("tr")!);
    expect(filasPagos[0]).toHaveTextContent("5/9/2026");
    expect(filasPagos[0]).toHaveTextContent("Anticipo 30%");
    expect(within(filasPagos[0]).getByRole("link", { name: "Ver" })).toHaveAttribute("href", "https://x/comp.pdf");
    expect(filasPagos[1]).toHaveTextContent("20/9/2026");
    expect(filasPagos[1]).toHaveTextContent("Cuota 1/3");
    expect(filasPagos[1]).toHaveTextContent("Parcial cuota 1");
  });

  it("registrar, editar y eliminar pagos; eliminar plan bloqueado si tiene pagos", async () => {
    const { user, acciones: a } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-001");
    await user.click(within(d).getByRole("button", { name: "Registrar pago recibido" }));
    expect(a.abrirRegistrarPago).toHaveBeenCalledWith(PLAN_U1);
    await user.click(within(d).getAllByRole("button", { name: "Editar" })[0]);
    expect(a.abrirEditarPago).toHaveBeenCalledWith(PLAN_U1, expect.objectContaining({ id: "m1" }));
    await user.click(within(d).getAllByRole("button", { name: "Eliminar" })[0]);
    const dialogo = screen.getByText("¿Eliminar este pago?").parentElement!;
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(a.eliminarPago).toHaveBeenCalledWith(PLAN_U1, expect.objectContaining({ id: "m1" }));
    expect(d).toHaveTextContent("No se puede eliminar: tiene 2 pagos registrados");
    expect(within(d).queryByRole("button", { name: "+ Nuevo plan de pago" })).not.toBeInTheDocument();
  });

  it("indicador visual cuando la unidad está 100% saldada", async () => {
    const { user } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-002");
    expect(within(d).getByText("✅ Unidad 100% saldada")).toBeInTheDocument();
    expect(d).toHaveTextContent("100% cobrado");
  });

  it("unidad sin plan: mensaje y botón para crear el plan; plan sin pagos se puede eliminar", async () => {
    const { user, acciones: a } = renderGrid({
      filas: filasPorUnidad(UNIDADES, [plan({ id: "a5", unidadId: "u2", totalAcordado: 15000 })], AHORA),
    });
    const sinPlan = await abrir(user, "MOV-UNIDAD-2026-003");
    expect(sinPlan).toHaveTextContent("Esta unidad todavía no tiene plan de pago.");
    expect(sinPlan).toHaveTextContent("—");
    await user.click(within(sinPlan).getByRole("button", { name: "+ Nuevo plan de pago" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith("u3");

    const conPlan = await abrir(user, "MOV-UNIDAD-2026-002");
    expect(within(conPlan).getByText("Sin cuotas.")).toBeInTheDocument();
    expect(within(conPlan).getByText("Todavía no hay pagos recibidos.")).toBeInTheDocument();
    await user.click(within(conPlan).getByRole("button", { name: "Eliminar plan" }));
    await user.click(within(screen.getByText("¿Eliminar este plan de pago?").parentElement!).getByRole("button", { name: "Eliminar" }));
    expect(a.eliminarPlan).toHaveBeenCalled();
  });

  it("un vendedor no ve 'Eliminar plan'", async () => {
    const { user } = renderGrid({
      rol: "vendedor",
      filas: filasPorUnidad(UNIDADES, [plan({ id: "a5", unidadId: "u2", totalAcordado: 15000 })], AHORA),
    });
    const d = await abrir(user, "MOV-UNIDAD-2026-002");
    expect(within(d).queryByRole("button", { name: "Eliminar plan" })).not.toBeInTheDocument();
  });

  it("click de nuevo en la fila la colapsa", async () => {
    const { user } = renderGrid();
    await abrir(user, "MOV-UNIDAD-2026-001");
    await user.click(within(fila("MOV-UNIDAD-2026-001")).getByText("Ana Pérez"));
    expect(screen.queryByTestId("detalle-u1|USD")).not.toBeInTheDocument();
  });
});

describe("PlanesUnidadGrid — pagos a proveedores", () => {
  const PAGO_FABRICA = plan({
    id: "p1",
    tipo: "pago",
    concepto: "fabrica",
    contraparte: "Heshi",
    descripcion: "Primera cuota fábrica",
    totalAcordado: 30000,
    cuotas: [{ id: "c1", descripcion: "Anticipo", importe: 9000, vencimiento: null, estado: "pagado" }],
    movimientos: [pago("x1", 9000, "2026-09-10T00:00:00.000Z", "c1")],
  });
  const PAGO_FLETE = plan({ id: "p2", tipo: "pago", concepto: "flete", contraparte: "Naviera Sur", totalAcordado: 3200, moneda: "ARS" });
  const PAGO_SEGURO = plan({ id: "p3", tipo: "pago", concepto: "seguro", contraparte: "La Caja", totalAcordado: 500 });

  function renderPagos() {
    return renderGrid({ tipo: "pago", filas: filasPorUnidad(UNIDADES, [PAGO_FABRICA, PAGO_FLETE, PAGO_SEGURO], AHORA) });
  }

  it("columnas de pagos: proveedores, total a pagar, pagado, pendiente", () => {
    renderPagos();
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Unidad",
      "Cliente",
      "Modelo",
      "Proveedores",
      "Total a pagar",
      "Pagado",
      "Pendiente",
      "% pagado",
      "Estado",
      "Fecha último pago",
      "Acciones",
    ]);
    const filaUSD = screen.getAllByRole("link", { name: "MOV-UNIDAD-2026-001" })[0].closest("tr")!;
    expect(filaUSD).toHaveTextContent("Heshi, La Caja");
    expect(filaUSD).toHaveTextContent("USD 30.500");
    expect(filaUSD).toHaveTextContent("USD 9.000");
    expect(filaUSD).toHaveTextContent("USD 21.500");
    // El plan en ARS va en su propia fila.
    expect(screen.getAllByRole("link", { name: "MOV-UNIDAD-2026-001" })[1].closest("tr")).toHaveTextContent("(ARS)");
  });

  it("'+ Plan' está siempre (varios proveedores por unidad); con varios planes con saldo, 'Registrar pago' despliega el detalle", async () => {
    const { user, acciones: a } = renderPagos();
    const filaUSD = screen.getAllByRole("link", { name: "MOV-UNIDAD-2026-001" })[0].closest("tr")!;
    await user.click(within(filaUSD).getByRole("button", { name: "+ Plan" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith("u1");
    await user.click(within(filaUSD).getByRole("button", { name: "Registrar pago" }));
    expect(a.abrirRegistrarPago).not.toHaveBeenCalled();
    const d = screen.getByTestId("detalle-u1|USD");
    expect(within(d).getByText("Heshi · Fábrica")).toBeInTheDocument();
    expect(within(d).getByText("Primera cuota fábrica")).toBeInTheDocument();
    expect(within(d).getByText("La Caja · Seguro")).toBeInTheDocument();
    expect(within(d).getByText("Pagos realizados")).toBeInTheDocument();
    expect(within(d).getByRole("columnheader", { name: "Proveedor" })).toBeInTheDocument();
    expect(within(d).getByRole("button", { name: "+ Nuevo plan de pago a proveedor" })).toBeInTheDocument();
  });

  it("un pago sin cuota muestra la descripción del plan como concepto", async () => {
    const { user } = renderGrid({
      tipo: "pago",
      filas: filasPorUnidad(UNIDADES, [{ ...PAGO_FABRICA, movimientos: [pago("x2", 100, "2026-09-11T00:00:00.000Z")] }], AHORA),
    });
    await user.click(within(screen.getByRole("link", { name: "MOV-UNIDAD-2026-001" }).closest("tr")!).getByText("Ana Pérez"));
    const d = screen.getByTestId("detalle-u1|USD");
    expect(within(d).getAllByText("Primera cuota fábrica").length).toBe(2);
  });

  it("exporta pagos.xlsx", async () => {
    const { user } = renderPagos();
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    expect(mockWriteFile).toHaveBeenCalledWith(expect.anything(), "pagos.xlsx");
  });
});

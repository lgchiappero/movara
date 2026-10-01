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
    abrirEditarPlan: vi.fn(),
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

describe("Detalle de la unidad (fila desplegada) — plan de pago unificado", () => {
  async function abrir(user: ReturnType<typeof userEvent.setup>, numero: string, cliente: string, key: string) {
    await user.click(within(fila(numero)).getByText(cliente));
    return screen.getByTestId(`detalle-${key}|USD`);
  }
  const abrirU1 = (user: ReturnType<typeof userEvent.setup>) => abrir(user, "MOV-UNIDAD-2026-001", "Ana Pérez", "u1");

  it("una sola sección 'Plan de pago' con total acordado, saldo pendiente, cuotas y pagos recibidos", async () => {
    const { user } = renderGrid();
    const d = await abrirU1(user);
    const plan = within(d).getByRole("region", { name: "Plan de pago" });
    expect(within(d).getAllByRole("region", { name: "Plan de pago" })).toHaveLength(1);
    expect(within(plan).getByRole("heading", { name: "Plan de pago" })).toBeInTheDocument();
    expect(within(plan).getByText("Venta Flex 38 financiada en 3 cuotas")).toBeInTheDocument();
    expect(within(plan).getByText("Total acordado").nextElementSibling).toHaveTextContent("USD 24.700");
    expect(within(plan).getByText("Saldo pendiente").nextElementSibling).toHaveTextContent("USD 15.290");
    expect(plan).toHaveTextContent("Valor de la unidad: USD 24.700");
    expect(plan).toHaveTextContent("38% cobrado");
    expect(within(plan).getByText("Cuotas")).toBeInTheDocument();
    expect(within(plan).getByText("Pagos recibidos")).toBeInTheDocument();
  });

  it("cuotas con vencimiento, aplicado y estado (incluido Parcial)", async () => {
    const { user } = renderGrid();
    const d = await abrirU1(user);
    const filaCuota = within(d).getAllByText("Cuota 1/3")[0].closest("tr")!;
    expect(filaCuota).toHaveTextContent("USD 5.000");
    expect(filaCuota).toHaveTextContent("30/9/2026");
    expect(filaCuota).toHaveTextContent("USD 2.000");
    expect(filaCuota).toHaveTextContent("Parcial");
    expect(within(d).getAllByText("Anticipo 30%")[0].closest("tr")).toHaveTextContent("Pagado");
  });

  it("pagos recibidos del más reciente al más viejo, con la cuota que saldaron, comprobante y notas", async () => {
    const { user } = renderGrid();
    const d = await abrirU1(user);
    const filasPagos = within(d).getAllByRole("button", { name: "Editar" }).map((b) => b.closest("tr")!);
    expect(filasPagos[0]).toHaveTextContent("20/9/2026");
    expect(filasPagos[0]).toHaveTextContent("Cuota 1/3");
    expect(filasPagos[0]).toHaveTextContent("Parcial cuota 1");
    expect(filasPagos[1]).toHaveTextContent("5/9/2026");
    expect(filasPagos[1]).toHaveTextContent("Anticipo 30%");
    expect(within(filasPagos[1]).getByRole("link", { name: "Ver" })).toHaveAttribute("href", "https://x/comp.pdf");
  });

  it("registrar, editar y eliminar pagos; 'Editar plan'", async () => {
    const { user, acciones: a } = renderGrid();
    const d = await abrirU1(user);
    await user.click(within(d).getByRole("button", { name: "Registrar pago recibido" }));
    expect(a.abrirRegistrarPago).toHaveBeenCalledWith(PLAN_U1);
    await user.click(within(d).getByRole("button", { name: "Editar plan" }));
    expect(a.abrirEditarPlan).toHaveBeenCalledWith(PLAN_U1);
    await user.click(within(d).getAllByRole("button", { name: "Editar" })[0]);
    expect(a.abrirEditarPago).toHaveBeenCalledWith(PLAN_U1, expect.objectContaining({ id: "m2" }));
    await user.click(within(d).getAllByRole("button", { name: "Eliminar" })[0]);
    const dialogo = screen.getByText("¿Eliminar este pago?").parentElement!;
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(a.eliminarPago).toHaveBeenCalledWith(PLAN_U1, expect.objectContaining({ id: "m2" }));
    expect(within(d).queryByRole("button", { name: "+ Nuevo plan de pago" })).not.toBeInTheDocument();
  });

  it("'Eliminar plan' advierte que se borran todos los pagos registrados y elimina el plan aunque tenga pagos", async () => {
    const { user, acciones: a } = renderGrid();
    const d = await abrirU1(user);
    await user.click(within(d).getByRole("button", { name: "Eliminar plan" }));
    const dialogo = screen.getByText("¿Eliminar el plan de pago completo?").parentElement!;
    expect(dialogo).toHaveTextContent("Se van a borrar el plan, sus 4 cuotas y los 2 pagos recibidos registrados (USD 9.410)");
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(a.eliminarPlan).toHaveBeenCalledWith(PLAN_U1);
  });

  it("indicador visual cuando la unidad está 100% saldada", async () => {
    const { user } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-002", "Bruno Díaz", "u2");
    expect(within(d).getByText("✅ Unidad 100% saldada")).toBeInTheDocument();
    expect(d).toHaveTextContent("100% cobrado");
  });

  it("unidad sin plan: valor de la unidad, mensaje y botón para crear el plan", async () => {
    const { user, acciones: a } = renderGrid();
    const d = await abrir(user, "MOV-UNIDAD-2026-003", "Carla Ruiz", "u3");
    expect(d).toHaveTextContent("Valor total de la unidad: —");
    expect(d).toHaveTextContent("Esta unidad todavía no tiene plan de pago.");
    await user.click(within(d).getByRole("button", { name: "+ Nuevo plan de pago" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith("u3");
  });

  it("plan sin cuotas ni pagos: textos vacíos y eliminar sin advertencia de pagos", async () => {
    const { user, acciones: a } = renderGrid({
      filas: filasPorUnidad(UNIDADES, [plan({ id: "a5", unidadId: "u2", totalAcordado: 15000 })], AHORA),
    });
    const d = await abrir(user, "MOV-UNIDAD-2026-002", "Bruno Díaz", "u2");
    expect(within(d).getByText("Sin cuotas.")).toBeInTheDocument();
    expect(within(d).getByText("Todavía no hay pagos recibidos.")).toBeInTheDocument();
    await user.click(within(d).getByRole("button", { name: "Eliminar plan" }));
    const dialogo = screen.getByText("¿Eliminar el plan de pago completo?").parentElement!;
    expect(dialogo).toHaveTextContent("Se van a borrar el plan y sus 0 cuotas.");
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(a.eliminarPlan).toHaveBeenCalled();
  });

  it("un vendedor no ve 'Eliminar plan' pero sí 'Editar plan'", async () => {
    const { user } = renderGrid({ rol: "vendedor" });
    const d = await abrirU1(user);
    expect(within(d).queryByRole("button", { name: "Eliminar plan" })).not.toBeInTheDocument();
    expect(within(d).getByRole("button", { name: "Editar plan" })).toBeInTheDocument();
  });

  it("click de nuevo en la fila la colapsa", async () => {
    const { user } = renderGrid();
    await abrirU1(user);
    await user.click(within(fila("MOV-UNIDAD-2026-001")).getByText("Ana Pérez"));
    expect(screen.queryByTestId("detalle-u1|USD")).not.toBeInTheDocument();
  });
});

describe("PlanesUnidadGrid — pagos a proveedores (pagos directos)", () => {
  const pagoProv = (over: Partial<AcuerdoConDetalle>) =>
    plan({ tipo: "pago", concepto: "fabrica", contraparte: "Heshi", cuotas: [], movimientos: [], ...over });
  // Pagado: un movimiento por el total.
  const FABRICA = pagoProv({
    id: "p1",
    descripcion: "Primera cuota fábrica",
    totalAcordado: 9000,
    notas: "Transferencia SWIFT",
    cuotas: [{ id: "c1", descripcion: "Primera cuota fábrica", importe: 9000, vencimiento: "2026-09-10T00:00:00.000Z", estado: "pagado" }],
    movimientos: [pago("x1", 9000, "2026-09-10T00:00:00.000Z", "c1", { comprobanteSignedUrl: "https://x/factura.pdf" })],
  });
  // Pendiente con fecha futura.
  const SEGURO = pagoProv({
    id: "p2",
    concepto: "seguro",
    contraparte: "La Caja",
    totalAcordado: 500,
    cuotas: [{ id: "c2", descripcion: "Seguro", importe: 500, vencimiento: "2026-12-01T00:00:00.000Z", estado: "pendiente" }],
  });
  // Pendiente vencido, en otra fecha más vieja.
  const FLETE = pagoProv({
    id: "p3",
    concepto: "flete",
    contraparte: "Naviera Sur",
    totalAcordado: 3200,
    cuotas: [{ id: "c3", descripcion: "Flete", importe: 3200, vencimiento: "2026-08-01T00:00:00.000Z", estado: "pendiente" }],
  });
  // Formato anterior: varias cuotas, pago parcial.
  const LEGADO = pagoProv({
    id: "p4",
    contraparte: "Despachante Gómez",
    concepto: "despachante",
    totalAcordado: 1000,
    cuotas: [
      { id: "c4", descripcion: "Anticipo", importe: 500, vencimiento: null, estado: "pagado" },
      { id: "c5", descripcion: "Saldo", importe: 500, vencimiento: null, estado: "pendiente" },
    ],
    movimientos: [pago("x4", 500, "2026-07-01T00:00:00.000Z", "c4")],
  });

  function renderPagos(rol = "admin") {
    return renderGrid({ tipo: "pago", rol, filas: filasPorUnidad(UNIDADES, [FABRICA, SEGURO, FLETE, LEGADO], AHORA) });
  }

  async function abrirU1(user: ReturnType<typeof userEvent.setup>) {
    await user.click(within(fila("MOV-UNIDAD-2026-001")).getByText("Ana Pérez"));
    return screen.getByTestId("detalle-u1|USD");
  }

  it("columnas de pagos y estado con el vocabulario de pagos", () => {
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
    const f = fila("MOV-UNIDAD-2026-001");
    expect(f).toHaveTextContent("Heshi, La Caja, Naviera Sur, Despachante Gómez");
    expect(f).toHaveTextContent("USD 13.700");
    expect(f).toHaveTextContent("Parcial");
    expect(fila("MOV-UNIDAD-2026-003")).toHaveTextContent("Sin pagos");
  });

  it("acciones de la fila: '+ Pago' (sin 'Registrar pago') y botón '+ Nuevo pago a proveedor'", async () => {
    const { user, acciones: a } = renderPagos();
    const f = fila("MOV-UNIDAD-2026-001");
    expect(within(f).queryByRole("button", { name: "Registrar pago" })).not.toBeInTheDocument();
    await user.click(within(f).getByRole("button", { name: "+ Pago" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith("u1");
    await user.click(screen.getAllByRole("button", { name: "+ Nuevo pago a proveedor" })[0]);
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith();
  });

  it("filtros con el vocabulario de pagos", () => {
    renderPagos();
    const opciones = Array.from((screen.getByLabelText("Filtrar por estado") as HTMLSelectElement).options).map((o) => o.text);
    expect(opciones).toContain("Sin pagos");
    expect(opciones).toContain("Con pagos vencidos");
    expect(opciones).not.toContain("Sin plan");
  });

  it("detalle: lista de pagos del más reciente al más viejo, con estado, comprobante y notas", async () => {
    const { user } = renderPagos();
    const d = await abrirU1(user);
    expect(within(d).getByText("Total", { selector: "p" }).nextElementSibling).toHaveTextContent("USD 13.700");
    expect(within(d).getByText("Pagado", { selector: "p" }).nextElementSibling).toHaveTextContent("USD 9.500");
    expect(within(d).getByText("Pendiente", { selector: "p" }).nextElementSibling).toHaveTextContent("USD 4.200");
    const filas = within(d).getAllByRole("row").slice(1);
    expect(filas.map((r) => (r as HTMLTableRowElement).cells[1].textContent)).toEqual(["La Caja", "Heshi", "Naviera Sur", "Despachante Gómez"]);
    expect(filas[0]).toHaveTextContent("1/12/2026");
    expect(filas[0]).toHaveTextContent("Seguro");
    expect(filas[0]).toHaveTextContent("Pendiente");
    expect(filas[1]).toHaveTextContent("Primera cuota fábrica");
    expect(filas[1]).toHaveTextContent("Pagado");
    expect(filas[1]).toHaveTextContent("Transferencia");
    expect(filas[1]).toHaveTextContent("Transferencia SWIFT");
    expect(within(filas[1]).getByRole("link", { name: "Ver" })).toHaveAttribute("href", "https://x/factura.pdf");
    expect(filas[2]).toHaveTextContent("Vencido");
    expect(filas[3]).toHaveTextContent("Parcial");
    expect(filas[3]).toHaveTextContent("pagado USD 500");
  });

  it("cada pago tiene editar y eliminar; los del formato anterior no se editan", async () => {
    const { user, acciones: a } = renderPagos();
    const d = await abrirU1(user);
    const filas = within(d).getAllByRole("row").slice(1);
    await user.click(within(filas[1]).getByRole("button", { name: "Editar" }));
    expect(a.abrirEditarPlan).toHaveBeenCalledWith(FABRICA);
    expect(within(filas[3]).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(filas[3]).toHaveTextContent("Formato anterior");
    await user.click(within(filas[1]).getByRole("button", { name: "Eliminar" }));
    const dialogo = screen.getByText("¿Eliminar este pago a proveedor?").parentElement!;
    expect(dialogo).toHaveTextContent("Se borra el pago y su comprobante registrado.");
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(a.eliminarPlan).toHaveBeenCalledWith(FABRICA);
    await user.click(within(filas[0]).getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("¿Eliminar este pago a proveedor?").parentElement).not.toHaveTextContent("comprobante");
  });

  it("un vendedor no ve 'Eliminar'", async () => {
    const { user } = renderPagos("vendedor");
    const d = await abrirU1(user);
    expect(within(d).queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("unidad sin pagos", async () => {
    const { user, acciones: a } = renderPagos();
    await user.click(within(fila("MOV-UNIDAD-2026-003")).getByText("Carla Ruiz"));
    const d = screen.getByTestId("detalle-u3|USD");
    expect(d).toHaveTextContent("Todavía no hay pagos a proveedores cargados para esta unidad.");
    await user.click(within(d).getByRole("button", { name: "+ Nuevo pago a proveedor" }));
    expect(a.abrirNuevoPlan).toHaveBeenCalledWith("u3");
  });

  it("exporta pagos.xlsx", async () => {
    const { user } = renderPagos();
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    expect(mockWriteFile).toHaveBeenCalledWith(expect.anything(), "pagos.xlsx");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
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

  it("grilla compacta: solo Unidad, Cliente, Total, Cobrado, Saldo, %, Estado y Acciones", () => {
    renderGrid();
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Unidad", "Cliente", "Total", "Cobrado", "Saldo", "%", "Estado", "Acciones"]);
    expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ })).toHaveLength(3);
  });

  it("en mobile se ocultan Total, Cobrado y % (quedan las columnas esenciales)", () => {
    renderGrid();
    const ocultas = screen
      .getAllByRole("columnheader")
      .filter((h) => h.className.includes("hidden md:table-cell"))
      .map((h) => h.textContent);
    expect(ocultas).toEqual(["Total", "Cobrado", "%"]);
  });

  it("fila: modelo bajo la unidad, total del plan, cobrado con último pago dd/mm, saldo, %, estado chico", () => {
    renderGrid();
    const f = fila("MOV-UNIDAD-2026-001");
    expect(f).toHaveTextContent("Flex 38");
    expect(f).toHaveTextContent("USD 24.700");
    expect(within(f).getByRole("button", { name: /USD 9.410/ })).toHaveTextContent("últ. 20/09");
    expect(f).toHaveTextContent("USD 15.290");
    expect(within(f).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "38");
    expect(within(f).getByText("En curso").className).toContain("text-[11px]");
    expect(f).toHaveTextContent("Vencida");
    expect(screen.getByRole("link", { name: "MOV-UNIDAD-2026-001" })).toHaveAttribute("href", "/admin/unidades/u1");
  });

  it("click en el monto cobrado despliega el detalle con los pagos recibidos (sin otra acción)", async () => {
    // requestAnimationFrame corre en el próximo frame (con el detalle ya
    // renderizado) — se encolan y se ejecutan después del click.
    const frames: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    try {
      const { user, acciones: a } = renderGrid();
      await user.click(within(fila("MOV-UNIDAD-2026-001")).getByRole("button", { name: /USD 9.410/ }));
      const d = screen.getByTestId("detalle-u1|USD");
      expect(within(d).getByText("Pagos recibidos")).toBeInTheDocument();
      expect(a.abrirRegistrarPago).not.toHaveBeenCalled();
      frames.splice(0).forEach((cb) => cb(0));
      expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
      // Un segundo click no la colapsa (sigue mostrando los pagos).
      await user.click(within(fila("MOV-UNIDAD-2026-001")).getByRole("button", { name: /USD 9.410/ }));
      expect(screen.getByTestId("detalle-u1|USD")).toBeInTheDocument();
    } finally {
      raf.mockRestore();
      // @ts-expect-error -- limpiar el stub
      delete Element.prototype.scrollIntoView;
    }
  });

  it("unidad saldada y unidad sin plan", () => {
    renderGrid();
    expect(fila("MOV-UNIDAD-2026-002")).toHaveTextContent("Saldado");
    const sinPlan = fila("MOV-UNIDAD-2026-003");
    expect(sinPlan).toHaveTextContent("Sin plan");
    expect(sinPlan).toHaveTextContent("—");
    expect(within(sinPlan).queryByRole("button", { name: /USD/ })).not.toBeInTheDocument();
    // Sin plan pero con precio: el total muestra el valor de la unidad, atenuado.
    expect(fila("MOV-UNIDAD-2026-002")).toHaveTextContent("USD 15.000");
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

  it("filtro por estado: Todos | Sin plan | Pendiente | En curso | Saldado | Con cuotas vencidas", async () => {
    const { user } = renderGrid();
    const select = screen.getByLabelText("Filtrar por estado") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.text)).toEqual([
      "Todos los estados",
      "Sin plan",
      "Pendiente",
      "En curso",
      "Saldado",
      "Con cuotas vencidas",
    ]);
    const visibles = () => screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent);
    await user.selectOptions(select, "sin_plan");
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-003"]);
    await user.selectOptions(select, "en_curso");
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-001"]);
    await user.selectOptions(select, "vencidas");
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-001"]);
    await user.selectOptions(select, "saldado");
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-002"]);
  });

  it("un filtro que llega por URL y no está en la lista (con saldo) igual se muestra seleccionado", () => {
    renderGrid({ estadoInicial: "con_saldo" });
    const select = screen.getByLabelText("Filtrar por estado") as HTMLSelectElement;
    expect(select.value).toBe("con_saldo");
    expect(select.selectedOptions[0].text).toBe("Con saldo pendiente");
  });

  it("filtro por período: solo unidades con pagos en el rango, y Cobrado muestra lo del período", async () => {
    // AHORA = 7/10/2026 → "Este mes" = octubre, "Mes anterior" = septiembre.
    const { user } = renderGrid({ ahora: AHORA });
    const periodo = screen.getByLabelText("Filtrar por período") as HTMLSelectElement;
    expect(Array.from(periodo.options).map((o) => o.text)).toEqual([
      "Todo el historial",
      "Este mes",
      "Mes anterior",
      "Este trimestre",
      "Rango personalizado",
    ]);
    const visibles = () => screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent);

    await user.selectOptions(periodo, "mes_actual");
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-002"]); // pagó el 2/10
    expect(screen.getByRole("columnheader", { name: "Cobrado (período)" })).toBeInTheDocument();

    await user.selectOptions(periodo, "mes_anterior");
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-001"]);
    const cobrado = within(fila("MOV-UNIDAD-2026-001")).getByRole("button", { name: /USD 9.410/ });
    expect(cobrado).toHaveTextContent("2 pagos");

    await user.selectOptions(periodo, "trimestre"); // oct-dic
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-002"]);

    await user.selectOptions(periodo, "personalizado");
    // Rango incompleto → sin filtro.
    expect(visibles()).toHaveLength(3);
    await user.type(screen.getByLabelText("Desde"), "2026-09-10");
    await user.type(screen.getByLabelText("Hasta"), "2026-09-30");
    expect(visibles()).toEqual(["MOV-UNIDAD-2026-001"]);
    expect(within(fila("MOV-UNIDAD-2026-001")).getByRole("button", { name: /USD 2.000/ })).toHaveTextContent("1 pago");

    await user.selectOptions(periodo, "todo");
    expect(visibles()).toHaveLength(3);
    expect(screen.getByRole("columnheader", { name: "Cobrado" })).toBeInTheDocument();
  });

  it("buscador por cliente o número de unidad, y filtro de moneda", async () => {
    const { user } = renderGrid();
    await user.selectOptions(screen.getByLabelText("Filtrar por moneda"), "ARS");
    expect(screen.getByText("Ninguna unidad coincide con los filtros.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrar por moneda"), "todos");
    await user.type(screen.getByLabelText("Buscar"), "bruno");
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent)).toEqual(["MOV-UNIDAD-2026-002"])
    );
    await user.clear(screen.getByLabelText("Buscar"));
    await user.type(screen.getByLabelText("Buscar"), "2026-003");
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: /MOV-UNIDAD/ }).map((l) => l.textContent)).toEqual(["MOV-UNIDAD-2026-003"])
    );
  });

  it("exporta con el monto del período cuando hay un período elegido", async () => {
    const { user } = renderGrid({ ahora: AHORA });
    await user.selectOptions(screen.getByLabelText("Filtrar por período"), "mes_anterior");
    await user.click(screen.getByRole("button", { name: "Exportar Excel" }));
    const xlsx = await import("xlsx");
    const rows = (xlsx.utils.json_to_sheet as unknown as { mock: { calls: unknown[][] } }).mock.calls.at(-1)![0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ Unidad: "MOV-UNIDAD-2026-001", Cobrado: 9410, "Cobrado en el período": 9410, "Último pago": "20/09" });
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

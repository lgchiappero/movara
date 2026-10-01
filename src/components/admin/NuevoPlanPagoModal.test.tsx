import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./Toast";
import NuevoPlanPagoModal from "./NuevoPlanPagoModal";

const UNIDADES = [
  { id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana Pérez" },
  { id: "u2", numeroUnidad: "MOV-UNIDAD-2026-002", clienteNombre: "Bruno Díaz" },
  { id: "u3", numeroUnidad: "MOV-UNIDAD-2026-003", clienteNombre: "Carla Ruiz", tienePlanCobro: true },
];

const DATOS: Record<string, { nombre: string; precioCliente: number | null }> = {
  u1: { nombre: "Ana Pérez", precioCliente: 42000 },
  u2: { nombre: "Bruno Díaz", precioCliente: 55000 },
};

function respuestaUnidad(id: string) {
  const d = DATOS[id];
  return new Response(
    JSON.stringify({ ok: true, unidad: { id, numeroUnidad: null, precioCliente: d.precioCliente, cliente: { id: "c", nombre: d.nombre } } }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => respuestaUnidad(url.split("/").pop()!));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderModal(props: Partial<Parameters<typeof NuevoPlanPagoModal>[0]> = {}) {
  const user = userEvent.setup();
  const onCreated = vi.fn();
  render(
    <ToastProvider>
      <NuevoPlanPagoModal unidades={UNIDADES} onClose={() => {}} onCreated={onCreated} {...props} />
    </ToastProvider>
  );
  return { user, onCreated };
}

async function elegirUnidad(user: ReturnType<typeof userEvent.setup>, numero: string) {
  await user.click(document.body); // blur — el combobox se abre al enfocar
  await user.click(screen.getByPlaceholderText("Buscar por N° de unidad o cliente..."));
  await user.click(screen.getByRole("button", { name: new RegExp(numero) }));
}

const contraparte = () => screen.getByLabelText("Cliente") as HTMLInputElement;
const total = () => screen.getByLabelText(/Total acordado/) as HTMLInputElement;
const descripcionPlan = () => screen.getByLabelText("Descripción") as HTMLInputElement;
const descCuota = (n: number) => screen.getByLabelText(`Descripción de la cuota ${n}`) as HTMLInputElement;
const importeCuota = (n: number) => screen.getByLabelText(`Importe de la cuota ${n}`) as HTMLInputElement;
const tipoCuota = (n: number) => screen.getByLabelText(`Tipo de la cuota ${n}`) as HTMLSelectElement;

describe("NuevoPlanPagoModal — cobranza: autocompletado desde la unidad", () => {
  it("título 'Nuevo plan de pago' y label 'Cliente' (no 'contraparte')", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: "Nuevo plan de pago" })).toBeInTheDocument();
    expect(contraparte()).toBeInTheDocument();
    expect(screen.queryByLabelText("Concepto")).not.toBeInTheDocument();
  });

  it("al elegir una unidad completa cliente y total acordado", async () => {
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/unidades/u1");
    await waitFor(() => expect(contraparte().value).toBe("Ana Pérez"));
    expect(total().value).toBe("42000");
  });

  it("el total autocompletado es editable", async () => {
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await waitFor(() => expect(total().value).toBe("42000"));
    await user.clear(total());
    await user.type(total(), "40000");
    expect(total().value).toBe("40000");
  });

  it("cambiar de unidad reemplaza los datos; una respuesta vieja se descarta", async () => {
    let resolverU1: (r: Response) => void = () => {};
    fetchMock.mockImplementation((url: string) => {
      const id = url.split("/").pop()!;
      if (id === "u1") return new Promise<Response>((res) => (resolverU1 = res));
      return Promise.resolve(respuestaUnidad(id));
    });
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await elegirUnidad(user, "MOV-UNIDAD-2026-002");
    await waitFor(() => expect(contraparte().value).toBe("Bruno Díaz"));
    resolverU1(respuestaUnidad("u1"));
    await new Promise((r) => setTimeout(r, 0));
    expect(contraparte().value).toBe("Bruno Díaz");
    expect(total().value).toBe("55000");
  });

  it("autocompleta la unidad preseleccionada al abrir", async () => {
    renderModal({ unidadIdInicial: "u2" });
    await waitFor(() => expect(contraparte().value).toBe("Bruno Díaz"));
    expect(total().value).toBe("55000");
  });

  it("si la unidad no tiene precio o la API falla, deja los campos para cargar a mano", async () => {
    DATOS.u1.precioCliente = null;
    try {
      const { user } = renderModal();
      await elegirUnidad(user, "MOV-UNIDAD-2026-001");
      await waitFor(() => expect(contraparte().value).toBe("Ana Pérez"));
      expect(total().value).toBe("");
    } finally {
      DATOS.u1.precioCliente = 42000;
    }
  });

  it("si la API responde error o falla la red, no autocompleta", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(contraparte().value).toBe("");

    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await elegirUnidad(user, "MOV-UNIDAD-2026-002");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(contraparte().value).toBe("");
  });
});

describe("NuevoPlanPagoModal — un solo plan de pago por unidad", () => {
  it("no ofrece las unidades que ya tienen plan", async () => {
    const { user } = renderModal();
    await user.click(screen.getByPlaceholderText("Buscar por N° de unidad o cliente..."));
    expect(screen.queryByRole("button", { name: /MOV-UNIDAD-2026-003/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /MOV-UNIDAD-2026-001/ })).toBeInTheDocument();
  });

  it("si se abre preseleccionando una unidad con plan, avisa y no la preselecciona ni la consulta", () => {
    renderModal({ unidadIdInicial: "u3" });
    expect(screen.getByText(/ya tiene un plan de pago/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("NuevoPlanPagoModal — cuotas dinámicas", () => {
  it("arranca con una cuota 'Anticipo' y al agregar sugiere cuotas numeradas k/N", async () => {
    const { user } = renderModal();
    expect(descCuota(1).value).toBe("Anticipo");
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    expect(descCuota(2).value).toBe("Cuota 1/2");
    expect(descCuota(3).value).toBe("Cuota 2/2");
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    expect([descCuota(2).value, descCuota(3).value, descCuota(4).value]).toEqual(["Cuota 1/3", "Cuota 2/3", "Cuota 3/3"]);
  });

  it("quitar una cuota re-numera las restantes", async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    await user.click(screen.getByRole("button", { name: "Quitar cuota 2" }));
    expect(descCuota(2).value).toBe("Cuota 1/1");
  });

  it("tipo Saldo / Otro (texto libre) y descripción editable a mano", async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    await user.selectOptions(tipoCuota(2), "saldo");
    expect(descCuota(2).value).toBe("Saldo");
    await user.selectOptions(tipoCuota(2), "otro");
    await user.clear(descCuota(2));
    await user.type(descCuota(2), "Bonificación");
    expect(descCuota(2).value).toBe("Bonificación");
    await user.clear(descCuota(1));
    await user.type(descCuota(1), "Anticipo 30%");
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    expect(descCuota(1).value).toBe("Anticipo 30%");
  });

  it("muestra si la suma de cuotas coincide con el total", async () => {
    const { user } = renderModal();
    await user.type(total(), "1000");
    await user.type(importeCuota(1), "400");
    expect(screen.getByText(/Suma de cuotas: USD 400 — debe coincidir con USD 1.000/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    await user.type(importeCuota(2), "600");
    expect(screen.getByText(/Suma de cuotas: USD 1.000 ✓/)).toBeInTheDocument();
  });
});

describe("NuevoPlanPagoModal — validación y alta", () => {
  async function completarValido(user: ReturnType<typeof userEvent.setup>) {
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await waitFor(() => expect(total().value).toBe("42000"));
    await user.type(importeCuota(1), "12600");
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    await user.type(importeCuota(2), "29400");
    await user.type(screen.getByLabelText("Vencimiento de la cuota 2"), "2026-12-01");
  }

  it("valida que haya una unidad elegida", async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole("button", { name: "Crear plan de pago" }));
    expect(screen.getByText("Elegí una unidad")).toBeInTheDocument();
  });

  it("valida cliente, total, descripción e importe de cuotas, y la suma", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 })); // sin autocompletado
    const { user } = renderModal();
    const crear = () => user.click(screen.getByRole("button", { name: "Crear plan de pago" }));
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await crear();
    expect(screen.getByText("Falta el cliente")).toBeInTheDocument();
    await user.type(contraparte(), "Ana");
    await crear();
    expect(screen.getByText("El total acordado debe ser mayor a 0")).toBeInTheDocument();
    await user.type(total(), "1000");
    await user.clear(descCuota(1));
    await crear();
    expect(screen.getByText("Cada cuota necesita una descripción")).toBeInTheDocument();
    await user.type(descCuota(1), "Anticipo");
    await crear();
    expect(screen.getByText("Cada cuota necesita un importe mayor a 0")).toBeInTheDocument();
    await user.type(importeCuota(1), "500");
    await crear();
    expect(screen.getByText(/debe coincidir con el total acordado/, { selector: "p.text-red-600.text-xs" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/admin/cobranza/acuerdos", expect.anything());
  });

  it("la descripción del plan aparece en el resumen de confirmación", async () => {
    const { user } = renderModal();
    await user.type(descripcionPlan(), "Venta Flex 38 financiada");
    const resumen = screen.getByLabelText("Resumen del plan");
    expect(within(resumen).getByText("Venta Flex 38 financiada")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    expect(within(resumen).getByText(/Anticipo \+ 1 cuota · Total USD 0/)).toBeInTheDocument();
  });

  it("crea el plan de cobranza (concepto 'venta') con descripción y cuotas", async () => {
    const { user, onCreated } = renderModal();
    await completarValido(user);
    await user.type(descripcionPlan(), "Plan Ana");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, id: "a1" }), { status: 201 }));
    await user.click(screen.getByRole("button", { name: "Crear plan de pago" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const llamada = fetchMock.mock.calls.find((c) => c[0] === "/api/admin/cobranza/acuerdos")!;
    expect(JSON.parse(llamada[1].body)).toEqual({
      tipo: "cobro",
      unidadId: "u1",
      contraparte: "Ana Pérez",
      concepto: "venta",
      descripcion: "Plan Ana",
      moneda: "USD",
      totalAcordado: 42000,
      notas: null,
      cuotas: [
        { descripcion: "Anticipo", importe: 12600, vencimiento: null },
        { descripcion: "Cuota 1/1", importe: 29400, vencimiento: "2026-12-01" },
      ],
    });
  });

  it("muestra el error del servidor (ej: 409 la unidad ya tiene plan)", async () => {
    const { user, onCreated } = renderModal();
    await completarValido(user);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Esta unidad ya tiene un plan de pago." }), { status: 409 })
    );
    await user.click(screen.getByRole("button", { name: "Crear plan de pago" }));
    expect(await screen.findAllByText("Esta unidad ya tiene un plan de pago.")).not.toHaveLength(0);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("error de red al crear", async () => {
    const { user } = renderModal();
    await completarValido(user);
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await user.click(screen.getByRole("button", { name: "Crear plan de pago" }));
    expect(await screen.findAllByText("No pudimos crear el plan de pago. Probá de nuevo.")).not.toHaveLength(0);
  });
});

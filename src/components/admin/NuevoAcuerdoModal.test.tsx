import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./Toast";
import NuevoAcuerdoModal from "./NuevoAcuerdoModal";

const UNIDADES = [
  { id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana Pérez" },
  { id: "u2", numeroUnidad: "MOV-UNIDAD-2026-002", clienteNombre: "Bruno Díaz" },
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

function renderModal(props: Partial<Parameters<typeof NuevoAcuerdoModal>[0]> = {}) {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <NuevoAcuerdoModal tipo="cobro" unidades={UNIDADES} onClose={() => {}} onCreated={() => {}} {...props} />
    </ToastProvider>
  );
  return { user };
}

async function elegirUnidad(user: ReturnType<typeof userEvent.setup>, numero: string) {
  await user.click(document.body); // blur — el combobox se abre al enfocar
  await user.click(screen.getByPlaceholderText("Buscar por N° de unidad o cliente..."));
  await user.click(screen.getByRole("button", { name: new RegExp(numero) }));
}

const contraparte = () => screen.getByLabelText(/Cliente|Proveedor/) as HTMLInputElement;
const total = () => screen.getByLabelText(/Total acordado/) as HTMLInputElement;

describe("NuevoAcuerdoModal — autocompletado al elegir unidad", () => {
  it("cobro: pide la unidad a la API y completa cliente y total acordado", async () => {
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/unidades/u1");
    await waitFor(() => expect(contraparte().value).toBe("Ana Pérez"));
    expect(total().value).toBe("42000");
  });

  it("el total acordado sigue siendo editable después del autocompletado", async () => {
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await waitFor(() => expect(total().value).toBe("42000"));

    expect(total()).not.toBeDisabled();
    expect(total()).not.toHaveAttribute("readonly");
    await user.clear(total());
    await user.type(total(), "40000");
    expect(total().value).toBe("40000");
  });

  it("cambiar de unidad reemplaza los datos autocompletados", async () => {
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await waitFor(() => expect(contraparte().value).toBe("Ana Pérez"));

    await elegirUnidad(user, "MOV-UNIDAD-2026-002");
    await waitFor(() => expect(contraparte().value).toBe("Bruno Díaz"));
    expect(total().value).toBe("55000");
  });

  it("descarta una respuesta vieja si se eligió otra unidad mientras tanto", async () => {
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

  it("pago: no autocompleta proveedor ni monto", async () => {
    const { user } = renderModal({ tipo: "pago" });
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(contraparte().value).toBe("");
    expect(total().value).toBe("");
  });

  it("autocompleta la unidad preseleccionada al abrir el modal", async () => {
    renderModal({ unidadIdInicial: "u2" });
    await waitFor(() => expect(contraparte().value).toBe("Bruno Díaz"));
    expect(total().value).toBe("55000");
  });

  it("si la unidad no tiene precio, deja el total vacío", async () => {
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

  it("si la API responde error, deja los campos para completar a mano", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(contraparte().value).toBe("");
    expect(total().value).toBe("");
  });

  it("si el fetch falla por red, deja los campos para completar a mano", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    const { user } = renderModal();
    await elegirUnidad(user, "MOV-UNIDAD-2026-001");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(contraparte().value).toBe("");
    expect(total().value).toBe("");
  });
});

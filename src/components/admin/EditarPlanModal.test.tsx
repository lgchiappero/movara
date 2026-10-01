import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./Toast";
import EditarPlanModal from "./EditarPlanModal";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

const PLAN: AcuerdoConDetalle = {
  id: "a1",
  unidadId: "u1",
  unidadNumero: "MOV-UNIDAD-2026-001",
  unidadModelo: "Flex 38",
  unidadEstado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana",
  tipo: "cobro",
  concepto: "venta",
  descripcion: "Venta financiada",
  contraparte: "Ana",
  moneda: "USD",
  totalAcordado: 17410,
  notas: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  cuotas: [
    { id: "q1", descripcion: "Anticipo", importe: 7410, vencimiento: "2026-09-01T00:00:00.000Z", estado: "pagado" },
    { id: "q2", descripcion: "Cuota 1/2", importe: 5000, vencimiento: null, estado: "pendiente" },
    { id: "q3", descripcion: "Cuota 2/2", importe: 5000, vencimiento: null, estado: "pendiente" },
  ],
  movimientos: [
    {
      id: "m1",
      fecha: "2026-09-02T00:00:00.000Z",
      importe: 7410,
      modalidad: "transferencia",
      cuotaId: "q1",
      comprobanteUrl: null,
      comprobanteSignedUrl: null,
      notas: null,
      registradoPor: "a@x.com",
    },
  ],
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderModal() {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(
    <ToastProvider>
      <EditarPlanModal plan={PLAN} onClose={() => {}} onSaved={onSaved} />
    </ToastProvider>
  );
  return { user, onSaved };
}

const total = () => screen.getByLabelText(/Total acordado/) as HTMLInputElement;
const guardar = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Guardar cambios" }));

describe("EditarPlanModal", () => {
  it("precarga total, descripción y cuotas del plan", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: "Editar plan de pago" })).toBeInTheDocument();
    expect(total().value).toBe("17410");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Venta financiada");
    expect(screen.getByLabelText("Descripción de la cuota 1")).toHaveValue("Anticipo");
    expect(screen.getByLabelText("Vencimiento de la cuota 1")).toHaveValue("2026-09-01");
    expect(screen.getByText(/Suma de cuotas: USD 17.410 ✓/)).toBeInTheDocument();
  });

  it("una cuota con pagos registrados no se puede eliminar; las demás sí", () => {
    renderModal();
    expect(screen.getByText("Pagado USD 7.410")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar cuota 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar cuota 2" })).toBeInTheDocument();
  });

  it("cambiar el total, agregar una cuota y eliminar otra sin pagos → PATCH con la lista final de cuotas", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { user, onSaved } = renderModal();
    await user.clear(total());
    await user.type(total(), "20000");
    await user.click(screen.getByRole("button", { name: "Eliminar cuota 3" }));
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    expect(screen.getByLabelText("Descripción de la cuota 3")).toHaveValue("Cuota 3");
    await user.clear(screen.getByLabelText("Descripción de la cuota 3"));
    await user.type(screen.getByLabelText("Descripción de la cuota 3"), "Saldo");
    await user.type(screen.getByLabelText("Importe de la cuota 3"), "7590");
    await user.type(screen.getByLabelText("Vencimiento de la cuota 3"), "2027-01-15");
    await guardar(user);

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/cobranza/acuerdos/a1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      totalAcordado: 20000,
      descripcion: "Venta financiada",
      cuotas: [
        { id: "q1", descripcion: "Anticipo", importe: 7410, vencimiento: "2026-09-01" },
        { id: "q2", descripcion: "Cuota 1/2", importe: 5000, vencimiento: null },
        { descripcion: "Saldo", importe: 7590, vencimiento: "2027-01-15" },
      ],
    });
  });

  it("validaciones antes de enviar", async () => {
    const { user } = renderModal();
    await user.clear(total());
    await guardar(user);
    expect(screen.getByText("El total acordado debe ser mayor a 0")).toBeInTheDocument();
    await user.type(total(), "17410");
    await user.clear(screen.getByLabelText("Descripción de la cuota 2"));
    await guardar(user);
    expect(screen.getByText("Cada cuota necesita una descripción")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Descripción de la cuota 2"), "Cuota 1/2");
    await user.clear(screen.getByLabelText("Importe de la cuota 2"));
    await guardar(user);
    expect(screen.getByText("Cada cuota necesita un importe mayor a 0")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Importe de la cuota 2"), "5000");
    await user.clear(screen.getByLabelText("Importe de la cuota 1"));
    await user.type(screen.getByLabelText("Importe de la cuota 1"), "100");
    await guardar(user);
    expect(screen.getByText(/no puede ser menor a lo ya pagado \(USD 7.410\)/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Importe de la cuota 1"));
    await user.type(screen.getByLabelText("Importe de la cuota 1"), "8000");
    await guardar(user);
    expect(screen.getByText(/debe coincidir con el total acordado/, { selector: "p.text-xs" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("al quitar las cuotas sin pagos, la que tiene pagos queda", async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole("button", { name: "Eliminar cuota 3" }));
    await user.click(screen.getByRole("button", { name: "Eliminar cuota 2" }));
    // Queda la cuota con pagos, que no se puede quitar.
    expect(screen.getAllByLabelText(/Descripción de la cuota/)).toHaveLength(1);
  });

  it("muestra el error del servidor y el error de red", async () => {
    const { user, onSaved } = renderModal();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "No se puede eliminar la cuota" }), { status: 400 }));
    await guardar(user);
    expect(await screen.findAllByText("No se puede eliminar la cuota")).not.toHaveLength(0);
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await guardar(user);
    expect(await screen.findAllByText("No pudimos guardar el plan. Probá de nuevo.")).not.toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("descripción vacía se envía como null", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const { user } = renderModal();
    await user.clear(screen.getByLabelText("Descripción"));
    await guardar(user);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).descripcion).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./Toast";
import RegistrarMovimientoModal from "./RegistrarMovimientoModal";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

function movimiento(id: string, cuotaId: string | null, importe: number) {
  return {
    id,
    fecha: "2026-09-01T00:00:00.000Z",
    importe,
    modalidad: "transferencia",
    cuotaId,
    comprobanteUrl: null,
    comprobanteSignedUrl: null,
    notas: null,
    registradoPor: "admin@movara.com.ar",
  };
}

const ACUERDO: AcuerdoConDetalle = {
  id: "a1",
  unidadId: "u1",
  unidadNumero: "MOV-UNIDAD-2026-001",
  unidadModelo: "Flex 38",
  unidadEstado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana Pérez",
  tipo: "cobro",
  concepto: "anticipo",
  descripcion: null,
  contraparte: "Ana Pérez",
  moneda: "USD",
  totalAcordado: 24700,
  notas: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  cuotas: [
    { id: "q1", descripcion: "Anticipo 30%", importe: 7410, vencimiento: null, estado: "pendiente" },
    { id: "q2", descripcion: "Cuota 1/3", importe: 5000, vencimiento: null, estado: "pendiente" },
    { id: "q3", descripcion: "Cuota 2/3", importe: 5000, vencimiento: null, estado: "pagado" },
    { id: "q4", descripcion: "Saldo final", importe: 7290, vencimiento: null, estado: "vencido" },
  ],
  movimientos: [movimiento("m1", "q2", 3000), movimiento("m2", "q3", 5000)],
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderModal(acuerdo: AcuerdoConDetalle = ACUERDO) {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(
    <ToastProvider>
      <RegistrarMovimientoModal acuerdo={acuerdo} onClose={() => {}} onSaved={onSaved} />
    </ToastProvider>
  );
  return { user, onSaved };
}

const selectorCuota = () => screen.getByLabelText(/Cuota que salda/) as HTMLSelectElement;
const importe = () => screen.getByLabelText(/Importe/) as HTMLInputElement;

describe("RegistrarMovimientoModal — cuota que salda", () => {
  it("lista las cuotas impagas con descripción, importe y estado, sin las pagadas", () => {
    renderModal();
    expect(Array.from(selectorCuota().options).map((o) => o.text)).toEqual([
      "Sin cuota específica",
      "Anticipo 30% — USD 7.410 — Pendiente",
      "Cuota 1/3 — USD 5.000 — Parcial (resta USD 2.000)",
      "Saldo final — USD 7.290 — Vencida",
    ]);
  });

  it("si el acuerdo no tiene cuotas, solo ofrece 'Sin cuota específica'", () => {
    renderModal({ ...ACUERDO, cuotas: [], movimientos: [] });
    expect(Array.from(selectorCuota().options).map((o) => o.text)).toEqual(["Sin cuota específica"]);
  });

  it("al elegir una cuota precompleta el importe con lo que resta", async () => {
    const { user } = renderModal();
    await user.selectOptions(selectorCuota(), "q2");
    expect(importe().value).toBe("2000");
  });

  it("no pisa un importe ya escrito", async () => {
    const { user } = renderModal();
    await user.type(importe(), "1500");
    await user.selectOptions(selectorCuota(), "q1");
    expect(importe().value).toBe("1500");
  });

  it("envía la cuota elegida al registrar el movimiento", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "m9" }), { status: 201 }));
    const { user, onSaved } = renderModal();
    await user.selectOptions(selectorCuota(), "q1");
    await user.click(screen.getByRole("button", { name: "Registrar pago recibido" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/cobranza/acuerdos/a1/movimientos");
    const form = init.body as FormData;
    expect(form.get("cuotaId")).toBe("q1");
    expect(form.get("importe")).toBe("7410");
  });

  it("'Sin cuota específica' no envía cuotaId", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "m9" }), { status: 201 }));
    const { user, onSaved } = renderModal();
    await user.type(importe(), "1000");
    await user.click(screen.getByRole("button", { name: "Registrar pago recibido" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect((fetchMock.mock.calls[0][1].body as FormData).has("cuotaId")).toBe(false);
  });
});

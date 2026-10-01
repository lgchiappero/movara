import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }) }));

import { ToastProvider } from "@/components/admin/Toast";
import { useAccionesPlanes, type AccionesPlanes } from "./useAccionesPlanes";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

const PAGO = {
  id: "m1",
  fecha: "2026-09-05T00:00:00.000Z",
  importe: 100,
  modalidad: "transferencia",
  cuotaId: null,
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: null,
  registradoPor: "a@x.com",
};
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
  descripcion: null,
  contraparte: "Ana",
  moneda: "USD",
  totalAcordado: 1000,
  notas: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  cuotas: [],
  movimientos: [PAGO],
};

function Harness({ onAcciones }: { onAcciones: (a: AccionesPlanes) => void }) {
  const r = useAccionesPlanes({ tipo: "cobro", unidades: [{ id: "u1", numeroUnidad: "MOV-1", clienteNombre: "Ana" }] });
  onAcciones(r.acciones);
  return (
    <>
      <button onClick={() => r.acciones.abrirNuevoPlan("u1")}>nuevo</button>
      <button onClick={() => r.acciones.abrirRegistrarPago(PLAN)}>registrar</button>
      <button onClick={() => r.acciones.abrirEditarPago(PLAN, PAGO)}>editar</button>
      {r.modales}
    </>
  );
}

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  mockRefresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderHarness() {
  const user = userEvent.setup();
  const capturadas: AccionesPlanes[] = [];
  render(
    <ToastProvider>
      <Harness onAcciones={(a) => capturadas.push(a)} />
    </ToastProvider>
  );
  return { user, acciones: () => capturadas[capturadas.length - 1] };
}

describe("useAccionesPlanes", () => {
  it("abre y cierra el modal de nuevo plan con la unidad preseleccionada", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const { user } = renderHarness();
    await user.click(screen.getByText("nuevo"));
    expect(screen.getByRole("heading", { name: "Nuevo plan de pago" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/unidades/u1");
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("heading", { name: "Nuevo plan de pago" })).not.toBeInTheDocument();
  });

  it("abre el modal de registrar pago y refresca al guardar", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "m2" }), { status: 201 }));
    const { user } = renderHarness();
    await user.click(screen.getByText("registrar"));
    await user.type(screen.getByLabelText(/Importe/), "50");
    await user.click(screen.getByRole("button", { name: "Registrar pago recibido" }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByLabelText(/Cuota que salda/)).not.toBeInTheDocument();
  });

  it("abre el modal de editar pago y lo cierra", async () => {
    const { user } = renderHarness();
    await user.click(screen.getByText("editar"));
    expect(screen.getByDisplayValue("100")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByDisplayValue("100")).not.toBeInTheDocument();
  });

  it("eliminarPago / eliminarPlan llaman al DELETE correcto y devuelven el error del servidor", async () => {
    const { acciones: ultimas } = renderHarness();
    const acciones = ultimas();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    expect(await acciones.eliminarPago(PLAN, PAGO)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/cobranza/acuerdos/a1/movimientos/m1", { method: "DELETE" });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "tiene pagos" }), { status: 400 }));
    expect(await acciones.eliminarPlan(PLAN)).toEqual({ ok: false, error: "tiene pagos" });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/cobranza/acuerdos/a1", { method: "DELETE" });

    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    expect(await acciones.eliminarPlan(PLAN)).toEqual({ ok: false, error: "No pudimos eliminar. Probá de nuevo." });
  });
});

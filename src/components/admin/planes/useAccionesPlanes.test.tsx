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

function Harness({ onAcciones, tipo = "cobro" }: { onAcciones: (a: AccionesPlanes) => void; tipo?: "cobro" | "pago" }) {
  const r = useAccionesPlanes({ tipo, unidades: [{ id: "u1", numeroUnidad: "MOV-1", clienteNombre: "Ana" }] });
  onAcciones(r.acciones);
  return (
    <>
      <button onClick={() => r.acciones.abrirNuevoPlan("u1")}>nuevo</button>
      <button onClick={() => r.acciones.abrirRegistrarPago(PLAN)}>registrar</button>
      <button onClick={() => r.acciones.abrirEditarPago(PLAN, PAGO)}>editar</button>
      <button onClick={() => r.acciones.abrirEditarPlan(tipo === "pago" ? PAGO_PROVEEDOR : PLAN)}>editar plan</button>
      {r.modales}
    </>
  );
}

const PAGO_PROVEEDOR: AcuerdoConDetalle = {
  ...PLAN,
  id: "p1",
  tipo: "pago",
  concepto: "flete",
  contraparte: "Naviera Sur",
  totalAcordado: 3200,
  cuotas: [{ id: "c1", descripcion: "Flete", importe: 3200, vencimiento: "2026-10-01T00:00:00.000Z", estado: "pendiente" }],
  movimientos: [],
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  mockRefresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderHarness(tipo: "cobro" | "pago" = "cobro") {
  const user = userEvent.setup();
  const capturadas: AccionesPlanes[] = [];
  render(
    <ToastProvider>
      <Harness tipo={tipo} onAcciones={(a) => capturadas.push(a)} />
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

  it("cobro: 'editar plan' abre el modal de edición del plan", async () => {
    const { user } = renderHarness();
    await user.click(screen.getByText("editar plan"));
    expect(screen.getByRole("heading", { name: "Editar plan de pago" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("heading", { name: "Editar plan de pago" })).not.toBeInTheDocument();
  });

  it("pago: 'nuevo' abre 'Nuevo pago a proveedor' (sin cuotas) y 'editar plan' lo abre en modo edición", async () => {
    const { user } = renderHarness("pago");
    await user.click(screen.getByText("nuevo"));
    expect(screen.getByRole("heading", { name: "Nuevo pago a proveedor" })).toBeInTheDocument();
    expect(screen.queryByText("+ Agregar cuota")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    await user.click(screen.getByText("editar plan"));
    expect(screen.getByRole("heading", { name: "Editar pago a proveedor" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Naviera Sur")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("heading", { name: "Editar pago a proveedor" })).not.toBeInTheDocument();
  });

  it("pago: guardar el pago refresca y cierra el modal", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { user } = renderHarness("pago");
    await user.click(screen.getByText("editar plan"));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Editar pago a proveedor" })).not.toBeInTheDocument();
  });

  it("cobro: guardar el plan editado refresca y cierra el modal", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { user } = renderHarness();
    await user.click(screen.getByText("editar plan"));
    await user.click(screen.getByRole("button", { name: "+ Agregar cuota" }));
    await user.type(screen.getByLabelText("Importe de la cuota 1"), "1000");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("pago: guardar un pago nuevo refresca y cierra el modal", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "p9" }), { status: 201 }));
    const { user } = renderHarness("pago");
    await user.click(screen.getByText("nuevo"));
    await user.type(screen.getByLabelText("Proveedor"), "Heshi");
    await user.type(screen.getByLabelText("Importe"), "9000");
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Nuevo pago a proveedor" })).not.toBeInTheDocument();
  });
});

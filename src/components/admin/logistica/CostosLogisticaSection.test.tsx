import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockRefresh } = vi.hoisted(() => ({ mockRefresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }) }));

import { ToastProvider } from "@/components/admin/Toast";
import CostosLogisticaSection from "./CostosLogisticaSection";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";

const base: CostoLogisticaRow = {
  id: "c1",
  envioId: "e1",
  envioNumeroPI: "PI-001",
  envioContenedor: "MSCU1",
  concepto: "flete",
  descripcion: "Shanghai → BA",
  moneda: "USD",
  importe: 4200,
  fecha: "2026-09-01T00:00:00.000Z",
  estado: "pagado",
  comprobanteUrl: "logistica/e1/f.pdf",
  comprobanteSignedUrl: "https://signed/f.pdf",
  notas: null,
  prorrateado: true,
  prorrateos: [
    { unidadId: "u1", unidadNumero: "MOV-1", importe: 2100 },
    { unidadId: "u2", unidadNumero: "MOV-2", importe: 2100 },
  ],
  createdAt: "2026-09-01T00:00:00.000Z",
};
const COSTOS: CostoLogisticaRow[] = [
  base,
  { ...base, id: "c2", concepto: "vep", descripcion: null, moneda: "ARS", importe: 150000, estado: "pendiente", fecha: "2026-09-20T00:00:00.000Z", comprobanteUrl: null, comprobanteSignedUrl: null, prorrateado: false, prorrateos: [] },
];

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  mockRefresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderSeccion(rol = "admin", costos = COSTOS) {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <CostosLogisticaSection envio={{ id: "e1", numeroPI: "PI-001", numeroContenedor: "MSCU1", cantidadUnidades: 2 }} costos={costos} rol={rol} />
    </ToastProvider>
  );
  return { user };
}

describe("CostosLogisticaSection (en /admin/envios/[id])", () => {
  it("totales pagado y pendiente en USD y ARS", () => {
    renderSeccion();
    expect(screen.getByRole("heading", { name: "Costos de logística internacional" })).toBeInTheDocument();
    const pagado = screen.getByText("Total pagado").parentElement!;
    expect(pagado).toHaveTextContent("USD 4.200");
    expect(pagado).toHaveTextContent("ARS 0");
    const pendiente = screen.getByText("Pendiente", { selector: "p" }).parentElement!;
    expect(pendiente).toHaveTextContent("ARS 150.000");
  });

  it("lista de costos del más reciente al más viejo, sin columnas de envío, con prorrateo y comprobante", () => {
    renderSeccion();
    expect(screen.queryByRole("columnheader", { name: "Envío (PI)" })).not.toBeInTheDocument();
    const filas = screen.getAllByRole("row").slice(1);
    expect(filas[0]).toHaveTextContent("VEP");
    expect(filas[0]).toHaveTextContent("ARS 150.000");
    expect(filas[0]).toHaveTextContent("Pendiente");
    expect(filas[0]).toHaveTextContent("20/09/2026");
    expect(filas[1]).toHaveTextContent("Flete marítimo");
    expect(filas[1]).toHaveTextContent("Shanghai → BA");
    expect(within(filas[1]).getByText("Prorrateado ÷2")).toHaveAttribute("title", "MOV-1: USD 2.100\nMOV-2: USD 2.100");
    expect(within(filas[1]).getByRole("link", { name: "Comprobante" })).toHaveAttribute("href", "https://signed/f.pdf");
  });

  it("'+ Nuevo costo de logística' abre el modal con el envío fijo", async () => {
    const { user } = renderSeccion();
    await user.click(screen.getByRole("button", { name: "+ Nuevo costo de logística" }));
    expect(screen.getByRole("heading", { name: "Nuevo costo de logística" })).toBeInTheDocument();
    expect(screen.getByText("PI-001 · MSCU1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("heading", { name: "Nuevo costo de logística" })).not.toBeInTheDocument();
  });

  it("guardar un costo nuevo refresca la página", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, id: "c9" }), { status: 201 }));
    const { user } = renderSeccion();
    await user.click(screen.getByRole("button", { name: "+ Nuevo costo de logística" }));
    await user.type(screen.getByLabelText("Importe total"), "10");
    await user.click(screen.getByRole("button", { name: "Registrar costo" }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("editar y eliminar (con aviso de prorrateo); el error del servidor se muestra", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { user } = renderSeccion();
    const flete = screen.getAllByRole("row")[2];
    await user.click(within(flete).getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: "Editar costo de logística" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());

    await user.click(within(flete).getByRole("button", { name: "Eliminar" }));
    const dialogo = screen.getByText("¿Eliminar este costo de logística?").parentElement!;
    expect(dialogo).toHaveTextContent("Se borra el costo y su prorrateo entre las unidades.");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "período cerrado" }), { status: 400 }));
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText("período cerrado")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin/logistica/c1", { method: "DELETE" });

    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText("No pudimos eliminar. Probá de nuevo.")).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByText("Costo eliminado")).toBeInTheDocument();
  });

  it("un vendedor no ve 'Eliminar'", () => {
    renderSeccion("vendedor");
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("eliminar un costo sin prorrateo no avisa del reparto", async () => {
    const { user } = renderSeccion();
    await user.click(within(screen.getAllByRole("row")[1]).getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("¿Eliminar este costo de logística?").parentElement).toHaveTextContent("Esta acción no se puede deshacer.");
    expect(screen.getByText("¿Eliminar este costo de logística?").parentElement).not.toHaveTextContent("prorrateo");
  });

  it("sin costos", () => {
    renderSeccion("admin", []);
    expect(screen.getByText("Todavía no hay costos de logística internacional cargados.")).toBeInTheDocument();
  });
});

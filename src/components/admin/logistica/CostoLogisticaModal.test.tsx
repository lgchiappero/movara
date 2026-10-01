import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/admin/Toast";
import CostoLogisticaModal from "./CostoLogisticaModal";
import type { CostoLogisticaRow } from "@/lib/cobranza/logistica";

const ENVIOS = [
  { id: "e1", numeroPI: "PI-001", numeroContenedor: "MSCU1234567", cantidadUnidades: 3 },
  { id: "e2", numeroPI: null, numeroContenedor: null, cantidadUnidades: 0 },
];

const COSTO: CostoLogisticaRow = {
  id: "c1",
  envioId: "e1",
  envioNumeroPI: "PI-001",
  envioContenedor: "MSCU1234567",
  concepto: "aduana",
  descripcion: "Liquidación",
  moneda: "ARS",
  importe: 90000,
  fecha: "2026-09-12T00:00:00.000Z",
  estado: "pendiente",
  comprobanteUrl: null,
  comprobanteSignedUrl: null,
  notas: "Nota",
  prorrateado: true,
  prorrateos: [],
  createdAt: "2026-09-12T00:00:00.000Z",
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "c9" }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderModal(props: Partial<Parameters<typeof CostoLogisticaModal>[0]> = {}) {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(
    <ToastProvider>
      <CostoLogisticaModal envios={ENVIOS} onClose={() => {}} onSaved={onSaved} {...props} />
    </ToastProvider>
  );
  return { user, onSaved };
}

const form = () => fetchMock.mock.calls[0][1].body as FormData;

async function elegirEnvio(user: ReturnType<typeof userEvent.setup>, texto: RegExp) {
  await user.click(screen.getByPlaceholderText("Buscar por PI o contenedor..."));
  await user.click(screen.getByRole("button", { name: texto }));
}

describe("CostoLogisticaModal — nuevo costo", () => {
  it("campos pedidos y los 7 conceptos de logística internacional", () => {
    renderModal();
    expect(screen.getByRole("heading", { name: "Nuevo costo de logística" })).toBeInTheDocument();
    for (const l of ["Concepto", "Descripción", "Moneda", "Importe total", "Fecha de pago", "Notas"]) {
      expect(screen.getByLabelText(l)).toBeInTheDocument();
    }
    expect(Array.from((screen.getByLabelText("Concepto") as HTMLSelectElement).options).map((o) => o.text)).toEqual([
      "Flete marítimo",
      "Seguro de carga",
      "Aduana",
      "Despachante",
      "Gastos portuarios",
      "VEP",
      "Otro",
    ]);
    expect(screen.getByRole("radio", { name: "Pagado" })).toBeChecked();
    expect(screen.getByLabelText(/Comprobante/)).toBeInTheDocument();
    expect(screen.getByText("Elegí un envío para ver el reparto.")).toBeInTheDocument();
  });

  it("busca envíos por PI o contenedor y muestra el reparto del prorrateo", async () => {
    const { user } = renderModal();
    await user.click(screen.getByPlaceholderText("Buscar por PI o contenedor..."));
    await user.type(screen.getByPlaceholderText("Buscar por PI o contenedor..."), "MSCU");
    await waitFor(() => expect(screen.getAllByRole("button", { name: /PI-001 · MSCU1234567 \(3 unidades\)/ })).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: /PI-001/ }));
    await user.type(screen.getByLabelText("Importe total"), "4200");
    expect(screen.getByText("USD 4.200 ÷ 3 unidades = USD 1.400 c/u")).toBeInTheDocument();
  });

  it("valida envío, importe, fecha y que haya unidades para prorratear", async () => {
    const { user } = renderModal();
    const registrar = () => user.click(screen.getByRole("button", { name: "Registrar costo" }));
    await registrar();
    expect(screen.getByText("Elegí un envío")).toBeInTheDocument();
    await elegirEnvio(user, /Sin PI/);
    expect(screen.getByText("El envío no tiene unidades asignadas.")).toBeInTheDocument();
    await registrar();
    expect(screen.getByText("El importe debe ser mayor a 0")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Importe total"), "100");
    await user.clear(screen.getByLabelText("Fecha de pago"));
    await registrar();
    expect(screen.getByText("Falta la fecha del pago")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Fecha de pago"), "2026-09-01");
    await user.click(screen.getByLabelText(/Prorratear entre unidades del envío/));
    await registrar();
    expect(screen.getByText("El envío no tiene unidades para prorratear el costo")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registra con POST multipart (prorrateo y comprobante incluidos)", async () => {
    const { user, onSaved } = renderModal();
    await elegirEnvio(user, /PI-001/);
    await user.selectOptions(screen.getByLabelText("Concepto"), "portuarios");
    await user.type(screen.getByLabelText("Descripción"), "Terminal 4");
    await user.type(screen.getByLabelText("Importe total"), "1500");
    await user.clear(screen.getByLabelText("Fecha de pago"));
    await user.type(screen.getByLabelText("Fecha de pago"), "2026-09-05");
    await user.click(screen.getByLabelText(/Prorratear entre unidades del envío/));
    await user.upload(screen.getByLabelText(/Comprobante/), new File(["%PDF"], "t4.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "Registrar costo" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/logistica");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(Object.fromEntries([...form().entries()].filter(([k]) => k !== "comprobante"))).toEqual({
      envioId: "e1",
      concepto: "portuarios",
      descripcion: "Terminal 4",
      moneda: "USD",
      importe: "1500",
      fecha: "2026-09-05",
      estado: "pagado",
      notas: "",
      prorratear: "true",
    });
    expect((form().get("comprobante") as File).name).toBe("t4.pdf");
  });

  it("con el envío fijo (desde el envío) no pide elegirlo; pendiente no envía comprobante", async () => {
    const { user } = renderModal({ envioIdInicial: "e1" });
    expect(screen.queryByPlaceholderText("Buscar por PI o contenedor...")).not.toBeInTheDocument();
    expect(screen.getByText("PI-001 · MSCU1234567")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Importe total"), "10");
    await user.click(screen.getByRole("radio", { name: "Pendiente" }));
    expect(screen.queryByLabelText(/Comprobante/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Registrar costo" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(form().get("estado")).toBe("pendiente");
    expect(form().has("comprobante")).toBe(false);
  });

  it("muestra el error del servidor y el de red", async () => {
    const { user, onSaved } = renderModal({ envioIdInicial: "e1" });
    await user.type(screen.getByLabelText("Importe total"), "10");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Ese período ya está cerrado" }), { status: 400 }));
    await user.click(screen.getByRole("button", { name: "Registrar costo" }));
    expect(await screen.findAllByText("Ese período ya está cerrado")).not.toHaveLength(0);
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await user.click(screen.getByRole("button", { name: "Registrar costo" }));
    expect(await screen.findAllByText("No pudimos guardar el costo. Probá de nuevo.")).not.toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("CostoLogisticaModal — editar", () => {
  it("precarga el costo y guarda con PATCH (sin envioId)", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { user, onSaved } = renderModal({ costo: COSTO });
    expect(screen.getByRole("heading", { name: "Editar costo de logística" })).toBeInTheDocument();
    expect(screen.getByLabelText("Concepto")).toHaveValue("aduana");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Liquidación");
    expect(screen.getByLabelText("Moneda")).toHaveValue("ARS");
    expect(screen.getByLabelText("Importe total")).toHaveValue(90000);
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-09-12");
    expect(screen.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    expect(screen.getByLabelText(/Prorratear/)).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/logistica/c1");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(form().has("envioId")).toBe(false);
  });

  it("un concepto desconocido cae a Flete; comprobante existente se ofrece reemplazar", () => {
    renderModal({ costo: { ...COSTO, concepto: "raro", estado: "pagado", moneda: "USD", comprobanteUrl: "x" } });
    expect(screen.getByLabelText("Concepto")).toHaveValue("flete");
    expect(screen.getByLabelText(/Comprobante \(reemplazar\)/)).toBeInTheDocument();
  });
});

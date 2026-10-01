import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./Toast";
import PagoProveedorModal from "./PagoProveedorModal";
import type { AcuerdoConDetalle } from "@/lib/cobranza/types";

const UNIDADES = [
  { id: "u1", numeroUnidad: "MOV-UNIDAD-2026-001", clienteNombre: "Ana" },
  { id: "u2", numeroUnidad: "MOV-UNIDAD-2026-002", clienteNombre: "Bruno" },
];

const PAGADO: AcuerdoConDetalle = {
  id: "p1",
  unidadId: "u1",
  unidadNumero: "MOV-UNIDAD-2026-001",
  unidadModelo: "Flex 38",
  unidadEstado: "pendiente",
  clienteId: "c1",
  clienteNombre: "Ana",
  tipo: "pago",
  concepto: "flete",
  descripcion: "Flete internacional",
  contraparte: "Naviera Sur",
  moneda: "ARS",
  totalAcordado: 3200,
  notas: "Pagado por banco",
  createdAt: "2026-09-01T00:00:00.000Z",
  cuotas: [{ id: "q1", descripcion: "Flete internacional", importe: 3200, vencimiento: "2026-09-10T00:00:00.000Z", estado: "pagado" }],
  movimientos: [
    {
      id: "m1",
      fecha: "2026-09-12T00:00:00.000Z",
      importe: 3200,
      modalidad: "efectivo",
      cuotaId: "q1",
      comprobanteUrl: "pagos/u1/x.pdf",
      comprobanteSignedUrl: "https://x",
      notas: null,
      registradoPor: "a@x.com",
    },
  ],
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, id: "p9" }), { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderModal(props: Partial<Parameters<typeof PagoProveedorModal>[0]> = {}) {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(
    <ToastProvider>
      <PagoProveedorModal unidades={UNIDADES} onClose={() => {}} onSaved={onSaved} {...props} />
    </ToastProvider>
  );
  return { user, onSaved };
}

const enviado = () => fetchMock.mock.calls[0][1].body as FormData;

describe("PagoProveedorModal — nuevo pago a proveedor", () => {
  it("es un registro directo: sin cuotas, con los campos pedidos", () => {
    renderModal({ unidadIdInicial: "u1" });
    expect(screen.getByRole("heading", { name: "Nuevo pago a proveedor" })).toBeInTheDocument();
    for (const label of ["Proveedor", "Concepto", "Descripción", "Moneda", "Importe", "Fecha de pago", "Notas"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Pagado" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pendiente" })).not.toBeChecked();
    expect(screen.getByLabelText(/Comprobante/)).toBeInTheDocument();
    expect(screen.queryByText(/cuota/i)).not.toBeInTheDocument();
    expect(Array.from((screen.getByLabelText("Concepto") as HTMLSelectElement).options).map((o) => o.text)).toEqual([
      "Fábrica",
      "Flete",
      "Aduana",
      "Despachante",
      "Transporte local",
      "Grúa",
      "Impuestos",
      "Seguro",
      "Otro",
    ]);
    expect((screen.getByLabelText("Fecha de pago") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("la descripción se sugiere según el concepto sin pisar texto propio", async () => {
    const { user } = renderModal();
    const desc = screen.getByLabelText("Descripción") as HTMLInputElement;
    expect(desc.value).toBe("Primera cuota fábrica");
    await user.selectOptions(screen.getByLabelText("Concepto"), "grua");
    expect(desc.value).toBe("Servicio de grúa");
    await user.clear(desc);
    await user.type(desc, "Grúa 50tn");
    await user.selectOptions(screen.getByLabelText("Concepto"), "aduana");
    expect(desc.value).toBe("Grúa 50tn");
  });

  it("pendiente: oculta modalidad y comprobante", async () => {
    const { user } = renderModal();
    await user.click(screen.getByRole("radio", { name: "Pendiente" }));
    expect(screen.queryByLabelText(/Comprobante/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Modalidad")).not.toBeInTheDocument();
  });

  it("valida unidad, proveedor, importe y fecha", async () => {
    const { user } = renderModal();
    const registrar = () => user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await registrar();
    expect(screen.getByText("Elegí una unidad")).toBeInTheDocument();
    await user.click(screen.getByPlaceholderText("Buscar por N° de unidad o cliente..."));
    await user.click(screen.getByRole("button", { name: /MOV-UNIDAD-2026-002/ }));
    await registrar();
    expect(screen.getByText("Falta el proveedor")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Proveedor"), "Heshi");
    await registrar();
    expect(screen.getByText("El importe debe ser mayor a 0")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Importe"), "9000");
    await user.clear(screen.getByLabelText("Fecha de pago"));
    await registrar();
    expect(screen.getByText("Falta la fecha del pago")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registra un pago pagado con comprobante (POST multipart)", async () => {
    const { user, onSaved } = renderModal({ unidadIdInicial: "u1" });
    await user.type(screen.getByLabelText("Proveedor"), "Heshi");
    await user.type(screen.getByLabelText("Importe"), "9000");
    await user.clear(screen.getByLabelText("Fecha de pago"));
    await user.type(screen.getByLabelText("Fecha de pago"), "2026-09-10");
    await user.selectOptions(screen.getByLabelText("Modalidad"), "cripto");
    await user.selectOptions(screen.getByLabelText("Moneda"), "ARS");
    const pdf = new File(["%PDF"], "factura.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText(/Comprobante/), pdf);
    await user.type(screen.getByLabelText("Notas"), "SWIFT");
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/pagos");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    const f = enviado();
    expect(Object.fromEntries([...f.entries()].filter(([k]) => k !== "comprobante"))).toEqual({
      unidadId: "u1",
      proveedor: "Heshi",
      concepto: "fabrica",
      descripcion: "Primera cuota fábrica",
      moneda: "ARS",
      importe: "9000",
      fecha: "2026-09-10",
      estado: "pagado",
      modalidad: "cripto",
      notas: "SWIFT",
    });
    expect((f.get("comprobante") as File).name).toBe("factura.pdf");
  });

  it("un pago pendiente no envía comprobante aunque se haya elegido antes", async () => {
    const { user } = renderModal({ unidadIdInicial: "u1" });
    await user.type(screen.getByLabelText("Proveedor"), "La Caja");
    await user.type(screen.getByLabelText("Importe"), "500");
    await user.upload(screen.getByLabelText(/Comprobante/), new File(["x"], "a.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("radio", { name: "Pendiente" }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(enviado().get("estado")).toBe("pendiente");
    expect(enviado().has("comprobante")).toBe(false);
  });

  it("muestra el error del servidor y el error de red", async () => {
    const { user, onSaved } = renderModal({ unidadIdInicial: "u1" });
    await user.type(screen.getByLabelText("Proveedor"), "Heshi");
    await user.type(screen.getByLabelText("Importe"), "1");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Ese período ya está cerrado" }), { status: 400 }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(await screen.findAllByText("Ese período ya está cerrado")).not.toHaveLength(0);
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(await screen.findAllByText("No pudimos guardar el pago. Probá de nuevo.")).not.toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("PagoProveedorModal — editar pago", () => {
  it("precarga el pago (con la fecha real del pago) y no pide unidad", () => {
    renderModal({ pago: PAGADO });
    expect(screen.getByRole("heading", { name: "Editar pago a proveedor" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Buscar por N° de unidad o cliente...")).not.toBeInTheDocument();
    expect(screen.getByText("MOV-UNIDAD-2026-001")).toBeInTheDocument();
    expect(screen.getByLabelText("Proveedor")).toHaveValue("Naviera Sur");
    expect(screen.getByLabelText("Concepto")).toHaveValue("flete");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Flete internacional");
    expect(screen.getByLabelText("Moneda")).toHaveValue("ARS");
    expect(screen.getByLabelText("Importe")).toHaveValue(3200);
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-09-12");
    expect(screen.getByRole("radio", { name: "Pagado" })).toBeChecked();
    expect(screen.getByLabelText("Modalidad")).toHaveValue("efectivo");
    expect(screen.getByLabelText(/Comprobante \(reemplazar\)/)).toBeInTheDocument();
    expect(screen.getByLabelText("Notas")).toHaveValue("Pagado por banco");
  });

  it("un pago pendiente se abre como pendiente; concepto desconocido cae a Fábrica", () => {
    renderModal({ pago: { ...PAGADO, concepto: "venta", descripcion: null, moneda: "USD", notas: null, movimientos: [] } });
    expect(screen.getByRole("radio", { name: "Pendiente" })).toBeChecked();
    expect(screen.getByLabelText("Concepto")).toHaveValue("fabrica");
    expect(screen.getByLabelText("Descripción")).toHaveValue("");
    expect(screen.getByLabelText("Fecha de pago")).toHaveValue("2026-09-10");
  });

  it("guarda con PATCH a /api/admin/pagos/[id], sin unidadId", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { user, onSaved } = renderModal({ pago: PAGADO });
    await user.click(screen.getByRole("radio", { name: "Pendiente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/pagos/p1");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(enviado().has("unidadId")).toBe(false);
    expect(enviado().get("estado")).toBe("pendiente");
  });
});

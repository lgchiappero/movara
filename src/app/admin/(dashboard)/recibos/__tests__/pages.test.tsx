import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  unidadFindMany: vi.fn(),
  session: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/lib/db", () => ({
  db: { reciboConformidad: { findMany: m.findMany, findUnique: m.findUnique }, unidad: { findMany: m.unidadFindMany } },
}));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: m.session }));
vi.mock("next/navigation", () => ({ notFound: m.notFound, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

import AdminRecibosPage from "../page";
import NuevoReciboPage from "../nuevo/page";
import ReciboDetallePage from "../[id]/page";
import { construirTextoRecibo, textoPlano } from "@/lib/recibos/texto";
import { calcularHashRecibo } from "@/lib/recibos/hash";

const RECIBO = {
  id: "r1",
  createdAt: new Date("2026-10-01T12:00:00Z"),
  unidadId: "u1",
  unidad: { clienteId: "c1" },
  numeroRecibo: "REC-2026-001",
  token: "a".repeat(64),
  estado: "pendiente",
  fechaEntrega: new Date("2026-10-08T00:00:00Z"),
  lugarEntrega: "Sunchales, Santa Fe",
  observaciones: null as string | null,
  creadoPor: "admin@movara.com.ar",
  clienteNombre: "Ana García",
  clienteDni: "30123456",
  clienteCuit: null,
  clienteEmail: "ana@movara.test",
  clienteTelefono: null,
  numeroUnidad: "MOV-UNIDAD-2026-001",
  modelo: "Flex 38",
  emailEnviadoAt: null as Date | null,
  emailEnviadoA: null as string | null,
  confirmadoAt: null as Date | null,
  ipConfirmacion: null as string | null,
  userAgent: null as string | null,
  textoConfirmado: null as string | null,
  hashContenido: null as string | null,
  pdfPath: null,
  anuladoAt: null as Date | null,
  anuladoPor: null as string | null,
};

function confirmado() {
  const confirmadoAt = new Date("2026-10-08T13:36:00Z");
  const textoConfirmado = textoPlano(construirTextoRecibo(RECIBO));
  const hashContenido = calcularHashRecibo({ ...RECIBO, textoConfirmado, confirmadoAt, ipConfirmacion: "190.1.2.3", userAgent: "UA" });
  return { ...RECIBO, estado: "confirmado", confirmadoAt, textoConfirmado, hashContenido, ipConfirmacion: "190.1.2.3", userAgent: "UA" };
}

const detalle = async (r: unknown, email?: string) => {
  m.findUnique.mockResolvedValue(r);
  return render(await ReciboDetallePage({ params: Promise.resolve({ id: "r1" }), searchParams: Promise.resolve({ email }) }));
};

beforeEach(() => {
  vi.clearAllMocks();
  m.session.mockResolvedValue({ id: "a1", email: "admin@movara.com.ar", nombre: "Admin", rol: "admin" });
});

describe("/admin/recibos", () => {
  it("lista los recibos y ofrece crear uno nuevo", async () => {
    m.findMany.mockResolvedValue([RECIBO, { ...RECIBO, id: "r2", numeroRecibo: "REC-2026-002", estado: "raro", confirmadoAt: new Date() }]);
    render(await AdminRecibosPage());
    expect(screen.getByRole("heading", { name: "Recibos en Conformidad" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuevo recibo" })).toHaveAttribute("href", "/admin/recibos/nuevo");
    expect(screen.getByRole("link", { name: "REC-2026-002" })).toBeInTheDocument();
  });
});

describe("/admin/recibos/nuevo", () => {
  it("arma las unidades con lugar por defecto y recibo vigente", async () => {
    m.unidadFindMany.mockResolvedValue([
      {
        id: "u1",
        numeroUnidad: "MOV-UNIDAD-2026-001",
        modelo: "Flex 38",
        direccionEntrega: "Ruta 34",
        localidadDestino: "Sunchales",
        provinciaDestino: "Santa Fe",
        cliente: { nombre: "Ana", dni: null, cuit: null, email: "a@x.com", telefono: null },
        recibos: [{ numeroRecibo: "REC-2026-005" }],
      },
    ]);
    render(await NuevoReciboPage({ searchParams: Promise.resolve({ unidad: "u1" }) }));
    expect(screen.getByRole("heading", { name: "Nuevo Recibo en Conformidad" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dirección, localidad, provincia")).toHaveValue("Ruta 34, Sunchales, Santa Fe");
    expect(screen.getByRole("alert")).toHaveTextContent("REC-2026-005");
    expect(m.unidadFindMany.mock.calls[0][0].include.recibos.where).toEqual({ estado: { not: "anulado" } });
  });
});

describe("/admin/recibos/[id]", () => {
  it("404 si no existe", async () => {
    m.findUnique.mockResolvedValue(null);
    await expect(ReciboDetallePage({ params: Promise.resolve({ id: "x" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });

  it("pendiente: datos, aviso del email enviado, acciones y texto del recibo", async () => {
    await detalle({ ...RECIBO, emailEnviadoAt: new Date("2026-10-08T12:00:00Z"), emailEnviadoA: "ana@movara.test" }, "enviado");
    expect(screen.getByText(/Le enviamos al cliente el email/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Descargar PDF" })).toBeNull();
    expect(screen.getByText("Sin observaciones")).toBeInTheDocument();
    expect(screen.getByText(/· ana@movara\.test$/)).toBeInTheDocument();
    expect(screen.getByText("Texto del recibo")).toBeInTheDocument();
  });

  it("aviso si el email falló; el vendedor no ve 'Anular'", async () => {
    m.session.mockResolvedValue({ id: "v1", email: "v@x.com", nombre: "V", rol: "vendedor" });
    await detalle({ ...RECIBO, observaciones: "Raspón" }, "error");
    expect(screen.getByText(/no se pudo enviar el email/)).toBeInTheDocument();
    expect(screen.getByText("No enviado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular" })).toBeNull();
  });

  it("confirmado: evidencia completa, hash íntegro y descarga del PDF", async () => {
    await detalle(confirmado());
    expect(screen.getByRole("link", { name: "Descargar PDF" })).toHaveAttribute("href", "/api/admin/recibos/r1/pdf");
    expect(screen.getByText("190.1.2.3")).toBeInTheDocument();
    expect(screen.getByText(/✓ Íntegro/)).toBeInTheDocument();
    expect(screen.getByText("Texto confirmado por el cliente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reenviar email" })).toBeNull();
  });

  it("confirmado con datos alterados: el hash no coincide", async () => {
    await detalle({ ...confirmado(), ipConfirmacion: "6.6.6.6", userAgent: null });
    expect(screen.getByText(/✗ No coincide/)).toBeInTheDocument();
  });

  it("anulado: muestra quién y cuándo", async () => {
    await detalle({ ...RECIBO, estado: "anulado", anuladoAt: new Date("2026-10-09T12:00:00Z"), anuladoPor: "admin@movara.com.ar" });
    // "Creado ... · admin" y "Anulado ... · admin": dos filas con el mismo autor.
    expect(screen.getByText("Anulado", { selector: "dt" })).toBeInTheDocument();
    expect(screen.getAllByText(/· admin@movara\.com\.ar$/, { selector: "dd" })).toHaveLength(2);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

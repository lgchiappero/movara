import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { envio: { findMany: mockFindMany } } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/NuevoEnvioButton", () => ({ default: () => <div>NuevoEnvioButton</div> }));

import AdminEnviosPage from "../page";

describe("AdminEnviosPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay envíos", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminEnviosPage());
    expect(screen.getByText(/todavía no hay envíos/i)).toBeInTheDocument();
  });

  it("muestra '—' para estado general cuando el envío no tiene unidades", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "e1", numeroPI: null, numeroContenedor: null, fechaArriboEstimado: null, unidades: [] },
    ]);
    render(await AdminEnviosPage());
    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("muestra el estado general derivado y la lista de clientes únicos", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "e1",
        numeroPI: "PI-001",
        numeroContenedor: "CONT-1",
        fechaArriboEstimado: new Date("2026-06-01T00:00:00.000Z"),
        unidades: [
          { estadoFabricacion: "en_transito", cliente: { nombre: "Juan" } },
          { estadoFabricacion: "en_produccion", cliente: { nombre: "Juan" } },
          { estadoFabricacion: "embarcado", cliente: { nombre: "Ana" } },
        ],
      },
    ]);
    render(await AdminEnviosPage());
    expect(screen.getByText("PI-001")).toBeInTheDocument();
    expect(screen.getByText("En producción")).toBeInTheDocument(); // el menos avanzado de los 3
    expect(screen.getByText("Juan, Ana")).toBeInTheDocument();
  });
});

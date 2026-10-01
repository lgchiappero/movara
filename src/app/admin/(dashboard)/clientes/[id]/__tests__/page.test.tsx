import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindUnique, mockNotFound, mockGetAdminUser } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockGetAdminUser: vi.fn().mockResolvedValue({ id: "u1", nombre: "Admin", email: "a@x.com", rol: "admin" }),
}));

vi.mock("@/lib/db", () => ({ db: { cliente: { findUnique: mockFindUnique } } }));
vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/admin/ClienteDetailForm", () => ({
  default: ({ initial }: { initial: { nombre: string } }) => <div>Form: {initial.nombre}</div>,
}));
vi.mock("@/components/admin/EliminarClienteButton", () => ({
  default: ({ cantidadUnidades }: { cantidadUnidades: number }) => (
    <div>EliminarClienteButton cantidadUnidades={cantidadUnidades}</div>
  ),
}));

import ClienteDetailPage from "../page";

const CLIENTE = {
  id: "c1",
  nombre: "Juan García",
  dni: null,
  cuit: null,
  domicilio: null,
  email: null,
  telefono: null,
  notas: null,
  unidades: [],
};

describe("ClienteDetailPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama a notFound() si el cliente no existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(ClienteDetailPage({ params: Promise.resolve({ id: "no-existe" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("muestra el estado vacío cuando el cliente no tiene unidades", async () => {
    mockFindUnique.mockResolvedValueOnce(CLIENTE);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText("Juan García")).toBeInTheDocument();
    expect(screen.getByText(/todavía no tiene unidades/i)).toBeInTheDocument();
  });

  it("lista las unidades del cliente con su estado y PI del envío si tiene", async () => {
    mockFindUnique.mockResolvedValueOnce({
      ...CLIENTE,
      unidades: [
        {
          id: "u1",
          numeroUnidad: "MOV-UNIDAD-2026-001",
          modelo: "Flex 18",
          estadoFabricacion: "en_produccion",
          envio: { numeroPI: "PI-001" },
        },
        {
          id: "u2",
          numeroUnidad: null,
          modelo: null,
          estadoFabricacion: "pendiente",
          envio: null,
        },
      ],
    });
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText("Unidades (2)")).toBeInTheDocument();
    expect(screen.getByText("MOV-UNIDAD-2026-001")).toBeInTheDocument();
    expect(screen.getByText(/PI PI-001/)).toBeInTheDocument();
    expect(screen.getByText("Sin número")).toBeInTheDocument();
    expect(screen.getByText("Modelo sin definir")).toBeInTheDocument();
  });

  it("rol admin ve el botón de eliminar con la cantidad de unidades", async () => {
    mockFindUnique.mockResolvedValueOnce({ ...CLIENTE, unidades: [{}, {}] });
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText("EliminarClienteButton cantidadUnidades=2")).toBeInTheDocument();
  });

  it("rol vendedor no ve el botón de eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u2", nombre: "Vend", email: "v@x.com", rol: "vendedor" });
    mockFindUnique.mockResolvedValueOnce(CLIENTE);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.queryByText(/EliminarClienteButton/)).not.toBeInTheDocument();
  });

  it("sin sesión no rompe y no muestra el botón de eliminar", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    mockFindUnique.mockResolvedValueOnce(CLIENTE);
    render(await ClienteDetailPage({ params: Promise.resolve({ id: "c1" }) }));
    expect(screen.queryByText(/EliminarClienteButton/)).not.toBeInTheDocument();
  });
});

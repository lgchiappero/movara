import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { adminUser: { findMany: mockFindMany } } }));
vi.mock("@/components/admin/UsuariosPanel", () => ({
  default: ({ initialUsuarios }: { initialUsuarios: { nombre: string; ultimoLogin: string | null }[] }) => (
    <div>
      {initialUsuarios.map((u) => (
        <p key={u.nombre}>
          {u.nombre} — {u.ultimoLogin ?? "nunca"}
        </p>
      ))}
    </div>
  ),
}));

import AdminUsuariosPage from "../page";

describe("AdminUsuariosPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el máximo de usuarios permitido", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    render(await AdminUsuariosPage());
    expect(screen.getByText(/Hasta 5 usuarios/)).toBeInTheDocument();
  });

  it("serializa ultimoLogin a ISO string o null antes de pasarlo al panel", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "1", nombre: "Ana", email: "ana@x.com", rol: "admin", activo: true, ultimoLogin: new Date("2026-01-01T00:00:00.000Z") },
      { id: "2", nombre: "Beto", email: "beto@x.com", rol: "vendedor", activo: true, ultimoLogin: null },
    ]);
    render(await AdminUsuariosPage());
    expect(screen.getByText("Ana — 2026-01-01T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Beto — nunca")).toBeInTheDocument();
  });
});

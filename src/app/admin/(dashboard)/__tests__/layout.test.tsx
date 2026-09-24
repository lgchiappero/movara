import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockGetAdminUser, mockRedirect } = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/admin/current-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("@/components/admin/AdminShell", () => ({
  default: ({ children, nombre, rol, navItems }: { children: React.ReactNode; nombre: string; rol: string; navItems: { href: string }[] }) => (
    <div>
      <p>{nombre} — {rol}</p>
      <p>nav: {navItems.length}</p>
      {children}
    </div>
  ),
}));

import AdminDashboardLayout from "../layout";

describe("AdminDashboardLayout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirige a /admin/login si no hay sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce(null);
    await expect(AdminDashboardLayout({ children: <p>x</p> })).rejects.toThrow("NEXT_REDIRECT:/admin/login");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
  });

  it("renderiza el AdminShell con el nav filtrado por rol y los children, cuando hay sesión", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Ana", email: "ana@x.com", rol: "vendedor" });
    const jsx = await AdminDashboardLayout({ children: <p>Contenido protegido</p> });
    render(jsx);
    expect(screen.getByText(/Ana — vendedor/)).toBeInTheDocument();
    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    // vendedor no ve todos los items — el conteo debe ser menor al total
    const { ADMIN_NAV_ITEMS } = await import("@/lib/admin/nav-items");
    expect(screen.getByText(/nav: \d+/)).toBeInTheDocument();
    expect(screen.queryByText(`nav: ${ADMIN_NAV_ITEMS.length}`)).not.toBeInTheDocument();
  });

  it("un admin ve todos los items del nav", async () => {
    mockGetAdminUser.mockResolvedValueOnce({ id: "u1", nombre: "Root", email: "root@x.com", rol: "admin" });
    const jsx = await AdminDashboardLayout({ children: <p>x</p> });
    render(jsx);
    const { ADMIN_NAV_ITEMS } = await import("@/lib/admin/nav-items");
    expect(screen.getByText(`nav: ${ADMIN_NAV_ITEMS.length}`)).toBeInTheDocument();
  });
});

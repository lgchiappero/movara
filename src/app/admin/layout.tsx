import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAllowedForRole } from "@/lib/admin/auth-users";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav-items";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin — MOVARA",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminUser();
  if (!session) {
    // src/proxy.ts ya bloquea todo /admin/:path* sin credenciales válidas —
    // esto es defensivo por si alguna vez queda una ruta sin cubrir.
    redirect("/");
  }

  const navItems = ADMIN_NAV_ITEMS.filter((item) => isAllowedForRole(session.rol, item.href));

  return (
    <AdminShell navItems={navItems} user={session.user} rol={session.rol}>
      {children}
    </AdminShell>
  );
}

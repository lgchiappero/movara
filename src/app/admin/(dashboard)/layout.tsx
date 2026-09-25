import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin/current-user";
import { isAllowedForRole } from "@/lib/admin/roles";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/nav-items";
import AdminShell from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/Toast";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminUser();
  if (!session) {
    // src/proxy.ts ya bloquea todo /admin/:path* sin sesión válida — esto es
    // defensivo por si alguna vez queda una ruta sin cubrir. /admin/login
    // vive fuera de este route group, así que nunca pasa por acá.
    redirect("/admin/login");
  }

  const navItems = ADMIN_NAV_ITEMS.filter((item) => isAllowedForRole(session.rol, item.href));

  return (
    <ToastProvider>
      <AdminShell navItems={navItems} nombre={session.nombre} rol={session.rol}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}

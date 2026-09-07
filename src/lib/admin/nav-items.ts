export type AdminNavItem = { href: string; label: string; icon: string };

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/leads", label: "Leads", icon: "👥" },
  { href: "/admin/configuraciones", label: "Pedidos", icon: "📦" },
  { href: "/admin/contenido", label: "Contenido", icon: "✏️" },
  { href: "/admin/modelos", label: "Modelos", icon: "🏠" },
  { href: "/admin/configuracion", label: "Configuración", icon: "⚙️" },
];

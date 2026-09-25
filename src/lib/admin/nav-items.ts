export type AdminNavItem = { href: string; label: string; icon: string };

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/buscar", label: "Buscar", icon: "🔍" },
  { href: "/admin/leads", label: "Leads", icon: "👥" },
  { href: "/admin/pipeline", label: "Pipeline", icon: "💼" },
  { href: "/admin/configuraciones", label: "Pedidos", icon: "📦" },
  { href: "/admin/agenda", label: "Agenda", icon: "📅" },
  { href: "/admin/clientes", label: "Clientes", icon: "👤" },
  { href: "/admin/envios", label: "Envíos", icon: "🚢" },
  { href: "/admin/unidades", label: "Unidades", icon: "🏗️" },
  { href: "/admin/contenido", label: "Contenido", icon: "✏️" },
  { href: "/admin/modelos", label: "Modelos", icon: "🏠" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "🔑" },
  { href: "/admin/configuracion", label: "Configuración", icon: "⚙️" },
];

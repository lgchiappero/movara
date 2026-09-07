"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { AdminNavItem } from "@/lib/admin/nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

function handleLogout() {
  // Basic Auth no tiene invalidación real de sesión — pisamos las
  // credenciales cacheadas por el browser con una inválida (truco
  // estándar) y volvemos a una ruta pública.
  const bogus = Math.random().toString(36).slice(2);
  window.location.href = `${window.location.protocol}//logout:${bogus}@${window.location.host}/`;
}

function NavLinks({ navItems, pathname, onNavigate }: { navItems: AdminNavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active ? "bg-[#D4B06A] text-[#1a1a1a]" : "text-stone-300 hover:bg-white/10"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarLogo() {
  return (
    <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
      <Image src="/Logo.jpeg" alt="MOVARA" width={32} height={32} className="rounded-lg" />
      <span className="text-white font-bold text-sm">MOVARA Admin</span>
    </div>
  );
}

export default function AdminShell({
  navItems,
  user,
  rol,
  children,
}: {
  navItems: AdminNavItem[];
  user: string;
  rol: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 bg-[#1a1a1a]">
        <SidebarLogo />
        <NavLinks navItems={navItems} pathname={pathname} />
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-[#1a1a1a] flex flex-col">
            <div className="flex items-center justify-between pr-3">
              <SidebarLogo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="text-white text-xl leading-none px-2"
              >
                ✕
              </button>
            </div>
            <NavLinks navItems={navItems} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="flex-1 bg-black/50"
            onClick={() => setOpen(false)}
          />
        </div>
      )}

      <div className="md:ml-60">
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E5E5]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="md:hidden text-xl text-[#1a1a1a] leading-none"
          >
            ☰
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-600">
              {user} <span className="text-stone-400">· {rol}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50 font-medium transition-colors"
            >
              Salir
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

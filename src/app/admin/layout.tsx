import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — MOVARA",
  robots: { index: false, follow: false },
};

// Layout raíz de /admin — solo metadata. La protección (sesión + rol +
// AdminShell) vive en src/app/admin/(dashboard)/layout.tsx, un route group
// que deliberadamente NO incluye /admin/login: así el login queda fuera del
// árbol protegido sin necesidad de casos especiales dentro del layout.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

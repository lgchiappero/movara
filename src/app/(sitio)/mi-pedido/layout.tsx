import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi pedido — MOVARA",
  robots: { index: false, follow: false },
};

// Header y footer vienen de app/(sitio)/layout.tsx; acá solo el fondo.
export default function MiPedidoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F9F5EE]">{children}</div>;
}

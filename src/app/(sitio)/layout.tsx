import LayoutSitio from "@/components/layout/LayoutSitio";

/** Todas las rutas públicas (home, modelos, configurador, producto, nosotros,
 * faq, agendar, recibo, mi-pedido, privacidad, términos) comparten este
 * layout: Navbar + main + Footer, una sola vez. admin y studio quedan afuera.
 * Ver docs/base-del-sitio.md. */
export default function SitioLayout({ children }: { children: React.ReactNode }) {
  return <LayoutSitio>{children}</LayoutSitio>;
}

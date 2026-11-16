import Navbar from "./Navbar";
import Footer from "./Footer";

/** Marco de toda página pública: header fijo (logo → home, Volver), contenido
 * y footer. Lo usan app/(sitio)/layout.tsx y app/not-found.tsx (la 404 se
 * renderiza bajo el layout raíz, fuera del grupo). Las páginas NO agregan
 * Navbar/Footer/<main> propios: solo su contenido, con el aire superior
 * necesario para el header fijo de 64px (pt-16 o más). */
export default function LayoutSitio({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

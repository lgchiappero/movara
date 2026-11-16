import type { Metadata } from "next";
import Link from "next/link";
import LayoutSitio from "@/components/layout/LayoutSitio";

export const metadata: Metadata = {
  title: "Página no encontrada — MOVARA",
  robots: { index: false, follow: false },
};

/** 404 de todo el sitio. La 404 raíz se renderiza bajo el layout raíz (no
 * dentro de app/(sitio)), así que arma el mismo marco con LayoutSitio. */
export default function NotFound() {
  return (
    <LayoutSitio>
      <div className="bg-[#1A1A1A] px-4 sm:px-6 pt-32 pb-24 min-h-[70vh] flex items-center">
        <div className="mx-auto w-full max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4B36A] mb-4">Error 404</p>
          <h1 className="font-playfair font-medium text-3xl sm:text-4xl text-white">No encontramos esta página</h1>
          <p className="mt-5 text-stone-400 leading-relaxed">
            Puede que el link esté mal escrito o que la página ya no exista. Seguí desde el inicio o mirá nuestros modelos.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/modelos"
              className="inline-flex items-center justify-center min-h-11 px-6 rounded-xl bg-[#D4B36A] hover:bg-[#c1a25a] text-[#1A1A1A] text-sm font-bold transition-colors"
            >
              Ver modelos
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-11 px-6 rounded-xl border border-[#D4B36A] text-[#D4B36A] text-sm font-semibold hover:bg-[#D4B36A]/10 transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </LayoutSitio>
  );
}

import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { asegurarSinCamposPendientes, type DocumentoLegal } from "@/lib/legal/campos";
import TextoConCampos from "./TextoConCampos";

/** Página legal (/privacidad, /terminos): mismo Navbar y footer que el
 * resto del sitio, índice con anclas y texto a ~70 caracteres por línea. */
export default function PaginaLegal({ doc, otro }: { doc: DocumentoLegal; otro: { href: string; label: string } }) {
  asegurarSinCamposPendientes(doc);

  return (
    <>
      <Navbar />
      <main className="bg-white pt-28 pb-24 px-4 sm:px-6">
        <article className="mx-auto max-w-[70ch]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4B06A] mb-3">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2F2F2F] leading-tight">{doc.titulo}</h1>
          <p className="mt-2 text-sm text-stone-500">Última actualización: {doc.actualizado}</p>
          <p className="mt-6 text-[15px] text-stone-700 leading-relaxed">
            <TextoConCampos texto={doc.intro} />
          </p>

          <nav aria-label="Índice" className="mt-8 rounded-2xl bg-stone-50 border border-stone-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3">Índice</p>
            <ol className="space-y-1.5 text-sm">
              {doc.secciones.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-[#2F2F2F] hover:text-[#BF9A52] underline-offset-2 hover:underline">
                    {s.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {doc.secciones.map((s) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
              <h2 className="text-lg sm:text-xl font-bold text-[#2F2F2F] mb-3">{s.titulo}</h2>
              <div className="space-y-3 text-[15px] text-stone-700 leading-relaxed">
                {s.bloques.map((b, i) =>
                  b.tipo === "p" ? (
                    <p key={i}>
                      <TextoConCampos texto={b.texto} />
                    </p>
                  ) : (
                    <ul key={i} className="list-disc pl-5 space-y-2 marker:text-[#D4B06A]">
                      {b.items.map((item, j) => (
                        <li key={j}>
                          <TextoConCampos texto={item} />
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}

          <p className="mt-12 pt-6 border-t border-stone-100 text-sm text-stone-500">
            Ver también:{" "}
            <Link href={otro.href} className="text-[#BF9A52] hover:underline font-medium">
              {otro.label}
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}

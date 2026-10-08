import { partirPorCampos } from "@/lib/legal/campos";

/** Texto legal con los [CAMPOS] sin completar resaltados (solo existen en
 * desarrollo: en producción el build falla si queda alguno). */
export default function TextoConCampos({ texto }: { texto: string }) {
  return (
    <>
      {partirPorCampos(texto).map((p, i) =>
        p.campo ? (
          <mark key={i} title="Campo a completar en src/data/legal/empresa.ts" className="bg-amber-200 text-stone-900 rounded px-1 font-semibold">
            {p.texto}
          </mark>
        ) : (
          <span key={i}>{p.texto}</span>
        )
      )}
    </>
  );
}

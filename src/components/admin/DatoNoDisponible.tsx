/** Lo que se muestra en lugar de una sección del pedido que no se pudo
 *  armar (dato raro o faltante): el resto del detalle sigue funcionando. */
export default function DatoNoDisponible({ titulo }: { titulo?: string }) {
  return (
    <div role="status" className="bg-white rounded-2xl border border-dashed border-amber-300 p-5 text-sm">
      {titulo && <p className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-1">{titulo}</p>}
      <p className="text-amber-800">Dato no disponible.</p>
    </div>
  );
}

/** Arma una sección del servidor y, si tira un error, muestra "Dato no
 *  disponible" en su lugar. `armar` tiene que ser síncrona y llamar a los
 *  componentes como funciones para que el error se pueda atrapar acá. */
export function seccionSegura(titulo: string, armar: () => React.ReactNode): React.ReactNode {
  try {
    return armar();
  } catch (err) {
    console.error(`[admin] No se pudo armar la sección "${titulo}":`, err);
    return <DatoNoDisponible titulo={titulo} />;
  }
}

export default function AdminContenidoPage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[#D4B06A] text-xs font-bold uppercase tracking-widest mb-1">
          Panel MOVARA
        </p>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Contenido</h1>
        <p className="text-sm text-stone-500 mt-1">
          Editá el contenido del sitio directo desde Sanity Studio, sin salir del panel.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        <iframe src="/studio" title="Sanity Studio" className="w-full h-[85vh] border-0" />
      </div>
    </div>
  );
}

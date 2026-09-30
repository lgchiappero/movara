"use client";

import { useState } from "react";
import Link from "next/link";

type PasoGuia = { texto: string; href: string };
type SeccionGuia = { titulo: string; pasos: PasoGuia[] };

const SECCIONES: SeccionGuia[] = [
  {
    titulo: "Llegó un lead nuevo",
    pasos: [{ texto: "Pipeline → cambiar etapa → contactar por WhatsApp", href: "/admin/pipeline" }],
  },
  {
    titulo: "Cerraste una venta",
    pasos: [
      { texto: "Pipeline → marcar Ganado → Convertir a cliente", href: "/admin/pipeline" },
      { texto: "Unidades → Nueva unidad → vincular al cliente", href: "/admin/unidades" },
    ],
  },
  {
    titulo: "Cliente pagó el anticipo",
    pasos: [{ texto: "Cobranza → buscar el cobro → Registrar pago recibido", href: "/admin/cobranza" }],
  },
  {
    titulo: "Confirmaste pedido con proveedor",
    pasos: [
      { texto: "Envíos → Nuevo envío → cargar PI", href: "/admin/envios" },
      { texto: "Unidades → vincular al envío → cambiar estado a \"En producción\"", href: "/admin/unidades" },
      { texto: "Cobranza → Nuevo pago → registrar pago a fábrica", href: "/admin/cobranza" },
    ],
  },
  {
    titulo: "Llegó el contenedor",
    pasos: [
      { texto: "Unidades → cambiar estado a \"En aduana\"", href: "/admin/unidades" },
      { texto: "Subir documentos carpeta 06", href: "/admin/unidades" },
      { texto: "Cobranza → registrar pago despachante e impuestos", href: "/admin/cobranza" },
    ],
  },
  {
    titulo: "Entregaste la unidad",
    pasos: [
      { texto: "Unidades → cambiar estado a \"Entregado\"", href: "/admin/unidades" },
      { texto: "Subir acta de entrega carpeta 07", href: "/admin/unidades" },
      { texto: "Activar garantía (12 meses)", href: "/admin/unidades" },
      { texto: "Cobranza → registrar cobro saldo si falta", href: "/admin/cobranza" },
    ],
  },
];

export default function AdminGuiaRapida() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir guía rápida"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#D4B06A] text-white text-xl font-bold shadow-lg hover:bg-[#c19f5a] transition-colors flex items-center justify-center"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar guía rápida"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white h-full overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5] sticky top-0 bg-white">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#2F2F2F]">Guía rápida MOVARA</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-stone-400 hover:text-stone-600 text-xl leading-none px-1"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-6">
              {SECCIONES.map((seccion) => (
                <div key={seccion.titulo}>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-[#D4B06A] mb-2">
                    {seccion.titulo}
                  </h3>
                  <ul className="space-y-1.5">
                    {seccion.pasos.map((paso) => (
                      <li key={paso.texto}>
                        <Link
                          href={paso.href}
                          onClick={() => setOpen(false)}
                          className="text-sm text-[#2F2F2F] hover:text-sage-700 hover:underline"
                        >
                          → {paso.texto}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

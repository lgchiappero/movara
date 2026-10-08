"use client";

import { usePathname } from "next/navigation";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import CuposBar from "@/components/ui/CuposBar";

export default function WhatsAppStickyBar({
  waNumber,
  mensaje = "Hola MOVARA! Quiero hablar con un asesor sobre el precio de lanzamiento.",
  label = "Hablar con un asesor",
  total,
  reservadas,
}: {
  waNumber?: string | null;
  mensaje?: string;
  label?: string;
  total?: number | null;
  reservadas?: number | null;
}) {
  const pathname = usePathname();
  const href = getWhatsAppUrl(mensaje, waNumber);

  // El configurador tiene su propio flujo de WhatsApp (botón de envío en el
  // resultado) y, en mobile, su propio panel de precio fijo abajo — mostrar
  // esta barra ahí también hace que las dos se pisen en la misma posición.
  // El Studio y el admin tampoco son páginas de cara al cliente.
  if (
    pathname?.startsWith("/configurador") ||
    pathname?.startsWith("/studio") ||
    pathname?.startsWith("/admin") ||
    // En el celular taparía el botón de confirmación del recibo.
    pathname?.startsWith("/recibo")
  ) {
    return null;
  }

  const mostrarCupos = typeof total === "number" && typeof reservadas === "number" && total > 0;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3 py-3 sm:px-6 bg-[#1A1A1A]/97 backdrop-blur border-t border-[#D4B06A]/15">
      <div className="max-w-5xl mx-auto flex items-center gap-3 sm:gap-6">
        {mostrarCupos && (
          <div className="shrink-0">
            <CuposBar variant="mini" total={total as number} reservadas={reservadas as number} />
          </div>
        )}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-initial sm:ml-auto flex items-center justify-center gap-2 sm:gap-2.5 py-3.5 sm:py-3 px-4 sm:px-8 bg-[#D4B06A] hover:bg-[#BF9A52] text-[#1A1A1A] font-bold text-[13px] sm:text-sm rounded-xl transition-all duration-200 whitespace-nowrap"
        >
          <WhatsAppIcon className="w-[18px] h-[18px]" />
          {label}
        </a>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

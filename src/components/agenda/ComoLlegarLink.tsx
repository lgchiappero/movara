import { SHOWROOM_MAPS_URL } from "@/lib/agenda/showroom";

/** "Cómo llegar (Google Maps)" — el mismo link y estilo que en los emails de
 * confirmación y recordatorio de la visita. */
export default function ComoLlegarLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={SHOWROOM_MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[13px] text-[#D4B36A] underline hover:text-[#BF9D52] ${className}`}
    >
      Cómo llegar (Google Maps)
    </a>
  );
}

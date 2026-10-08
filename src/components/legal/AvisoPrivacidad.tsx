import Link from "next/link";

/** "Al enviar aceptás la Política de Privacidad." — va debajo de cada
 * formulario que pide datos personales. */
export default function AvisoPrivacidad({
  tono = "claro",
  accion = "Al enviar",
  className = "",
}: {
  tono?: "claro" | "oscuro";
  accion?: string;
  className?: string;
}) {
  const color = tono === "oscuro" ? "text-stone-400" : "text-stone-500";
  return (
    <p className={`text-xs ${color} ${className}`}>
      {accion} aceptás la{" "}
      <Link href="/privacidad" target="_blank" className="underline underline-offset-2 hover:text-[#D4B06A]">
        Política de Privacidad
      </Link>
      .
    </p>
  );
}

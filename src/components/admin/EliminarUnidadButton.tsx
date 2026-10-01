"use client";

import { useRouter } from "next/navigation";
import EliminarButton from "@/components/admin/EliminarButton";

export default function EliminarUnidadButton({
  id,
  cantidadPagos,
  cantidadDocumentos,
}: {
  id: string;
  cantidadPagos: number;
  cantidadDocumentos: number;
}) {
  const router = useRouter();

  const partes: string[] = [];
  if (cantidadPagos > 0) partes.push(`${cantidadPagos} pago${cantidadPagos === 1 ? "" : "s"}`);
  if (cantidadDocumentos > 0) partes.push(`${cantidadDocumentos} documento${cantidadDocumentos === 1 ? "" : "s"}`);

  return (
    <EliminarButton
      motivoBloqueo={partes.length > 0 ? `No se puede eliminar: tiene ${partes.join(" y ")} asociado${partes.length > 1 ? "s" : ""}` : null}
      confirmTitle="¿Eliminar esta unidad?"
      successMessage="Unidad eliminada"
      onEliminar={async () => {
        const res = await fetch(`/api/admin/unidades/${id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        return res.ok ? { ok: true } : { ok: false, error: json?.error };
      }}
      onSuccess={() => router.push("/admin/unidades")}
    />
  );
}

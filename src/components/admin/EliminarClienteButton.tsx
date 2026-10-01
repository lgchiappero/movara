"use client";

import { useRouter } from "next/navigation";
import EliminarButton from "@/components/admin/EliminarButton";

export default function EliminarClienteButton({
  id,
  cantidadUnidades,
}: {
  id: string;
  cantidadUnidades: number;
}) {
  const router = useRouter();

  return (
    <EliminarButton
      motivoBloqueo={
        cantidadUnidades > 0
          ? `No se puede eliminar: tiene ${cantidadUnidades} unidad${cantidadUnidades === 1 ? "" : "es"} asociada${cantidadUnidades === 1 ? "" : "s"}`
          : null
      }
      confirmTitle="¿Eliminar este cliente?"
      successMessage="Cliente eliminado"
      onEliminar={async () => {
        const res = await fetch(`/api/admin/clientes/${id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        return res.ok ? { ok: true } : { ok: false, error: json?.error };
      }}
      onSuccess={() => router.push("/admin/clientes")}
    />
  );
}

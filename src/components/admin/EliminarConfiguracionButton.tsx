"use client";

import { useRouter } from "next/navigation";
import EliminarButton from "@/components/admin/EliminarButton";

export default function EliminarConfiguracionButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <EliminarButton
      confirmTitle="¿Eliminar esta consulta?"
      successMessage="Consulta eliminada"
      onEliminar={async () => {
        const res = await fetch(`/api/admin/configuraciones/${id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        return res.ok ? { ok: true } : { ok: false, error: json?.error };
      }}
      onSuccess={() => router.push("/admin/configuraciones")}
    />
  );
}

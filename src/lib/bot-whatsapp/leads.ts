import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { TAMANO_PAGINA } from "@/lib/validators/bot-whatsapp";
import type { EstadoLead } from "./constantes";

export type FiltroLeads = { estado?: EstadoLead; q?: string; pagina: number };

/** Leads del bot con filtro por estado y búsqueda por nombre o teléfono,
 * ordenados por último mensaje (los que nunca escribieron, al final, por
 * fecha de alta). La usan la ruta GET y la página del panel. */
export async function listarLeads({ estado, q, pagina }: FiltroLeads) {
  const texto = q?.trim();
  const digitos = texto?.replace(/\D/g, "") ?? "";
  const where: Prisma.LeadWhatsappWhereInput = {
    ...(estado ? { estado } : {}),
    ...(texto
      ? {
          OR: [
            { nombre: { contains: texto, mode: "insensitive" } },
            ...(digitos.length >= 3 ? [{ telefono: { contains: digitos } }] : []),
          ],
        }
      : {}),
  };
  const [total, leads] = await Promise.all([
    db.leadWhatsapp.count({ where }),
    db.leadWhatsapp.findMany({
      where,
      orderBy: [{ ultimoMensajeEn: { sort: "desc", nulls: "last" } }, { creadoEn: "desc" }],
      skip: (pagina - 1) * TAMANO_PAGINA,
      take: TAMANO_PAGINA,
      select: {
        id: true,
        nombre: true,
        telefono: true,
        zona: true,
        uso: true,
        estado: true,
        origen: true,
        controlHumano: true,
        ultimoMensajeEn: true,
        proximoContacto: true,
      },
    }),
  ]);
  return { total, pagina, paginas: Math.max(1, Math.ceil(total / TAMANO_PAGINA)), leads };
}

export type FilaLead = Awaited<ReturnType<typeof listarLeads>>["leads"][number];

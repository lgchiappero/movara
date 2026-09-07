import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildLeadsCsv } from "@/lib/admin/leads-csv";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const provincia = searchParams.get("provincia") ?? undefined;

  const where: Prisma.LeadWhereInput = {};
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(`${desde}T00:00:00`);
    if (hasta) where.createdAt.lte = new Date(`${hasta}T23:59:59`);
  }
  if (provincia) {
    where.provincia = { contains: provincia, mode: "insensitive" };
  }

  const leads = await db.lead.findMany({ where, orderBy: { createdAt: "desc" } });

  const csv = buildLeadsCsv(
    leads.map((lead) => ({
      nombre: [lead.nombre, lead.apellido].filter(Boolean).join(" "),
      email: lead.email,
      telefono: lead.telefono,
      provincia: lead.provincia,
      createdAt: lead.createdAt,
      mensaje: lead.mensaje,
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-movara-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

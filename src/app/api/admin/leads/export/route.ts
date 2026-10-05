import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildLeadsCsv } from "@/lib/admin/leads-csv";
import { buildLeadsWhere } from "@/lib/admin/leads-filtro";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const where = buildLeadsWhere({
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
    provincia: searchParams.get("provincia") ?? undefined,
    sinResponder: searchParams.get("sinResponder") ?? undefined,
  });

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

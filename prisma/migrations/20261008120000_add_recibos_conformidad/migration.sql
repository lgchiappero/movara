-- Recibo en Conformidad de entrega (ver modelo ReciboConformidad).

-- CreateTable
CREATE TABLE "recibos_conformidad" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unidadId" TEXT NOT NULL,
    "numeroRecibo" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT (replace((gen_random_uuid())::text, '-'::text, ''::text) || replace((gen_random_uuid())::text, '-'::text, ''::text)),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "lugarEntrega" TEXT NOT NULL,
    "observaciones" TEXT,
    "creadoPor" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteDni" TEXT,
    "clienteCuit" TEXT,
    "clienteEmail" TEXT NOT NULL,
    "clienteTelefono" TEXT,
    "numeroUnidad" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "emailEnviadoAt" TIMESTAMP(3),
    "emailEnviadoA" TEXT,
    "confirmadoAt" TIMESTAMP(3),
    "ipConfirmacion" TEXT,
    "userAgent" TEXT,
    "textoConfirmado" TEXT,
    "hashContenido" TEXT,
    "pdfPath" TEXT,
    "anuladoAt" TIMESTAMP(3),
    "anuladoPor" TEXT,

    CONSTRAINT "recibos_conformidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recibos_conformidad_numeroRecibo_key" ON "recibos_conformidad"("numeroRecibo");

-- CreateIndex
CREATE UNIQUE INDEX "recibos_conformidad_token_key" ON "recibos_conformidad"("token");

-- CreateIndex
CREATE INDEX "recibos_conformidad_unidadId_idx" ON "recibos_conformidad"("unidadId");

-- CreateIndex
CREATE INDEX "recibos_conformidad_estado_fechaEntrega_idx" ON "recibos_conformidad"("estado", "fechaEntrega");

-- AddForeignKey
ALTER TABLE "recibos_conformidad" ADD CONSTRAINT "recibos_conformidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS sin políticas: bloquea el acceso por la API pública de Supabase
-- (anon/authenticated). Prisma se conecta como dueño de la tabla y no se
-- ve afectado (no se usa FORCE ROW LEVEL SECURITY).
ALTER TABLE "recibos_conformidad" ENABLE ROW LEVEL SECURITY;

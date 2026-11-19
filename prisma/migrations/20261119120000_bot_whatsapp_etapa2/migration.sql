-- AlterTable
ALTER TABLE "leads_whatsapp" ADD COLUMN     "bienvenidaEnviadaEn" TIMESTAMP(3),
ADD COLUMN     "bloqueoHasta" TIMESTAMP(3),
ADD COLUMN     "ultimoEntranteEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mensajes_whatsapp" ADD COLUMN     "estadoEntrega" TEXT,
ADD COLUMN     "waMessageId" TEXT;

-- AlterTable
ALTER TABLE "uso_bot" ADD COLUMN     "avisoOchentaEn" TIMESTAMP(3),
ADD COLUMN     "llamadas" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "mensajes_whatsapp_waMessageId_key" ON "mensajes_whatsapp"("waMessageId");


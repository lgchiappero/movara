-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "campana" TEXT,
ADD COLUMN     "emailNorm" TEXT,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'interesado',
ADD COLUMN     "estadoAutomatico" TEXT NOT NULL DEFAULT 'interesado',
ADD COLUMN     "estadoManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estadoManualEn" TIMESTAMP(3),
ADD COLUMN     "estadoManualPor" TEXT,
ADD COLUMN     "localidad" TEXT,
ADD COLUMN     "nombreContacto" TEXT,
ADD COLUMN     "origenDetalle" JSONB,
ADD COLUMN     "origenVisita" TEXT,
ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "razonSocial" TEXT,
ADD COLUMN     "telefonoNorm" TEXT,
ADD COLUMN     "tipoCliente" TEXT;

-- AlterTable
ALTER TABLE "configuraciones_pedido" ADD COLUMN     "canceladoPor" TEXT,
ADD COLUMN     "clienteId" TEXT,
ADD COLUMN     "estadoAntesDeCancelar" TEXT,
ADD COLUMN     "fechaCancelacion" TIMESTAMP(3),
ADD COLUMN     "motivoCancelacion" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "campana" TEXT,
ADD COLUMN     "emailNorm" TEXT,
ADD COLUMN     "origenDetalle" JSONB,
ADD COLUMN     "origenVisita" TEXT,
ADD COLUMN     "telefonoNorm" TEXT;

-- CreateIndex
CREATE INDEX "clientes_emailNorm_idx" ON "clientes"("emailNorm");

-- CreateIndex
CREATE INDEX "clientes_telefonoNorm_idx" ON "clientes"("telefonoNorm");

-- CreateIndex
CREATE INDEX "clientes_estado_idx" ON "clientes"("estado");

-- CreateIndex
CREATE INDEX "configuraciones_pedido_clienteId_idx" ON "configuraciones_pedido"("clienteId");

-- CreateIndex
CREATE INDEX "leads_emailNorm_idx" ON "leads"("emailNorm");

-- CreateIndex
CREATE INDEX "leads_telefonoNorm_idx" ON "leads"("telefonoNorm");

-- CreateIndex
CREATE INDEX "leads_clienteId_idx" ON "leads"("clienteId");

-- AddForeignKey
ALTER TABLE "configuraciones_pedido" ADD CONSTRAINT "configuraciones_pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;


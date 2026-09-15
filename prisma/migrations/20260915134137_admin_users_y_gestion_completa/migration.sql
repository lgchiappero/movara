-- AlterTable
ALTER TABLE "configuraciones_pedido" ADD COLUMN     "comprobantePagoUrl" TEXT,
ADD COLUMN     "comprobanteSaldoUrl" TEXT,
ADD COLUMN     "costoGruaDescarga" DOUBLE PRECISION,
ADD COLUMN     "costoTransporteLocal" DOUBLE PRECISION,
ADD COLUMN     "fechaPIPagado" TIMESTAMP(3),
ADD COLUMN     "fotosDespachadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fotosUrl" TEXT,
ADD COLUMN     "garantiaActivada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "garantiaFechaFin" TIMESTAMP(3),
ADD COLUMN     "garantiaFechaInicio" TIMESTAMP(3),
ADD COLUMN     "gastosDespachante" DOUBLE PRECISION,
ADD COLUMN     "gastosPortuarios" DOUBLE PRECISION,
ADD COLUMN     "impuestosAduana" DOUBLE PRECISION,
ADD COLUMN     "inspeccionFabrica" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inspeccionUrl" TEXT,
ADD COLUMN     "instalacionFecha" TIMESTAMP(3),
ADD COLUMN     "instalacionNotas" TEXT,
ADD COLUMN     "montoPI" DOUBLE PRECISION,
ADD COLUMN     "notasDespachador" TEXT,
ADD COLUMN     "piProveedor" TEXT,
ADD COLUMN     "piUrl" TEXT,
ADD COLUMN     "satisfaccionCliente" TEXT,
ADD COLUMN     "seguroTransporte" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seguroUrl" TEXT,
ADD COLUMN     "vendedorAsignado" TEXT;

-- CreateTable
CREATE TABLE "documentos_pedido" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notas" TEXT,
    "subidoPor" TEXT NOT NULL,

    CONSTRAINT "documentos_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'vendedor',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "documentos_pedido" ADD CONSTRAINT "documentos_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "configuraciones_pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

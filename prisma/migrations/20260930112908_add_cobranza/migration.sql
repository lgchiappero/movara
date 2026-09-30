-- CreateTable
CREATE TABLE "acuerdos_pago" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unidadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "contraparte" TEXT NOT NULL,
    "moneda" TEXT NOT NULL,
    "totalAcordado" DOUBLE PRECISION NOT NULL,
    "notas" TEXT,
    "registradoPor" TEXT NOT NULL,

    CONSTRAINT "acuerdos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acuerdoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    "vencimiento" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acuerdoId" TEXT NOT NULL,
    "cuotaId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    "modalidad" TEXT NOT NULL,
    "comprobanteUrl" TEXT,
    "notas" TEXT,
    "registradoPor" TEXT NOT NULL,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "acuerdos_pago" ADD CONSTRAINT "acuerdos_pago_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_acuerdoId_fkey" FOREIGN KEY ("acuerdoId") REFERENCES "acuerdos_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_acuerdoId_fkey" FOREIGN KEY ("acuerdoId") REFERENCES "acuerdos_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "cuotas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

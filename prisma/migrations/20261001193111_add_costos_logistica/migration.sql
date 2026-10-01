-- CreateTable
CREATE TABLE "costos_logistica" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "envioId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "descripcion" TEXT,
    "moneda" TEXT NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL,
    "comprobanteUrl" TEXT,
    "notas" TEXT,
    "prorrateado" BOOLEAN NOT NULL DEFAULT false,
    "registradoPor" TEXT NOT NULL,

    CONSTRAINT "costos_logistica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prorrateos_logistica" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costoId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "prorrateos_logistica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "costos_logistica_envioId_idx" ON "costos_logistica"("envioId");

-- CreateIndex
CREATE INDEX "prorrateos_logistica_unidadId_idx" ON "prorrateos_logistica"("unidadId");

-- CreateIndex
CREATE UNIQUE INDEX "prorrateos_logistica_costoId_unidadId_key" ON "prorrateos_logistica"("costoId", "unidadId");

-- AddForeignKey
ALTER TABLE "costos_logistica" ADD CONSTRAINT "costos_logistica_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "envios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prorrateos_logistica" ADD CONSTRAINT "prorrateos_logistica_costoId_fkey" FOREIGN KEY ("costoId") REFERENCES "costos_logistica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prorrateos_logistica" ADD CONSTRAINT "prorrateos_logistica_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

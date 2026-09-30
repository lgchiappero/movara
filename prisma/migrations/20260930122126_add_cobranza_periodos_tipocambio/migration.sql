-- CreateTable
CREATE TABLE "cierres_periodo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "cerradoPor" TEXT NOT NULL,
    "notas" TEXT,
    "totalCobradoUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCobradoARS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPagadoUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPagadoARS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margenUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "cierres_periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_cambio" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha" TIMESTAMP(3) NOT NULL,
    "usdArs" DOUBLE PRECISION NOT NULL,
    "fuente" TEXT,
    "cargadoPor" TEXT NOT NULL,

    CONSTRAINT "tipos_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cierres_periodo_mes_anio_key" ON "cierres_periodo"("mes", "anio");

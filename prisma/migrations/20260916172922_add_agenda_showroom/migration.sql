-- CreateTable
CREATE TABLE "citas" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horario" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'confirmada',
    "tipoCliente" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "razonSocial" TEXT,
    "consulta" TEXT NOT NULL,
    "canceladaPor" TEXT,
    "motivoCancelacion" TEXT,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad_agenda" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "habilitada" BOOLEAN NOT NULL DEFAULT true,
    "horarios" TEXT[],

    CONSTRAINT "disponibilidad_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "citas_fecha_horario_idx" ON "citas"("fecha", "horario");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidad_agenda_fecha_key" ON "disponibilidad_agenda"("fecha");

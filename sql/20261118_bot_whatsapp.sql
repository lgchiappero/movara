-- Bot de WhatsApp — etapa 1 (base de datos + panel). 2026-11-18.
--
-- Qué hace: crea 5 tablas nuevas (config_bot, leads_whatsapp,
-- mensajes_whatsapp, contactos_excluidos, uso_bot) con sus índices y la FK
-- de mensajes → leads (se borran en cascada con el lead), y habilita RLS
-- sin políticas en las 5.
-- Qué NO hace: no modifica ni borra ninguna tabla ni dato existente.
-- Es la misma migración que prisma/migrations/20261118120000_bot_whatsapp.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar todo → Run. Va en una
-- transacción: si algo falla, no queda nada a medias.

BEGIN;

-- CreateTable
CREATE TABLE "config_bot" (
    "id" TEXT NOT NULL DEFAULT 'unico',
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "modoHorario" BOOLEAN NOT NULL DEFAULT false,
    "horarioAtencion" JSONB NOT NULL,
    "modoRespaldo" TEXT NOT NULL DEFAULT 'MENSAJE_BIENVENIDA',
    "mensajeBienvenida" TEXT NOT NULL,
    "topeGastoMensualUsd" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "emailAviso" TEXT,
    "whatsappAviso" TEXT,
    "maxRespuestasPorLead" INTEGER NOT NULL DEFAULT 6,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "actualizadoPor" TEXT,

    CONSTRAINT "config_bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads_whatsapp" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "nombre" TEXT,
    "uso" TEXT,
    "zona" TEXT,
    "terreno" TEXT,
    "personas" TEXT,
    "plazo" TEXT,
    "origen" TEXT,
    "origenDetalle" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "controlHumano" BOOLEAN NOT NULL DEFAULT false,
    "respuestasBot" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "proximoContacto" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "ultimoMensajeEn" TIMESTAMP(3),

    CONSTRAINT "leads_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_whatsapp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'TEXTO',
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos_excluidos" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPor" TEXT,

    CONSTRAINT "contactos_excluidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uso_bot" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSalida" INTEGER NOT NULL DEFAULT 0,
    "costoUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uso_bot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_whatsapp_telefono_key" ON "leads_whatsapp"("telefono");

-- CreateIndex
CREATE INDEX "leads_whatsapp_estado_idx" ON "leads_whatsapp"("estado");

-- CreateIndex
CREATE INDEX "leads_whatsapp_ultimoMensajeEn_idx" ON "leads_whatsapp"("ultimoMensajeEn");

-- CreateIndex
CREATE INDEX "mensajes_whatsapp_leadId_creadoEn_idx" ON "mensajes_whatsapp"("leadId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "contactos_excluidos_telefono_key" ON "contactos_excluidos"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "uso_bot_mes_key" ON "uso_bot"("mes");

-- AddForeignKey
ALTER TABLE "mensajes_whatsapp" ADD CONSTRAINT "mensajes_whatsapp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads_whatsapp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS habilitado y sin políticas, como todas las tablas de public: la app
-- accede solo con Prisma (rol postgres) y la service role, que no se ven
-- afectadas (no se usa FORCE ROW LEVEL SECURITY).
ALTER TABLE "config_bot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads_whatsapp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mensajes_whatsapp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contactos_excluidos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "uso_bot" ENABLE ROW LEVEL SECURITY;

COMMIT;

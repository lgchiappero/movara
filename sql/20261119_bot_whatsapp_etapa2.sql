-- Bot de WhatsApp — etapa 2 (conexión con WhatsApp y Claude). 2026-11-19.
--
-- Qué hace: agrega columnas a 3 tablas que creó la etapa 1, todas opcionales
-- o con valor por defecto, y un índice único sobre una columna nueva:
--   leads_whatsapp:    ultimoEntranteEn (ventana de 24 h), bloqueoHasta (evita
--                      respuestas dobles), bienvenidaEnviadaEn (una sola vez).
--   mensajes_whatsapp: waMessageId (único: idempotencia de los webhooks de
--                      Meta) y estadoEntrega (registro de entregas).
--   uso_bot:           llamadas y avisoOchentaEn (aviso del 80 % una vez por mes).
-- Qué NO hace: no borra ni modifica columnas ni datos existentes.
-- Es la misma migración que prisma/migrations/20261119120000_bot_whatsapp_etapa2.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar todo → Run. Va en una
-- transacción: si algo falla, no queda nada a medias.

BEGIN;

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


COMMIT;

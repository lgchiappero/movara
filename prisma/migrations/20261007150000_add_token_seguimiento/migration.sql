-- Token secreto del link de seguimiento (/mi-pedido?t=...).
-- El DEFAULT volátil se evalúa por fila: cada pedido existente recibe su
-- propio token, y cualquier alta futura (configurador o pedido manual)
-- también, sin depender del código.
-- AlterTable
ALTER TABLE "configuraciones_pedido" ADD COLUMN     "tokenSeguimiento" TEXT NOT NULL DEFAULT (replace((gen_random_uuid())::text, '-'::text, ''::text) || replace((gen_random_uuid())::text, '-'::text, ''::text));

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_pedido_tokenSeguimiento_key" ON "configuraciones_pedido"("tokenSeguimiento");

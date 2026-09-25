-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "clienteId" TEXT,
ADD COLUMN     "etapa" TEXT NOT NULL DEFAULT 'nuevo',
ADD COLUMN     "motivoPerdida" TEXT,
ADD COLUMN     "notasVenta" TEXT,
ADD COLUMN     "origen" TEXT,
ADD COLUMN     "valorEstimado" DOUBLE PRECISION,
ADD COLUMN     "vendedorId" TEXT;

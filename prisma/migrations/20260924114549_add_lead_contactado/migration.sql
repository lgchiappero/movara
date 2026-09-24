-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "contactado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactadoEn" TIMESTAMP(3);

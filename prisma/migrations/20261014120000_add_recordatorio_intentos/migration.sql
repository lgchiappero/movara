-- AlterTable
ALTER TABLE "citas" ADD COLUMN     "recordatorioError" TEXT,
ADD COLUMN     "recordatorioIntentos" INTEGER NOT NULL DEFAULT 0;

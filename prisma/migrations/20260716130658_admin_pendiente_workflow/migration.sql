/*
  Warnings:

  - Added the required column `updatedAt` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "configuraciones_pedido" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "modelo" DROP NOT NULL,
ALTER COLUMN "zonaClimatica" DROP NOT NULL,
ALTER COLUMN "banoInodoro" DROP NOT NULL,
ALTER COLUMN "banoEspejo" DROP NOT NULL,
ALTER COLUMN "banoDucha" DROP NOT NULL,
ALTER COLUMN "cocinaTipo" DROP NOT NULL,
ALTER COLUMN "energiaSolar" DROP NOT NULL,
ALTER COLUMN "calefon" DROP NOT NULL,
ALTER COLUMN "galeria" DROP NOT NULL,
ALTER COLUMN "estado" SET DEFAULT 'pendiente',
ALTER COLUMN "banoColorSanitarios" DROP NOT NULL,
ALTER COLUMN "banoRevestimiento" DROP NOT NULL,
ALTER COLUMN "cocinaColorMuebles" DROP NOT NULL,
ALTER COLUMN "cocinaRevestimiento" DROP NOT NULL,
ALTER COLUMN "paredExteriorColor" DROP NOT NULL,
ALTER COLUMN "paredExteriorRevestimiento" DROP NOT NULL,
ALTER COLUMN "paredInteriorColor" DROP NOT NULL,
ALTER COLUMN "paredInteriorRevestimiento" DROP NOT NULL,
ALTER COLUMN "puertaInteriorColor" DROP NOT NULL,
ALTER COLUMN "puertaInteriorTipo" DROP NOT NULL,
ALTER COLUMN "puertaPrincipalColor" DROP NOT NULL,
ALTER COLUMN "puertaPrincipalMaterial" DROP NOT NULL,
ALTER COLUMN "puertaPrincipalTipo" DROP NOT NULL,
ALTER COLUMN "ventanaTipo" DROP NOT NULL;

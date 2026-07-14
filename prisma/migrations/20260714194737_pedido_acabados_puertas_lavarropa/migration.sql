/*
  Warnings:

  - You are about to drop the column `lavarropas` on the `configuraciones_pedido` table. All the data in the column will be lost.
  - Added the required column `banoColorSanitarios` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `banoRevestimiento` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cocinaColorMuebles` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cocinaRevestimiento` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paredExteriorColor` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paredExteriorRevestimiento` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paredInteriorColor` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paredInteriorRevestimiento` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertaInteriorColor` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertaInteriorTipo` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertaPrincipalColor` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertaPrincipalMaterial` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `puertaPrincipalTipo` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ventanaTipo` to the `configuraciones_pedido` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "configuraciones_pedido" DROP COLUMN "lavarropas",
ADD COLUMN     "banoColorSanitarios" TEXT NOT NULL,
ADD COLUMN     "banoRevestimiento" TEXT NOT NULL,
ADD COLUMN     "cocinaColorMuebles" TEXT NOT NULL,
ADD COLUMN     "cocinaRevestimiento" TEXT NOT NULL,
ADD COLUMN     "lavarropaIncluye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lavarropaUbicacion" TEXT,
ADD COLUMN     "paredExteriorColor" TEXT NOT NULL,
ADD COLUMN     "paredExteriorRevestimiento" TEXT NOT NULL,
ADD COLUMN     "paredInteriorColor" TEXT NOT NULL,
ADD COLUMN     "paredInteriorRevestimiento" TEXT NOT NULL,
ADD COLUMN     "puertaInteriorColor" TEXT NOT NULL,
ADD COLUMN     "puertaInteriorTipo" TEXT NOT NULL,
ADD COLUMN     "puertaPrincipalColor" TEXT NOT NULL,
ADD COLUMN     "puertaPrincipalMaterial" TEXT NOT NULL,
ADD COLUMN     "puertaPrincipalTipo" TEXT NOT NULL,
ADD COLUMN     "ventanaTipo" TEXT NOT NULL;

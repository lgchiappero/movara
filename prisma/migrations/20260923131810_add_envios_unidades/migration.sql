-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "cuit" TEXT,
    "domicilio" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "notas" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numeroPI" TEXT,
    "numeroBL" TEXT,
    "numeroContenedor" TEXT,
    "fechaEmbarque" TIMESTAMP(3),
    "fechaArriboEstimado" TIMESTAMP(3),
    "fechaArribo" TIMESTAMP(3),
    "costoPI" DOUBLE PRECISION,
    "costoFlete" DOUBLE PRECISION,
    "costoSeguro" DOUBLE PRECISION,
    "costoAduana" DOUBLE PRECISION,
    "costoOtrosInternacional" DOUBLE PRECISION,
    "notas" TEXT,

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numeroUnidad" TEXT,
    "clienteId" TEXT NOT NULL,
    "envioId" TEXT,
    "modelo" TEXT,
    "configuracion" JSONB,
    "precioCliente" DOUBLE PRECISION,
    "estadoFabricacion" TEXT NOT NULL DEFAULT 'pendiente',
    "provinciaDestino" TEXT,
    "localidadDestino" TEXT,
    "direccionEntrega" TEXT,
    "costoTransporteNacional" DOUBLE PRECISION,
    "costoGrua" DOUBLE PRECISION,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "garantiaActivada" BOOLEAN NOT NULL DEFAULT false,
    "garantiaInicio" TIMESTAMP(3),
    "garantiaFin" TIMESTAMP(3),
    "notas" TEXT,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_envio" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envioId" TEXT NOT NULL,
    "seccion" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "subidoPor" TEXT NOT NULL,

    CONSTRAINT "documentos_envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_unidad" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unidadId" TEXT NOT NULL,
    "seccion" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "subidoPor" TEXT NOT NULL,

    CONSTRAINT "documentos_unidad_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "envios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_envio" ADD CONSTRAINT "documentos_envio_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "envios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_unidad" ADD CONSTRAINT "documentos_unidad_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

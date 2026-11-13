-- Fechas SIN HORA corridas — SOLO LECTURA (un SELECT, no escribe nada).
--
-- Los campos de solo fecha (vencimientos, fechas de pago, de entrega, de
-- citas, garantía…) se guardan a medianoche UTC: "2026-11-30 00:00:00".
-- Si alguno quedó con otra hora (por ejemplo 03:00, la medianoche
-- argentina, o la hora en que se cargó), se mostraría o compararía con un
-- día de diferencia. Esta consulta lista esos casos; si sale vacía, no hay
-- nada que corregir.
--
-- Columnas: tabla | columna | id | guardado_utc | se_veria_en_argentina_antes

SELECT * FROM (
  SELECT 'cuotas' AS tabla, 'vencimiento' AS columna, id::text AS id,
         to_char("vencimiento", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("vencimiento" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM cuotas WHERE "vencimiento" IS NOT NULL AND "vencimiento"::time <> '00:00:00'
  UNION ALL
  SELECT 'movimientos' AS tabla, 'fecha' AS columna, id::text AS id,
         to_char("fecha", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM movimientos WHERE "fecha" IS NOT NULL AND "fecha"::time <> '00:00:00'
  UNION ALL
  SELECT 'costos_logistica' AS tabla, 'fecha' AS columna, id::text AS id,
         to_char("fecha", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM costos_logistica WHERE "fecha" IS NOT NULL AND "fecha"::time <> '00:00:00'
  UNION ALL
  SELECT 'tipos_cambio' AS tabla, 'fecha' AS columna, id::text AS id,
         to_char("fecha", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM tipos_cambio WHERE "fecha" IS NOT NULL AND "fecha"::time <> '00:00:00'
  UNION ALL
  SELECT 'citas' AS tabla, 'fecha' AS columna, id::text AS id,
         to_char("fecha", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM citas WHERE "fecha" IS NOT NULL AND "fecha"::time <> '00:00:00'
  UNION ALL
  SELECT 'disponibilidad_agenda' AS tabla, 'fecha' AS columna, id::text AS id,
         to_char("fecha", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM disponibilidad_agenda WHERE "fecha" IS NOT NULL AND "fecha"::time <> '00:00:00'
  UNION ALL
  SELECT 'unidades' AS tabla, 'fechaEntregaEstimada' AS columna, id::text AS id,
         to_char("fechaEntregaEstimada", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaEntregaEstimada" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM unidades WHERE "fechaEntregaEstimada" IS NOT NULL AND "fechaEntregaEstimada"::time <> '00:00:00'
  UNION ALL
  SELECT 'unidades' AS tabla, 'fechaEntrega' AS columna, id::text AS id,
         to_char("fechaEntrega", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaEntrega" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM unidades WHERE "fechaEntrega" IS NOT NULL AND "fechaEntrega"::time <> '00:00:00'
  UNION ALL
  SELECT 'unidades' AS tabla, 'garantiaInicio' AS columna, id::text AS id,
         to_char("garantiaInicio", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("garantiaInicio" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM unidades WHERE "garantiaInicio" IS NOT NULL AND "garantiaInicio"::time <> '00:00:00'
  UNION ALL
  SELECT 'unidades' AS tabla, 'garantiaFin' AS columna, id::text AS id,
         to_char("garantiaFin", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("garantiaFin" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM unidades WHERE "garantiaFin" IS NOT NULL AND "garantiaFin"::time <> '00:00:00'
  UNION ALL
  SELECT 'envios' AS tabla, 'fechaEmbarque' AS columna, id::text AS id,
         to_char("fechaEmbarque", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaEmbarque" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM envios WHERE "fechaEmbarque" IS NOT NULL AND "fechaEmbarque"::time <> '00:00:00'
  UNION ALL
  SELECT 'envios' AS tabla, 'fechaArriboEstimado' AS columna, id::text AS id,
         to_char("fechaArriboEstimado", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaArriboEstimado" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM envios WHERE "fechaArriboEstimado" IS NOT NULL AND "fechaArriboEstimado"::time <> '00:00:00'
  UNION ALL
  SELECT 'envios' AS tabla, 'fechaArribo' AS columna, id::text AS id,
         to_char("fechaArribo", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaArribo" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM envios WHERE "fechaArribo" IS NOT NULL AND "fechaArribo"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'fechaConfirmacion' AS columna, id::text AS id,
         to_char("fechaConfirmacion", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaConfirmacion" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "fechaConfirmacion" IS NOT NULL AND "fechaConfirmacion"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'fechaProduccion' AS columna, id::text AS id,
         to_char("fechaProduccion", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaProduccion" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "fechaProduccion" IS NOT NULL AND "fechaProduccion"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'fechaDespacho' AS columna, id::text AS id,
         to_char("fechaDespacho", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaDespacho" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "fechaDespacho" IS NOT NULL AND "fechaDespacho"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'fechaArriboEstimado' AS columna, id::text AS id,
         to_char("fechaArriboEstimado", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaArriboEstimado" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "fechaArriboEstimado" IS NOT NULL AND "fechaArriboEstimado"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'fechaEntrega' AS columna, id::text AS id,
         to_char("fechaEntrega", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaEntrega" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "fechaEntrega" IS NOT NULL AND "fechaEntrega"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'fechaPIPagado' AS columna, id::text AS id,
         to_char("fechaPIPagado", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaPIPagado" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "fechaPIPagado" IS NOT NULL AND "fechaPIPagado"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'instalacionFecha' AS columna, id::text AS id,
         to_char("instalacionFecha", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("instalacionFecha" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "instalacionFecha" IS NOT NULL AND "instalacionFecha"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'garantiaFechaInicio' AS columna, id::text AS id,
         to_char("garantiaFechaInicio", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("garantiaFechaInicio" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "garantiaFechaInicio" IS NOT NULL AND "garantiaFechaInicio"::time <> '00:00:00'
  UNION ALL
  SELECT 'configuraciones_pedido' AS tabla, 'garantiaFechaFin' AS columna, id::text AS id,
         to_char("garantiaFechaFin", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("garantiaFechaFin" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM configuraciones_pedido WHERE "garantiaFechaFin" IS NOT NULL AND "garantiaFechaFin"::time <> '00:00:00'
  UNION ALL
  SELECT 'recibos_conformidad' AS tabla, 'fechaEntrega' AS columna, id::text AS id,
         to_char("fechaEntrega", 'YYYY-MM-DD HH24:MI:SS') AS guardado_utc,
         to_char("fechaEntrega" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Cordoba', 'YYYY-MM-DD') AS se_veria_en_argentina_antes
  FROM recibos_conformidad WHERE "fechaEntrega" IS NOT NULL AND "fechaEntrega"::time <> '00:00:00'
) t
ORDER BY tabla, columna, guardado_utc;

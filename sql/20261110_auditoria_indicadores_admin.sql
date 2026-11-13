-- Auditoría de consistencia del admin: cada indicador con el criterio del
-- CONTADOR y el de la LISTA a la que lleva, lado a lado.
-- SOLO LECTURA: una sola sentencia SELECT, no escribe nada.
--
-- Columnas: orden | indicador | criterio_contador | contador | criterio_lista | lista | difiere
--           | detalle (para las filas de la sección DETALLE)
--
-- "hoy" se calcula de dos maneras:
--   hoy_utc → lo que hace hoy la app en Vercel (el servidor corre en UTC:
--             setHours(0,0,0,0) = medianoche UTC = 21:00 del día anterior en Córdoba)
--   hoy_cba → el día calendario en America/Argentina/Cordoba
-- Las fechas date-only (vencimiento de cuotas, fecha de citas) se guardan a
-- medianoche UTC.
--
-- Sección 9_DETALLE: los registros concretos que suma "Pagos vencidos" de
-- /admin/pagos, para identificar el "1 pago vencido" que la lista no muestra.

WITH
p AS (
  SELECT (now() AT TIME ZONE 'UTC')::date::timestamp                                  AS hoy_utc,
         (now() AT TIME ZONE 'America/Argentina/Cordoba')::date::timestamp            AS hoy_cba,
         date_trunc('month', now() AT TIME ZONE 'UTC')                                 AS mes_utc,
         date_trunc('month', now() AT TIME ZONE 'America/Argentina/Cordoba')           AS mes_cba_local,
         (now() AT TIME ZONE 'UTC')                                                    AS ahora_utc
),
-- ── Planes (acuerdos) con totales ─────────────────────────────────────────
plan AS (
  SELECT a.id, a."unidadId", a.tipo, a.moneda, a."totalAcordado",
         COALESCE((SELECT sum(m.importe) FROM movimientos m WHERE m."acuerdoId" = a.id), 0) AS pagado
  FROM acuerdos_pago a
),
-- ── Imputación de pagos a cuotas (igual que src/lib/cobranza/imputacion.ts) ─
cu AS (
  SELECT c.*, COALESCE((SELECT sum(m.importe) FROM movimientos m WHERE m."cuotaId" = c.id), 0) AS asignado
  FROM cuotas c
),
libre AS (
  SELECT a.id AS acuerdo_id,
         COALESCE((SELECT sum(m.importe) FROM movimientos m
                   WHERE m."acuerdoId" = a.id
                     AND (m."cuotaId" IS NULL
                          OR m."cuotaId" NOT IN (SELECT id FROM cuotas WHERE "acuerdoId" = a.id))), 0)
       + COALESCE((SELECT sum(greatest(cu.asignado - cu.importe, 0)) FROM cu WHERE cu."acuerdoId" = a.id), 0) AS pool
  FROM acuerdos_pago a
),
ord AS (
  SELECT cu.*,
         cu.importe - least(cu.asignado, cu.importe) AS falta,
         COALESCE(sum(cu.importe - least(cu.asignado, cu.importe)) OVER (
           PARTITION BY cu."acuerdoId" ORDER BY cu.vencimiento ASC NULLS LAST, cu."createdAt", cu.id
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS previo
  FROM cu
),
cuota_real AS (
  SELECT o.id, o."acuerdoId", o.vencimiento, o.estado,
         CASE WHEN o.falta - greatest(0, least(o.falta, l.pool - o.previo)) <= 0.01 THEN 0
              ELSE o.falta - greatest(0, least(o.falta, l.pool - o.previo)) END AS restante
  FROM ord o JOIN libre l ON l.acuerdo_id = o."acuerdoId"
),
-- ── Pagos a proveedores ───────────────────────────────────────────────────
-- estadoPagoUnidad (lista de /admin/pagos y parte del contador "Pagos vencidos"):
-- plan no saldado y alguna cuota con estado 'vencido' o (≠ 'pagado' y vencimiento < hoy).
plan_pago_vencido_lista AS (
  SELECT pl.* FROM plan pl, p
  WHERE pl.tipo = 'pago'
    AND pl.pagado < pl."totalAcordado" - 0.01
    AND EXISTS (SELECT 1 FROM cuotas c WHERE c."acuerdoId" = pl.id
                AND (c.estado = 'vencido' OR (c.estado <> 'pagado' AND c.vencimiento < p.hoy_utc)))
),
costo_vencido AS (
  SELECT cl.* FROM costos_logistica cl, p
  WHERE cl.estado = 'pendiente' AND cl.fecha < p.hoy_utc
),
-- ── Cobranza: filas unidad × moneda con "tieneVencidas" (lista y tarjeta de /admin/cobranza)
fila_cobro_vencida AS (
  SELECT DISTINCT a."unidadId", a.moneda
  FROM acuerdos_pago a JOIN cuotas c ON c."acuerdoId" = a.id, p
  WHERE a.tipo = 'cobro'
    AND c.estado <> 'pagado'
    AND (c.estado = 'vencido' OR c.vencimiento < p.hoy_utc)
),
fila_cobro_semana AS (
  SELECT DISTINCT a."unidadId", a.moneda
  FROM acuerdos_pago a JOIN cuotas c ON c."acuerdoId" = a.id, p
  WHERE a.tipo = 'cobro' AND c.estado <> 'pagado'
    AND c.vencimiento >= p.hoy_utc AND c.vencimiento < p.hoy_utc + interval '7 days'
)
SELECT orden, indicador, criterio_contador, contador, criterio_lista, lista,
       CASE WHEN contador IS DISTINCT FROM lista THEN 'SÍ' ELSE 'no' END AS difiere, detalle
FROM (
  -- 1. /admin/pagos — tarjeta "Pagos vencidos" → /admin/pagos?estado=vencido
  SELECT '1_PAGOS' AS orden, 'Pagos > "Pagos vencidos"' AS indicador,
         'planes de pago vencidos (estadoPagoUnidad) + costos de logística pendientes con fecha < hoy' AS criterio_contador,
         (SELECT count(*) FROM plan_pago_vencido_lista) + (SELECT count(*) FROM costo_vencido) AS contador,
         'tab "Por unidad" filtrada por vencido (solo planes; la logística está en otro tab y sin ese filtro)' AS criterio_lista,
         (SELECT count(*) FROM plan_pago_vencido_lista) AS lista,
         NULL::text AS detalle
  UNION ALL
  -- 2. Dashboard — alerta pagos a proveedores vencidos → /admin/pagos?estado=vencidas
  SELECT '2_DASHBOARD', 'Dashboard > alerta "unidades con pagos a proveedores vencidos"',
         'UNIDADES con alguna cuota de pago vencida con saldo real (imputación)',
         (SELECT count(DISTINCT a."unidadId") FROM cuota_real cr JOIN acuerdos_pago a ON a.id = cr."acuerdoId", p
           WHERE a.tipo = 'pago' AND cr.restante > 0 AND cr.vencimiento < p.hoy_utc),
         'PLANES con estadoPagoUnidad = vencido (estado guardado de la cuota)',
         (SELECT count(*) FROM plan_pago_vencido_lista), NULL
  UNION ALL
  -- 3. Dashboard — alerta cuotas de cobro vencidas → /admin/cobranza?estado=vencidas
  SELECT '2_DASHBOARD', 'Dashboard > alerta "unidades con cuotas de cobro vencidas"',
         'UNIDADES con alguna cuota de cobro vencida con saldo real (imputación)',
         (SELECT count(DISTINCT a."unidadId") FROM cuota_real cr JOIN acuerdos_pago a ON a.id = cr."acuerdoId", p
           WHERE a.tipo = 'cobro' AND cr.restante > 0 AND cr.vencimiento < p.hoy_utc),
         'filas unidad×moneda con cuota ≠ pagado y (vencido o vencimiento < hoy)',
         (SELECT count(*) FROM fila_cobro_vencida), NULL
  UNION ALL
  -- 4. Dashboard — "cuotas de cobro vencen esta semana" (alerta + KPI) → /admin/cobranza?vence=semana
  SELECT '2_DASHBOARD', 'Dashboard > "cuotas de cobro que vencen esta semana" (alerta y KPI)',
         'CUOTAS de cobro con saldo real que vencen en [hoy, hoy+7)',
         (SELECT count(*) FROM cuota_real cr JOIN acuerdos_pago a ON a.id = cr."acuerdoId", p
           WHERE a.tipo = 'cobro' AND cr.restante > 0
             AND cr.vencimiento >= p.hoy_utc AND cr.vencimiento < p.hoy_utc + interval '7 days'),
         'filas unidad×moneda con cuota ≠ pagado (estado guardado) que vence en [hoy, hoy+7)',
         (SELECT count(*) FROM fila_cobro_semana), NULL
  UNION ALL
  -- 5. Dashboard — "Leads nuevos hoy" → /admin/pipeline?etapa=nuevo&desde=hoy
  SELECT '2_DASHBOARD', 'Dashboard > KPI "Leads nuevos hoy"',
         'leads creados desde hoy (cualquier etapa)',
         (SELECT count(*) FROM leads l, p WHERE l."createdAt" >= p.hoy_utc),
         'leads creados desde hoy Y en etapa "nuevo"',
         (SELECT count(*) FROM leads l, p WHERE l."createdAt" >= p.hoy_utc AND l.etapa = 'nuevo'), NULL
  UNION ALL
  -- 6. Dashboard — "En negociación" → /admin/pipeline?etapa=en_contacto,propuesta_enviada
  SELECT '2_DASHBOARD', 'Dashboard > KPI "En negociación"',
         'etapas nuevo + en_contacto + propuesta_enviada',
         (SELECT count(*) FROM leads WHERE etapa IN ('nuevo', 'en_contacto', 'propuesta_enviada')),
         'etapas en_contacto + propuesta_enviada (sin "nuevo")',
         (SELECT count(*) FROM leads WHERE etapa IN ('en_contacto', 'propuesta_enviada')), NULL
  UNION ALL
  -- 7. Dashboard — "leads sin respuesta hace más de 48hs" → /admin/pipeline?sinContactar=1
  SELECT '2_DASHBOARD', 'Dashboard > alerta "leads sin respuesta hace más de 48hs"',
         'contactado = false y creado hace más de 48 h',
         (SELECT count(*) FROM leads l, p WHERE NOT l.contactado AND l."createdAt" <= p.ahora_utc - interval '48 hours'),
         'contactado = false (sin el límite de 48 h)',
         (SELECT count(*) FROM leads WHERE NOT contactado), NULL
  UNION ALL
  -- 8. Dashboard — "unidades en aduana hace más de 15 días" → /admin/unidades?estado=en_aduana
  SELECT '2_DASHBOARD', 'Dashboard > alerta "unidades en aduana hace más de 15 días"',
         'en_aduana y updatedAt de hace más de 15 días',
         (SELECT count(*) FROM unidades u, p WHERE u."estadoFabricacion" = 'en_aduana' AND u."updatedAt" <= p.ahora_utc - interval '15 days'),
         'todas las unidades en_aduana',
         (SELECT count(*) FROM unidades WHERE "estadoFabricacion" = 'en_aduana'), NULL
  UNION ALL
  -- 9. Dashboard — "pedidos confirmados sin anticipo hace más de 7 días" → /admin/configuraciones
  SELECT '2_DASHBOARD', 'Dashboard > alerta "pedidos confirmados sin anticipo hace más de 7 días"',
         'confirmado, anticipo null, confirmado hace más de 7 días',
         (SELECT count(*) FROM configuraciones_pedido c, p
           WHERE c."estadoPedido" = 'confirmado' AND c.anticipo IS NULL AND c."fechaConfirmacion" <= p.ahora_utc - interval '7 days'),
         'todos los pedidos (la lista no tiene filtro)',
         (SELECT count(*) FROM configuraciones_pedido), NULL
  UNION ALL
  -- 10. Cobranza — tarjeta "Unidades con cuotas vencidas" → /admin/cobranza?estado=vencidas
  SELECT '3_COBRANZA', 'Cobranza > "Unidades con cuotas vencidas"',
         'UNIDADES distintas con tieneVencidas',
         (SELECT count(DISTINCT "unidadId") FROM fila_cobro_vencida),
         'filas unidad×moneda con tieneVencidas',
         (SELECT count(*) FROM fila_cobro_vencida), NULL
  UNION ALL
  -- 11. Zona horaria: los indicadores "de hoy" y "del mes" con UTC vs Córdoba
  SELECT '4_ZONA_HORARIA', 'Leads nuevos hoy (dashboard y pipeline)',
         'hoy en UTC (lo que hace la app)', (SELECT count(*) FROM leads l, p WHERE l."createdAt" >= p.hoy_utc),
         'hoy en Córdoba', (SELECT count(*) FROM leads l, p WHERE l."createdAt" >= p.hoy_cba + interval '3 hours'), NULL
  UNION ALL
  SELECT '4_ZONA_HORARIA', 'Ganados este mes (dashboard y pipeline)',
         'mes en UTC', (SELECT count(*) FROM leads l, p WHERE l.etapa = 'ganado' AND l."createdAt" >= p.mes_utc),
         'mes en Córdoba', (SELECT count(*) FROM leads l, p WHERE l.etapa = 'ganado' AND l."createdAt" >= p.mes_cba_local + interval '3 hours'), NULL
  UNION ALL
  SELECT '4_ZONA_HORARIA', 'Cuotas vencidas (cualquier tipo, por fecha)',
         'vencimiento < hoy UTC', (SELECT count(*) FROM cuota_real cr, p WHERE cr.restante > 0 AND cr.vencimiento < p.hoy_utc),
         'vencimiento < hoy Córdoba', (SELECT count(*) FROM cuota_real cr, p WHERE cr.restante > 0 AND cr.vencimiento < p.hoy_cba), NULL
  UNION ALL
  SELECT '4_ZONA_HORARIA', 'Dashboard > "Agenda del día"',
         'citas con fecha = hoy UTC (incluye canceladas)', (SELECT count(*) FROM citas c, p WHERE c.fecha = p.hoy_utc),
         'citas con fecha = hoy Córdoba, sin canceladas',
         (SELECT count(*) FROM citas c, p WHERE c.fecha = p.hoy_cba AND c.estado <> 'cancelada'), NULL
  UNION ALL
  -- 9. DETALLE: qué suma "Pagos vencidos" de /admin/pagos
  SELECT '9_DETALLE', 'Pagos vencidos — plan de pago (sí aparece en la lista)',
         NULL, NULL, NULL, NULL,
         'acuerdo ' || pl.id || ' · unidad ' || coalesce(u."numeroUnidad", pl."unidadId") || ' · ' || pl.moneda
           || ' total ' || pl."totalAcordado" || ' pagado ' || pl.pagado
  FROM plan_pago_vencido_lista pl JOIN unidades u ON u.id = pl."unidadId"
  UNION ALL
  SELECT '9_DETALLE', 'Pagos vencidos — costo de logística (NO aparece en la lista)',
         NULL, NULL, NULL, NULL,
         'costo ' || cv.id || ' · ' || cv.concepto || coalesce(' (' || cv.descripcion || ')', '') || ' · '
           || cv.moneda || ' ' || cv.importe || ' · fecha ' || to_char(cv.fecha, 'YYYY-MM-DD')
           || ' · envío ' || coalesce(e."numeroPI", cv."envioId") || ' · estado ' || cv.estado
  FROM costo_vencido cv LEFT JOIN envios e ON e.id = cv."envioId"
) t
ORDER BY orden, indicador;

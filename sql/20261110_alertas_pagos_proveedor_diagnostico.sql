-- Diagnóstico: por qué siguen las alertas de "pagos a proveedores vencidos"
-- del dashboard — SOLO LECTURA (una sola sentencia SELECT, no escribe nada).
--
-- Trae los acuerdos tipo "pago" que hoy disparan la alerta con el criterio
-- VIEJO del dashboard (alguna cuota con vencimiento < hoy y estado <> 'pagado')
-- y, para cada uno:
--   ACUERDO     total acordado, total de movimientos y saldo del plan
--   CUOTA       estado guardado vs. estado real (imputando los pagos como el
--               código nuevo, src/lib/cobranza/imputacion.ts) y diagnóstico
--   MOVIMIENTO  cada pago registrado y a qué cuota quedó imputado
--               ("(sin cuota específica)" = no se eligió cuota al registrarlo)
--
-- Imputación (igual que el código): cada pago con cuota salda esa cuota hasta
-- su importe; los pagos sin cuota y los excedentes se aplican a las cuotas
-- con saldo por vencimiento ascendente (sin vencimiento al final).

WITH
ac AS (
  SELECT a.*
  FROM acuerdos_pago a
  WHERE a.tipo = 'pago'
    AND EXISTS (
      SELECT 1 FROM cuotas c
      WHERE c."acuerdoId" = a.id AND c.vencimiento < current_date AND c.estado <> 'pagado'
    )
),
cu AS (
  SELECT c.*,
         COALESCE((SELECT sum(m.importe) FROM movimientos m WHERE m."cuotaId" = c.id), 0) AS asignado
  FROM cuotas c
  JOIN ac ON ac.id = c."acuerdoId"
),
libre AS (
  SELECT ac.id AS acuerdo_id,
         COALESCE((SELECT sum(m.importe) FROM movimientos m
                   WHERE m."acuerdoId" = ac.id
                     AND (m."cuotaId" IS NULL
                          OR m."cuotaId" NOT IN (SELECT id FROM cuotas WHERE "acuerdoId" = ac.id))), 0)
       + COALESCE((SELECT sum(greatest(cu.asignado - cu.importe, 0)) FROM cu WHERE cu."acuerdoId" = ac.id), 0)
         AS pool
  FROM ac
),
ord AS (
  SELECT cu.*,
         least(cu.asignado, cu.importe) AS directo,
         cu.importe - least(cu.asignado, cu.importe) AS falta,
         COALESCE(sum(cu.importe - least(cu.asignado, cu.importe)) OVER (
           PARTITION BY cu."acuerdoId"
           ORDER BY cu.vencimiento ASC NULLS LAST, cu."createdAt", cu.id
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS previo
  FROM cu
),
imp AS (
  SELECT o.*,
         greatest(0, least(o.falta, l.pool - o.previo)) AS del_libre
  FROM ord o
  JOIN libre l ON l.acuerdo_id = o."acuerdoId"
),
res AS (
  SELECT i.*,
         CASE WHEN i.falta - i.del_libre <= 0.01 THEN 0 ELSE i.falta - i.del_libre END AS restante
  FROM imp i
),
est AS (
  SELECT r.*,
         CASE WHEN r.restante = 0 THEN 'pagado'
              WHEN r.vencimiento < current_date THEN 'vencido'
              ELSE 'pendiente' END AS estado_real
  FROM res r
)
SELECT * FROM (
  -- ACUERDO
  SELECT 1 AS orden, ac.id AS acuerdo_id, u."numeroUnidad" AS unidad, ac.contraparte AS proveedor,
         ac.concepto, ac.moneda,
         'ACUERDO' AS seccion,
         coalesce(ac.descripcion, '') AS detalle,
         ac."totalAcordado"::text AS importe,
         NULL::text AS fecha,
         NULL::text AS estado_guardado,
         (SELECT coalesce(sum(m.importe), 0) FROM movimientos m WHERE m."acuerdoId" = ac.id)::text AS pagado,
         greatest(0, ac."totalAcordado"
                     - (SELECT coalesce(sum(m.importe), 0) FROM movimientos m WHERE m."acuerdoId" = ac.id))::text
           AS restante,
         NULL::text AS estado_real,
         CASE WHEN (SELECT coalesce(sum(m.importe), 0) FROM movimientos m WHERE m."acuerdoId" = ac.id)
                   >= ac."totalAcordado" - 0.01
              THEN 'Plan SALDADO (en /admin/pagos figura "Saldado") pero el dashboard lo sigue alertando'
              ELSE 'Plan con saldo' END AS diagnostico
  FROM ac JOIN unidades u ON u.id = ac."unidadId"

  UNION ALL
  -- CUOTA
  SELECT 2, e."acuerdoId", u."numeroUnidad", ac.contraparte, ac.concepto, ac.moneda,
         'CUOTA',
         e.descripcion,
         e.importe::text,
         to_char(e.vencimiento, 'YYYY-MM-DD'),
         e.estado,
         (e.directo + e.del_libre)::text || ' (con cuota: ' || e.directo::text || ', sin cuota/excedente: ' || e.del_libre::text || ')',
         e.restante::text,
         e.estado_real,
         CASE
           WHEN e.estado <> 'pagado' AND e.vencimiento < current_date AND e.restante = 0
             THEN 'FALSA ALERTA: la cuota está cubierta por pagos sin cuota específica o excedentes, pero Cuota.estado quedó en "' || e.estado || '" (nunca se recalculó)'
           WHEN e.estado <> 'pagado' AND e.vencimiento < current_date
             THEN 'ALERTA REAL: vencida, faltan ' || e.restante::text || ' ' || ac.moneda
           WHEN e.estado <> e.estado_real
             THEN 'No alerta, pero el estado guardado no coincide con el real'
           ELSE 'OK'
         END
  FROM est e
  JOIN ac ON ac.id = e."acuerdoId"
  JOIN unidades u ON u.id = ac."unidadId"

  UNION ALL
  -- MOVIMIENTO
  SELECT 3, m."acuerdoId", u."numeroUnidad", ac.contraparte, ac.concepto, ac.moneda,
         'MOVIMIENTO',
         coalesce(c.descripcion, '(sin cuota específica)') || ' — ' || m.modalidad
           || coalesce(' — ' || m.notas, ''),
         m.importe::text,
         to_char(m.fecha, 'YYYY-MM-DD'),
         NULL, NULL, NULL, NULL,
         'registrado ' || to_char(m."createdAt", 'YYYY-MM-DD HH24:MI') || ' por ' || m."registradoPor"
  FROM movimientos m
  JOIN ac ON ac.id = m."acuerdoId"
  JOIN unidades u ON u.id = ac."unidadId"
  LEFT JOIN cuotas c ON c.id = m."cuotaId"
) t
ORDER BY unidad, acuerdo_id, orden, fecha NULLS LAST;

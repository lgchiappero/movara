-- Corrección de Cuota.estado — CORRIDA EN SECO (solo lectura, un SELECT).
--
-- Mismo criterio de imputación que src/lib/cobranza/imputacion.ts: cada pago
-- con cuota salda esa cuota hasta su importe; los pagos sin cuota específica y
-- los excedentes se aplican a las cuotas con saldo por vencimiento ascendente
-- (sin vencimiento al final). Una cuota está pagada cuando lo imputado cubre
-- su importe (tolerancia 0,01); si no, vencida (vencimiento < hoy) o pendiente.
-- Alcanza a TODAS las cuotas (cobros y pagos). Idempotente: una segunda corrida
-- no encuentra nada para corregir.
--
-- Lista las cuotas cuyo estado guardado no coincide con el real. Si sale vacío,
-- no hace falta correr el _aplicar.

WITH
cu AS (
  SELECT c.*,
         COALESCE((SELECT sum(m.importe) FROM movimientos m WHERE m."cuotaId" = c.id), 0) AS asignado
  FROM cuotas c
),
libre AS (
  SELECT a.id AS acuerdo_id,
         COALESCE((SELECT sum(m.importe) FROM movimientos m
                   WHERE m."acuerdoId" = a.id
                     AND (m."cuotaId" IS NULL
                          OR m."cuotaId" NOT IN (SELECT id FROM cuotas WHERE "acuerdoId" = a.id))), 0)
       + COALESCE((SELECT sum(greatest(cu.asignado - cu.importe, 0)) FROM cu WHERE cu."acuerdoId" = a.id), 0)
         AS pool
  FROM acuerdos_pago a
),
ord AS (
  SELECT cu.*,
         cu.importe - least(cu.asignado, cu.importe) AS falta,
         COALESCE(sum(cu.importe - least(cu.asignado, cu.importe)) OVER (
           PARTITION BY cu."acuerdoId"
           ORDER BY cu.vencimiento ASC NULLS LAST, cu."createdAt", cu.id
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS previo
  FROM cu
),
res AS (
  SELECT o.id, o."acuerdoId", o.descripcion, o.importe, o.vencimiento, o.estado,
         CASE WHEN o.falta - greatest(0, least(o.falta, l.pool - o.previo)) <= 0.01 THEN 0
              ELSE o.falta - greatest(0, least(o.falta, l.pool - o.previo)) END AS restante
  FROM ord o JOIN libre l ON l.acuerdo_id = o."acuerdoId"
),
est AS (
  SELECT r.*,
         CASE WHEN r.restante = 0 THEN 'pagado'
              WHEN r.vencimiento < current_date THEN 'vencido'
              ELSE 'pendiente' END AS estado_real
  FROM res r
)
SELECT a.tipo, u."numeroUnidad" AS unidad, a.contraparte, a.concepto, a.moneda,
       e.descripcion AS cuota, e.importe, to_char(e.vencimiento, 'YYYY-MM-DD') AS vencimiento,
       e.estado AS estado_guardado, e.estado_real, e.restante,
       e.id AS cuota_id
FROM est e
JOIN acuerdos_pago a ON a.id = e."acuerdoId"
JOIN unidades u ON u.id = a."unidadId"
WHERE e.estado IS DISTINCT FROM e.estado_real
ORDER BY a.tipo, unidad, e.vencimiento NULLS LAST;

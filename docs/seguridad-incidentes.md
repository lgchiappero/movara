# Respuesta a incidentes de seguridad — MOVARA

Parte de la [base del sitio](base-del-sitio.md). Revisarlo cada vez que se
agregue un servicio o un secreto nuevo.

## 0. Primeros 15 minutos

1. **No borrar nada.** Logs, filas sospechosas y archivos son evidencia.
2. Anotar en un documento aparte: hora de detección (hora argentina), quién lo
   detectó, qué se vio (URL, IP, usuario, captura).
3. Si hay un ataque en curso contra el sitio: Vercel → proyecto `movara` →
   **Firewall** → activar **Attack Challenge Mode** (pide verificación a todo
   visitante; se desactiva con el mismo botón).
4. Si se sospecha de una cuenta del admin: **desactivarla** en `/admin/usuarios`
   (el proxy lee `activo` en cada request: corta su sesión al instante).

## 1. Cerrar todas las sesiones del admin

Las sesiones son JWT firmados con `AUTH_SECRET` (8 h). Hoy la única forma de
invalidarlas todas es **rotar `AUTH_SECRET`** (paso 2.1). Mientras tanto,
desactivar usuarios corta a esos usuarios en particular.

## 2. Rotar secretos (en este orden)

Después de cambiar variables en Vercel hay que **redesplegar** para que tomen
efecto: Vercel → Deployments → último deploy de Production → ⋯ → **Redeploy**
(desde el panel; nunca `vercel --prod`). Conviene cambiar todas las variables
primero y redesplegar una sola vez al final.

Para generar un secreto nuevo: `openssl rand -base64 48`.

| # | Secreto | Dónde se rota | Dónde se actualiza | Efecto |
|---|---|---|---|---|
| 2.1 | `AUTH_SECRET` | Generar uno nuevo | Vercel → Settings → Environment Variables (Production y Preview) | Cierra todas las sesiones del admin. Cambia también la clave del rate limit (los contadores arrancan de cero). |
| 2.2 | Contraseña de la base (`DATABASE_URL`) | Supabase → Project Settings → Database → **Reset database password** | Vercel → `DATABASE_URL` (misma URL con la clave nueva) | El sitio queda caído entre el reset y el redeploy: hacerlo junto con el resto. |
| 2.3 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys: crear una **secret key** nueva y revocar la vieja (o, con las claves JWT viejas, **rotar el JWT secret**, que invalida anon y service_role) | Vercel → `SUPABASE_SERVICE_ROLE_KEY` | Storage de documentos del admin. |
| 2.4 | `SANITY_REVALIDATE_SECRET` | sanity.io/manage → proyecto → API → Webhooks → editar el webhook → Secret | Vercel → `SANITY_REVALIDATE_SECRET` (mismo valor) | Si no coinciden, publicar en el Studio no regenera páginas (respaldo de 5 min igual funciona). |
| 2.5 | Tokens de Sanity | sanity.io/manage → API → Tokens: borrar los que no se reconozcan y crear nuevos | Vercel (`SANITY_API_TOKEN`, si se usa) | Revisar también **Members**: sacar a quien no corresponda. |
| 2.6 | `RESEND_API_KEY` | resend.com → API Keys → crear nueva → borrar la vieja | Vercel → `RESEND_API_KEY` | Emails de leads, agenda, recibos. Revisar en Resend → Emails si salieron envíos raros. |
| 2.7 | `CRON_SECRET` | Generar uno nuevo | Vercel → `CRON_SECRET` | Recordatorios de la agenda. |
| 2.8 | `ADMIN_BOOTSTRAP_SECRET`, `ADMIN_INITIAL_*` | Borrarlas (ya hay usuarios) | Vercel | Bootstrap queda desactivado. |
| 2.9 | Contraseñas del admin | Cada usuario cambia la suya | — | Con 2FA: regenerar también los códigos de recuperación. |

Por último, cambiar las contraseñas de las **cuentas** de Vercel, Supabase,
Sanity, Resend y GitHub (y Mercado Pago, si alguna vez se integra), y revisar en cada una los miembros, los
tokens personales y las sesiones abiertas.

## 3. Restaurar la base

1. Supabase → **Database → Backups**. Según el plan:
   - **Backups diarios** (Pro y superiores): elegir el día anterior al
     incidente → Restore. Se pierde todo lo cargado después de ese backup.
   - **PITR** (add-on): restaurar a un minuto exacto anterior al incidente.
   - **Plan Free**: no hay backups restaurables desde el panel. Por eso hay
     que pasar a Pro o tener un `pg_dump` propio programado.
2. Antes de restaurar: exportar lo que haya ahora (Database → Backups →
   descargar, o `pg_dump` con la contraseña nueva) para no perder evidencia.
3. Durante la restauración el sitio puede fallar: activar el aviso de
   mantenimiento o Attack Challenge Mode.
4. Después: correr el SQL de migraciones pendientes, si las hubiera, revisado
   a mano (ver base-del-sitio.md, Datos), y verificar `/admin`.

## 4. Avisar a los clientes (Ley 25.326)

La Ley 25.326 de Protección de Datos Personales obliga a tomar medidas de
seguridad (art. 9). La AAIP recomienda, en su Resolución 47/2018 (medidas de
seguridad), documentar el incidente y notificar a los titulares afectados y a
la Agencia. No hay un plazo fijo en la ley como en el RGPD europeo, pero
conviene avisar **cuanto antes** y consultar con un abogado.

- **Qué datos tenemos**: nombre, email, teléfono, DNI/CUIT, domicilio de
  entrega, datos del pedido, pagos y recibos (tablas de clientes, leads,
  citas, configuraciones, recibos, cobranza).
- **A quién avisar**: a las personas cuyos datos pudieron verse, y a la AAIP
  (aaip.gob.ar → Protección de datos personales).
- **Qué decir**: qué pasó, cuándo, qué datos, qué hicimos, qué les
  recomendamos (desconfiar de mails o WhatsApp que pidan pagos o datos en
  nombre de MOVARA) y un contacto.
- Registrar a quién y cuándo se avisó.

## 5. Después

- Escribir qué pasó, cómo se detectó, cuánto tardamos y qué cambiamos.
- Revisar logs (Vercel → Logs y el drain o Sentry, si está activo) para
  acotar desde cuándo.
- Actualizar este documento.

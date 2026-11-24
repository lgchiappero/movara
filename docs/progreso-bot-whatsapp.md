# Bot de WhatsApp — progreso de la etapa 1

Etapa 1 = solo base de datos + panel de administración. **No** se conecta
WhatsApp ni la API de Claude (eso es la etapa 2). El bot queda **apagado**
por defecto.

- Rama: `feat/bot-whatsapp-etapa1` (sale de `main` en `a26c10f`). **Sin commit todavía.**
- Estado al 18/11/2026: **etapa 1 completa y commiteada** (sin push). El push a
  `main` va después de que Luciano corra el SQL en Supabase de producción.
  La migración está aplicada en la base local (localhost); en producción la
  corre Luciano a mano con `sql/20261118_bot_whatsapp.sql`.

## Etapa 2 — conexión con WhatsApp Cloud API y Claude (en curso)

Rama `feat/bot-whatsapp-etapa2` (sale de `main` en `1e1a12e`). **Sin commit.**
El bot sigue **apagado** en producción hasta que Luciano lo active.

### Decisiones (19/11)

1. Segunda migración aprobada; SQL aparte, lo corre Luciano en producción
   **antes** del push.
2. Tras CALIFICADO o DERIVADO: primero el mensaje de cierre del bot y
   después `controlHumano = true`.
3. Dos casos separados:
   - **Pausado** (`activo = false`): no responde nada, solo guarda los mensajes.
   - **Sin saldo** (tope alcanzado) con el bot activo: el mensaje de
     bienvenida, **una sola vez**, solo a números nuevos cuyo primer mensaje
     pase el filtro de palabras sin IA. `modoRespaldo` queda solo para este
     caso (`MENSAJE_BIENVENIDA` o `NINGUNO`).
4. Al llegar al máximo de respuestas sin calificar: "Gracias por contarme
   todo. Le paso tu consulta a Luciano y te escribe personalmente.", estado
   DERIVADO, `controlHumano = true` y aviso.
- Modelo `claude-haiku-5-5` (USD 0,10 / 0,50 por MTok; caché: escritura
  1,25×, lectura 0,1×), `effort: "low"`, salida estructurada con
  `client.messages.parse()` + `zodOutputFormat`, caché del prompt de
  sistema. Avisos solo por email (Resend); `whatsappAviso` sin uso.
- Demoras: el webhook responde 200 enseguida y procesa en `after()`
  (`maxDuration = 60`): espera 6 s para juntar mensajes seguidos, toma un
  bloqueo atómico del lead (`bloqueoHasta`), marca leído + "escribiendo…",
  llama a Claude y completa una demora de 5 a 20 s (el indicador de Meta
  dura hasta 25 s).

### Hecho

- **Dependencia** `@anthropic-ai/sdk` 1.10.0.
- **Migración 2** `prisma/migrations/20261119120000_bot_whatsapp_etapa2`
  (+ `sql/20261119_bot_whatsapp_etapa2.sql` para Supabase, en `.gitignore`:
  va con `git add -f`). Solo agrega: `leads_whatsapp.ultimoEntranteEn`,
  `bloqueoHasta`, `bienvenidaEnviadaEn`; `mensajes_whatsapp.waMessageId`
  (único) y `estadoEntrega`; `uso_bot.llamadas` y `avisoOchentaEn`.
  Aplicada en la base local; **en producción, sin ejecutar**.
- **`src/lib/whatsapp-cloud/`**:
  - `firma.ts`: `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256 del body
    crudo con el App Secret, comparación en tiempo constante; sin App Secret
    rechaza todo.
  - `payload.ts`: esquema Zod del webhook (mensajes de texto / audio / otro
    y estados de entrega) → `leerWebhook()`.
  - `cliente.ts`: Graph API **v26.0** (última del changelog oficial al
    19/11; los ejemplos de WhatsApp ya usan v27.0, por eso es una constante
    editable). `marcarLeidoYEscribiendo` (`status: "read"` +
    `typing_indicator`) y `enviarTexto` (id del enviado en
    `messages[0].id`), con timeout de 10 s; versión **simulada** con
    `WHATSAPP_SIMULADO=1`, ignorada en producción.
- **`leerTextoLimitado`** en `src/lib/seguridad/publico.ts`: body crudo con
  límite de tamaño (la firma se calcula sobre el texto tal cual);
  `leerJsonLimitado` ahora lo usa por dentro (sus 19 tests siguen verdes).
- **Constantes** (`constantes.ts`): `PALABRAS_CLAVE_BIENVENIDA` y
  `PREFIJOS_PRECARGADOS_WEB` (editables), `MENSAJE_SIN_AUDIO`,
  `MENSAJE_CIERRE_MAXIMO`, `VENTANA_24H_MS`, y la etiqueta nueva de
  `modoRespaldo` (solo sin saldo).
- **`horario.ts`**: `dentroDeHorario()` en hora de Córdoba (incluye la
  apertura, excluye el cierre).
- **`palabras-clave.ts`**: `pasaFiltroPalabras()` sin mayúsculas ni tildes,
  palabra completa, o texto que empieza con "Hola MOVARA".

### Hecho después de la suspensión (19/11)

- `respuesta.ts` (esquema Zod de la salida) y `prompt.ts` (identidad, tono,
  datos, límites, derivación y los 3 ejemplos; texto fijo para la caché).
- `ia.ts`: Haiku 5.5 con `messages.parse` + `zodOutputFormat`, caché del
  sistema, `effort: "low"`; negativa, JSON inválido o error → no responde.
  IA simulada por reglas (`BOT_IA_SIMULADA=1`, con `#invalido`,
  `#negativa`, `#error` para probar fallas).
- `gasto.ts` (`PRECIOS_MODELO`, `registrarUso`, aviso del 80 % una vez con
  update condicional) y `avisos.ts` (emails; `@example.*` a la bandeja local).
- `reglas.ts` (`decidir`, demora) y `procesar.ts` (agrupar 6 s, bloqueo,
  leído + escribiendo, demora, estados, control humano). `E2E_BOT_RAPIDO=1`
  acorta las esperas al 5 % (nunca en producción).
- Webhook `src/app/api/whatsapp/webhook/route.ts` (GET verificación, POST
  firma, rate limit por IP y número, idempotencia, horas crecientes por lote,
  `after()`, `maxDuration = 60`).
- Panel: el selector de respaldo dice "Si se alcanza el tope de gasto" y
  aclara que pausado no responde nada.
- `scripts/simular-whatsapp.ts`.
- Tests: `whatsapp-cloud.test.ts`, `reglas.test.ts`, `ia-gasto-avisos.test.ts`,
  `procesar.test.ts` (con `base-falsa.ts`, base en memoria), `route.test.ts`
  del webhook; e2e `e2e/bot-whatsapp-webhook.spec.ts` (simulado).

### Falta

1. Chequeos completos: HECHOS el 19/11 con la Mac despierta. tsc y eslint
   sin errores, build limpio, unit 2646 en verde (cobertura 99,77 / 97,5 /
   99,72 / 99,9) y test:tz en las 4 zonas, e2e 387/390: las 3 que fallaron
   pasan corridas solas (las 2 de Firefox del configurador, ya pendientes, y
   `clientes-automaticos.spec.ts:139`, ver Pendientes). Fallas reales
   arregladas: el prompt nombraba palabras prohibidas por
   `src/test/claims.test.ts` (reformulado, sin tocar el test) y el test de
   `MAX_BODY` (se agregó el límite del webhook). Falta el OK para el commit.
   Commits en la rama: `2564feb` (etapa 2) y uno aparte con el aviso
   "Falta la clave de la IA": sin ANTHROPIC_API_KEY no se llama a la API
   (`motorSinClave`), el lead queda DERIVADO con control humano y el email
   nombra la causa real.
2. Luciano corre `sql/20261119_bot_whatsapp_etapa2.sql` en producción antes
   del push.
3. HECHO el 19/11: prompt probado con la clave real (clave aparte de pruebas
   en `.env.local`) con `npx tsx scripts/probar-prompt-bot.ts`: 16 casos
   (familia, precio, recomendado, plazo y pagos, técnico, no leads,
   enojado, visita, pide persona, ¿sos un bot?, constructora, audio) con
   control automático de reglas (una pregunta, sin emojis/listas/precios/
   plazos/cuotas/materiales, sin relleno, saludo una sola vez,
   "personalmente" máximo una vez, nombre al final, no repreguntar datos,
   DERIVAR sin preguntas, CALIFICADO en 2 oraciones). Cuesta unos
   USD 0,003 por corrida. Las 2 últimas corridas, sin incumplimientos.
4. HECHO el 24/11: variables en Vercel y webhook en Meta (app Movara Bot,
   campo `messages`, suscrita a la cuenta del número de prueba con
   `scripts/whatsapp-diagnostico.ts`). Un "Hola" real entró con 200 y
   aparece en el panel. Lo que costó: la app no estaba suscrita a la cuenta
   (`subscribed_apps`) y `WHATSAPP_APP_SECRET` no era la App Secret vigente
   de Movara Bot (401 "firma inválida"). El webhook ahora recorta espacios
   en los bordes del App Secret. Falta prender el bot desde el panel.
   Envío: el log guarda código, subcódigo y título del error de Meta (sin
   número ni texto). Con el número de prueba, si Meta responde 131030
   (destinatario no permitido) a un 549…, se reintenta una vez sin el 9
   (54 + característica + número) y el log dice qué formato funcionó.

## Decisiones tomadas

- **Rutas**: route handlers en `/api/admin/bot-whatsapp/...`, igual que el
  resto del admin. **No** tRPC (se sacó en la fase 1 de seguridad).
- **Nombres en español** en modelos y campos, con tablas en snake_case
  (`@@map`), como el resto del schema. Las opciones (estados, orígenes,
  etc.) son `String` validados con Zod, no enums de Prisma; los valores
  están en un solo lugar: `src/lib/bot-whatsapp/constantes.ts`.
- **Permisos**, validados **en el servidor** en cada ruta
  (`exigirSesion` en `src/lib/bot-whatsapp/permisos.ts`), además de ocultar
  los botones:
  - Administrador: todo.
  - Vendedor: ver leads y conversaciones; editar calificación, estado,
    notas y próximo contacto; "Tomar control / Devolver al bot"; agregar
    leads manuales; agregar contactos excluidos; ver el gasto.
  - Vendedor **no**: prender/apagar el bot, cambiar la configuración, borrar
    leads ni borrar contactos excluidos (403).
  - `roles.ts` y `proxy.ts` no cambian: `/admin/bot-whatsapp` está abierto
    a los dos roles y la autenticación la sigue haciendo el proxy.
- **Protecciones de la fase 1** en las rutas nuevas: sesión del proxy,
  validación Zod estricta, límite de body de 16 KB (`leerJsonLimitado`) y
  rate limit compartido de 120 escrituras por minuto por usuario.
- **Teléfono** normalizado al formato de WhatsApp (`549` + 10 dígitos para
  Argentina, ej. `5493493667214`), con `telefonoWhatsapp` en
  `src/lib/bot-whatsapp/telefono.ts` (reusa `claveTelefono`).
- **Aviso de coincidencias** en el detalle del lead: si el teléfono coincide
  con un Lead (formulario) o con un pedido, "Este contacto ya figura en
  Leads / Pedidos", con links. Solo lectura, sin unificar tablas
  (`src/lib/bot-whatsapp/coincidencias.ts`: busca la clave de 10 dígitos en
  `leads.telefonoNorm` y `clientes.telefonoNorm`, y junta sus pedidos).
- Menú: entrada "Bot WhatsApp" en `src/lib/admin/nav-items.ts`.

## Hecho

### Modelos (`prisma/schema.prisma`)

`ConfigBot` (`config_bot`, registro único `id = "unico"`), `LeadWhatsapp`
(`leads_whatsapp`), `MensajeWhatsapp` (`mensajes_whatsapp`, se borran en
cascada con el lead), `ContactoExcluido` (`contactos_excluidos`) y `UsoBot`
(`uso_bot`). `prisma validate` OK y cliente regenerado.

### Migración

- `prisma/migrations/20261118120000_bot_whatsapp/migration.sql`: generada
  con `prisma migrate diff` comparando el schema de `main` contra el nuevo
  (sin conectarse a ninguna base). Solo crea: 5 tablas, 6 índices, 1 FK y
  `ENABLE ROW LEVEL SECURITY` en las 5 (sin políticas). No modifica ni borra
  nada existente.
- `sql/20261118_bot_whatsapp.sql`: la misma, comentada y entre
  `BEGIN`/`COMMIT`, para el SQL Editor de Supabase. **`sql/` está en
  `.gitignore`**: al commitear hay que agregarlo con `git add -f`, como los
  otros SQL versionados.
- **Producción: sin ejecutar.** La corre Luciano a mano en Supabase.
  **Local: aplicada** el 18/11 con `prisma migrate deploy` (localhost).

### Lógica (`src/lib/bot-whatsapp/`)

- `constantes.ts`: estados, orígenes, autores, tipos, modos de respaldo,
  etiquetas de excluidos, días, horario por defecto (lun-vie 8-18, sáb
  9-13) y mensaje de bienvenida por defecto.
- `telefono.ts`: normalización, clave para cruzar con Leads/Clientes y
  formato para mostrar.
- `config.ts`: `obtenerConfigBot` (la crea apagada si no existe),
  `mesActual` (hora argentina), `calcularGasto` (amarillo desde 80 %, rojo
  al 100 %) y `gastoDelMes`.
- `permisos.ts`: `exigirSesion({ soloAdmin, escritura })`.
- `coincidencias.ts`, `leads.ts` (listado con filtro, búsqueda, orden por
  último mensaje y paginado; lo usan la ruta y la página) y `http.ts`
  (`leerYValidar`, `codigoPrisma`).
- `src/lib/validators/bot-whatsapp.ts`: esquemas Zod de todas las rutas.

### Rutas (`src/app/api/admin/bot-whatsapp/`)

| Ruta | Métodos | Quién |
|---|---|---|
| `config` | GET (config + gasto) | ambos |
| `config` | PATCH (incluye prender/apagar) | solo admin |
| `leads` | GET (filtros) y POST (lead manual; 409 si el teléfono ya existe) | ambos |
| `leads/[id]` | GET (lead + conversación + coincidencias) y PATCH | ambos |
| `leads/[id]` | DELETE | solo admin |
| `excluidos` | GET y POST (409 si ya está) | ambos |
| `excluidos/[id]` | DELETE | solo admin |

### Panel

- `src/app/admin/(dashboard)/bot-whatsapp/page.tsx`: estado (interruptor y
  gasto) y pestañas Leads / Contactos excluidos / Configuración (esta
  última solo para administrador).
- `src/app/admin/(dashboard)/bot-whatsapp/[id]/page.tsx`: detalle con
  "Abrir en WhatsApp", aviso de coincidencias, Tomar control / Devolver al
  bot, borrar (admin), conversación y datos editables.
- Componentes en `src/components/admin/bot-whatsapp/`: `EstadoBot`,
  `ConfigBotForm` (con editor de horario por día), `TablaLeadsWhatsapp`
  (tabla en pantallas anchas, tarjetas en el celular), `NuevoLeadWhatsapp`,
  `ContactosExcluidos`, `ChatLead` (cliente / bot / equipo diferenciados),
  `DatosLeadForm`, `AccionesLead` y `api.ts`. Reutilizan `useToast` y
  `ModalConfirmacion`.

### Tests que ya pasan

- `src/lib/bot-whatsapp/__tests__/logica.test.ts`: 32 tests (teléfonos,
  configuración y gasto, permisos 401/403/429, coincidencias, listado,
  http).
- `src/lib/validators/bot-whatsapp.test.ts`: 31 tests, todos verdes
  (incluye los de la regla de campos opcionales, con `toStrictEqual`).
- `src/app/api/admin/bot-whatsapp/__tests__/rutas.test.ts`: 34 tests de
  las 5 rutas. Matriz de permisos: sin sesión → 401 en las 10 llamadas sin
  tocar la base; vendedor → 403 en prender/apagar, configuración, borrar
  lead y borrar excluido (antes de leer el body y sin consumir rate limit),
  y 200/201 en ver, editar, tomar control y agregar; administrador → todo,
  con `actualizadoPor`. Además 400 (validación, filtro, campos que no
  existen), 404, 409 (lead y excluido repetidos), 413 y 429 (las lecturas
  no consumen el límite), y que el PATCH manda a la base solo lo que vino.
- `src/components/admin/bot-whatsapp/__tests__/componentes.test.tsx`: 28
  tests de los 8 componentes y `api.ts`: interruptor (prende/pausa con
  confirmación visual, no cambia si el servidor rechaza, deshabilitado para
  el vendedor), barra de gasto (normal / amarilla desde 80 % / roja al
  100 %), configuración completa (incluye un día con dos franjas), lead
  manual (409 con link al existente), excluidos (el vendedor no ve
  "Quitar"; el administrador confirma con el modal propio), chat (cliente /
  bot / equipo, audios y adjuntos), tomar control / devolver al bot, borrar
  lead con confirmación, datos del lead y tabla/tarjetas.
- Cobertura de rutas + lógica + validadores + componentes del bot: **100 %**
  en sentencias, ramas, funciones y líneas.
- `tsc` y `eslint` limpios sobre todo lo nuevo.

## Problema encontrado (ARREGLADO el 18/11): campos de texto ausentes que se vuelven null

Los campos de texto usan `textoOpcional` (`.nullish().transform(v => v ? v : null)`).

**Regla correcta**: un campo que **no viene** en el body no se toca (queda
fuera del objeto que va a Prisma); solo se borra si viene **explícitamente**
`null` o vacío (`""` o solo espacios → `null`).

Qué se verificó (18/11):

- **PATCH de leads (`leadPatchSchema`, con `.partial()`): hoy cumple la
  regla.** Un PATCH con `{ controlHumano: true }` devuelve exactamente
  `{ controlHumano: true }`; los demás campos no se tocan. Falta un test que
  lo deje fijado.
- **Alta (`leadCreateSchema`, sin `.partial()`): no cumple.** Los campos
  ausentes salen como `null` (es el test que falla: el objeto trae 10
  claves de más). En una fila nueva no borra nada (`null` es lo mismo que
  no cargarlo), pero el comportamiento tiene que ser el mismo en los dos
  esquemas para que nadie lo reutilice en un update y borre datos.
- Mismo patrón para revisar: `origen` (`.nullish().transform(v => v ?? null)`)
  y `emailAviso` / `whatsappAviso` de `configPatchSchema` (este último es
  `.partial()`, así que hoy tampoco toca lo ausente, pero conviene el mismo
  arreglo y su test).

**Arreglo**: en `src/lib/validators/bot-whatsapp.ts`, los opcionales
(`textoOpcional`, `origen`, `emailAviso`, `whatsappAviso`) pasaron de
`.nullish().transform(...)` a `.nullable().transform(...).optional()`: el
`.optional()` va por fuera, así una clave ausente ni se evalúa y queda fuera
del resultado. `null`, `""` o solo espacios siguen dando `null`. Tests
nuevos (con `toStrictEqual`, que no ignora claves `undefined`): un PATCH con
un solo campo devuelve solo ese campo; cada texto en `null`/`""`/espacios
queda `null`; `origen: null` borra; el alta no agrega claves que no
vinieron; email y WhatsApp de aviso, lo mismo.

## Cierre de la etapa 1 (18/11)

- Tests de las 2 páginas (`src/app/admin/(dashboard)/bot-whatsapp/__tests__/pages.test.tsx`,
  14 tests): pestañas según rol (el vendedor no ve Configuración ni por
  URL), filtros y paginación, aviso de coincidencias (Leads, Pedidos o
  ambos), botón de borrar solo para el administrador, textos por defecto y
  404. Las páginas quedaron al 100 %.
- `vitest.config.ts`: suma `src/lib/bot-whatsapp/**`, el validador y los
  componentes (rutas y páginas ya entraban por `src/app/api/admin/**` y
  `src/app/admin/**`).
- Migración aplicada en la base local con `prisma migrate deploy`.
- `e2e/helpers/esperar-quieto.ts` (`clicQuieto`) y
  `e2e/admin-bot-whatsapp.spec.ts`: administrador (menú, interruptor,
  configuración, lead manual con datos / tomar control / borrar, excluidos,
  celular) y vendedor (interfaz limitada y 403 del servidor), en Chromium y
  Firefox.
- `docs/base-del-sitio.md`: sección "Bot de WhatsApp", componentes
  reutilizables y el pendiente de unificar Leads y LeadWhatsapp en un CRM.
- Verificación con 2 leads de prueba sobre el build de producción local:
  todo OK y datos borrados (0 leads, 0 mensajes; bot apagado, tope USD 5).

### Observaciones

- **`next dev` recarga en bucle** las páginas del admin en esta máquina
  (también `/admin/leads`, que no se tocó): ~3 recargas por segundo con
  "[Fast Refresh] rebuilding". No pasa con el servidor que levanta
  Playwright ni con el build de producción. No es del bot; queda para
  revisar aparte.
- El botón flotante "?" de la guía rápida del admin tapaba campos de "Datos"
  en el detalle del lead. **Arreglado** solo en esa vista (no se tocó el
  botón, que es de todo el admin): el contenedor deja libre su franja
  (`pr-12 sm:pr-16 pb-24`). Lo verifica un e2e que lleva cada campo al borde
  inferior de la pantalla, en escritorio y celular, y comprueba que el botón
  no se superpone; sin el arreglo falla ("Plazo" en escritorio, "Próximo
  contacto" en celular).
- En una tanda de 36 corridas del e2e del bot falló 1 vez en Firefox (el
  test del vendedor) y no se pudo ver el error (la carpeta de resultados se
  pisa). Las tandas siguientes (36 de 36 y 4 de 4) pasaron.

## Pendientes (fuera de la etapa 1)

- **e2e inestable (nuevo, 19/11)**: `e2e/clientes-automaticos.spec.ts:139`
  busca `getByText("Pedido cancelado")` y a veces lo encuentra dos veces (el
  texto de la página y el aviso emergente). Arreglo sugerido: buscarlo dentro
  de `getByRole("main")`. No es del bot; corrido solo pasa 3 de 3.

1. **Bucle de recarga de `next dev` en las páginas del admin.** Con
   `npm run dev` levantado a mano, las páginas del admin (también
   `/admin/leads`, que no se tocó) se recargan ~3 veces por segundo: el log
   muestra "✓ Compiled in Xms" en cada pedido y la consola "[Fast Refresh]
   rebuilding". Lo que se reescribe son los manifiestos de `.next/dev`; no
   cambia ningún archivo del proyecto. No pasa con el servidor que levanta
   Playwright (`webServer` en `playwright.config.ts`, 0 recompilaciones) ni
   con el build de producción. Hay un solo `next dev` corriendo, así que no
   son dos servidores pisándose. Revisar qué diferencia hay entre los dos
   arranques (variables, stdin, carpeta `.next/dev`).
2. **Estabilizar los e2e del configurador en Firefox** con
   `e2e/helpers/esperar-quieto.ts` (`clicQuieto`). Fallan de forma
   intermitente: el clic en "Ver mi configuración" / "Siguiente" cae
   mientras el paso anima o la fuente cambia y no avanza ("Paso 6 de 6" no
   aparece). En la corrida completa del 18/11 fallaron 2 (`configurador.spec.ts:235`
   y `:298`), que repetidos solos pasaron 4 de 4. Cambiar los clics del
   flujo del configurador (`configurador.spec.ts`, `configurador-scroll.spec.ts`,
   `celular-responsive.spec.ts`) por `clicQuieto` y repetir la suite en
   Firefox varias veces.

## Qué falta (historial)

1. ~~Arreglar los campos opcionales~~ — hecho (ver arriba).
2. ~~Tests unitarios de todas las rutas con permisos~~ — hecho.
3. ~~Tests de componentes~~ — hecho. **Falta**: tests de las 2 páginas
   (`bot-whatsapp/page.tsx` y `bot-whatsapp/[id]/page.tsx`), que ya
   entran en la cobertura del proyecto por `src/app/admin/**`: pestañas
   según rol (el vendedor no ve Configuración, ni por URL), filtros,
   aviso de coincidencias y 404.
4. ~~Sumar lo nuevo a `vitest.config.ts`~~ — hecho.
5. ~~Helper `esperar-quieto` y e2e del panel~~ — hecho.
6. ~~Sección en `docs/base-del-sitio.md`~~ — hecho.
7. ~~Verificación con datos de prueba y borrado~~ — hecho.
8. tsc, eslint, unit con cobertura, test:tz, build y e2e completos en verde.
9. Pasar la lista de archivos y el SQL (con `pbcopy`, sin ejecutar) y
   **esperar el OK** antes del commit.

## Comandos para retomar

```sh
cd ~/movara
git checkout feat/bot-whatsapp-etapa1

# Aplicar la migración en la base LOCAL (localhost) — lo corre Luciano:
npx prisma migrate status        # tiene que mostrar solo 20261118120000_bot_whatsapp
npx prisma migrate deploy
npx prisma generate

# Tests de lo nuevo
npx vitest run src/lib/bot-whatsapp src/lib/validators/bot-whatsapp.test.ts

# Chequeos completos (con caffeinate)
caffeinate -i npx tsc --noEmit
caffeinate -i npx eslint
caffeinate -i npx vitest run --coverage
caffeinate -i npm run test:tz
caffeinate -i npm run build
caffeinate -i npx playwright test   # levanta next dev con E2E_SIN_INDICADOR=1 y E2E_LIMITES_ALTOS=1

# SQL para Supabase (sin ejecutar)
pbcopy < sql/20261118_bot_whatsapp.sql
```

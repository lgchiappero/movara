# Base del sitio MOVARA

**Antes de cualquier cambio en el sitio, leer este documento y reutilizar lo
que ya existe.** Cada regla dice en qué archivo está implementada: si hace
falta cambiarla, se cambia ahí, no se crea una versión paralela.

Documentos relacionados: [Imágenes con marca de agua del proveedor](imagenes-con-marca.md) · [Respuesta a incidentes de seguridad](seguridad-incidentes.md).

## Navegación

| Regla | Dónde |
| --- | --- |
| Todas las rutas públicas (home, modelos, configurador, producto, nosotros, faq, agendar, recibo, mi-pedido, privacidad, términos) viven en el route group `(sitio)` y comparten un solo layout: Navbar + `<main>` + Footer. Las URLs no llevan el grupo. | `src/app/(sitio)/layout.tsx` → `src/components/layout/LayoutSitio.tsx` |
| Las páginas **no** agregan Navbar, Footer ni `<main>` propios: solo su contenido, con aire arriba para el header fijo de 64 px (`pt-16` o más; las páginas de texto usan `pt-28`). | cada `page.tsx` de `src/app/(sitio)` |
| `admin` y `studio` quedan fuera del grupo, con sus propios layouts. | `src/app/admin`, `src/app/studio` |
| 404 con links a la home y a `/modelos`, contenido único en `NoEncontrado`. Dos entradas: URLs inexistentes → `app/not-found.tsx` (bajo el layout raíz, arma el marco con `LayoutSitio`); `notFound()` de una página del sitio → `app/(sitio)/not-found.tsx` (solo el contenido, el marco ya está). Si se usara la raíz para las dos, el header y el footer saldrían dobles. | `src/components/layout/NoEncontrado.tsx`, `src/app/not-found.tsx`, `src/app/(sitio)/not-found.tsx` |
| Header fijo: logo → home, menú (en el celular, hamburguesa), CTA "Ver modelos". | `src/components/layout/Navbar.tsx` |
| Footer con datos de Sanity (`siteConfig`) y respaldo fijo; links legales y "Agendar visita". | `src/components/layout/Footer.tsx` |
| Links internos: `/` en la home sube arriba; `/#seccion` baja a la sección compensando el header, desde cualquier página. | `src/components/ui/LinkInterno.tsx`, `src/lib/scroll.ts`, `src/components/home/HomeHashScroll.tsx` |
| **Volver** en toda ruta menos `/`, mismo lugar y estilo (a la izquierda del logo, 44 px, visible en el celular sin abrir el menú). Si se llegó navegando dentro del sitio hace `router.back()`; si se entró directo (WhatsApp, email, Google) va a la página padre. | `src/components/layout/BotonVolver.tsx` |
| Tabla de páginas padre (única): `/modelos/[slug]` → `/modelos`, `/producto` → `/modelos/flex`, todo lo demás (agendar, recibo, mi-pedido, legales, 404) → `/`. | `src/lib/navegacion/pagina-padre.ts` |
| Cómo se sabe si hay historial interno (Navigation API, con respaldo de pila en memoria). | `src/lib/navegacion/historial.ts` |
| Una página con datos sin enviar (el configurador) marca la salida protegida y Volver pide confirmación con un modal propio, nunca `confirm()`. La barra Atrás/Siguiente del configurador no se toca. | `src/lib/navegacion/salida-protegida.ts`, `src/components/ui/ModalConfirmacion.tsx` |
| Volver arriba, barra de WhatsApp, píxel de Meta y transición entre páginas quedan en el layout raíz. | `src/app/layout.tsx` (`BackToTop`, `WhatsAppStickyBar`, `MetaPixel`), `src/app/template.tsx` (`PageTransition`) |
| e2e que recorre todas las rutas públicas en 390 y 1440 px y falla si falta header, logo → home, Volver o footer. **Una ruta pública nueva se agrega ahí.** | `e2e/navegacion-unificada.spec.ts` |

## Marca

- Colores: negro `#1A1A1A` y dorado `#D4B36A` (logo en `Navbar`/`Footer`, fondos de `/modelos`, recibo, 404).
- Nunca el nombre del proveedor ni "plegable" (se dice "expandible"), ni "foldable"/"folding"; nada de "producción nacional". Lo controla `src/test/claims.test.ts` sobre todo el texto público de `src` (afuera solo admin, studio y el PDF al proveedor); el texto cargado en Sanity no lo cubre el test: revisarlo en el Studio.
- Todo lo de `public/` se sirve por URL: catálogos, PDFs y material del proveedor van en `assets-origen/proveedor/` (los scripts de `scripts/extract-*` leen de ahí). Lo controla `src/test/claims.test.ts`. El configurador anterior quedó archivado en `assets-origen/configurador-viejo/`.
- Se dice: llave en mano, garantía de 1 año (12 meses), certificación CE, DVH, RPT (`src/data/precio-incluye.ts`, `src/data/faq.ts`, `src/data/configurador-catalog.ts`).

## Precios

- Fuente: `src/data/precios-extras.ts` (respaldo) + Sanity `siteConfig` (lo que se carga en el Studio gana).
- Todo en USD con IVA incluido, con la leyenda `LEYENDA_PRECIOS` ("Precios en USD, IVA incluido.").
- Extras: costo de fábrica × 1,35 (margen) × 1,21 (IVA), redondeado hacia arriba a múltiplos de USD 5 (`MARGEN_EXTRAS`, `IVA` y la función de precio en el mismo archivo).
- "A consultar" (`A_CONSULTAR`) se muestra pero no suma al total (`src/lib/precio-configurador.ts`, `src/components/configurador/PrecioPanel.tsx`).

## Fechas

- Toda fecha que se muestra o se calcula sale de `src/lib/fecha-ar.ts` (hora argentina fija).
- ESLint prohíbe los métodos de `Date` que dependen de la zona de la máquina (`eslint.config.mjs`, `no-restricted-syntax`).
- `npm run test:tz` corre la suite en UTC, Tokio, Los Ángeles y Córdoba.

## Celular

- Sin scroll horizontal en ninguna página (`e2e/celular-responsive.spec.ts`, `e2e/navegacion-unificada.spec.ts`).
- Inputs con `text-base` (16 px) en el celular para que iOS no haga zoom (`sm:text-sm` desde tablet), como en `src/components/configurador/ConfiguradorMovara.tsx`.
- Táctiles de 44 px mínimo (`min-h-11`, `max-sm:min-h-11`), como en `BotonVolver`, `Footer` y `ModalConfirmacion`.
- Lo fijo abajo respeta `env(safe-area-inset-bottom)` (configurador, `FotoAmpliada`, `ModalConfirmacion`).

## Imágenes

- Fotos de Sanity: `urlImagenCompleta` (la foto entera con su crop) y `posicionHotspot` (centrado en el hotspot del Studio), en `src/sanity/lib/image.ts`.
- `object-contain` en fotos de producto; `object-cover` solo en fondos decorativos.
- Fotos nuevas sin marcas de agua ni precios impresos. Las que hoy tienen marca: [imagenes-con-marca.md](imagenes-con-marca.md).

## Sanity

- Al publicar, el webhook del Studio llama a `/api/revalidate` (`src/app/api/revalidate/route.ts`), que regenera las rutas de `src/lib/revalidacion.ts`. Con patrón dinámico, la ruta lleva el route group: `/(sitio)/modelos/[slug]`.
- Si una página nueva lee Sanity, agregarla en `src/lib/revalidacion.ts` (las páginas tienen `revalidate = 300` de respaldo).

## WhatsApp

- URL siempre con `getWhatsAppUrl(mensaje, numero)` de `src/lib/whatsapp.ts`.
- Número del showroom: `SHOWROOM_WHATSAPP_NUMBER` (y `SHOWROOM_WHATSAPP` para mostrar) en `src/lib/agenda/showroom.ts`.
- Evento Contact del píxel: lo dispara `src/components/MetaPixel.tsx` para **todo** link a WhatsApp (`esLinkWhatsApp` y `trackContact` en `src/lib/meta-pixel.ts`). Un link nuevo a `wa.me` no necesita código extra: alcanza con un `<a href>` normal.

## Agenda

- Si no hay ningún día "disponible" en los próximos 60 días (hora argentina), `/agendar` muestra el aviso "Próximamente" en lugar del calendario, con la misma consulta por mes a `/api/agenda/disponibilidad`. Cuando se habilitan días en el admin, vuelve el calendario solo. Mientras carga se ve el calendario con "Cargando disponibilidad…", nunca el aviso de golpe. Ventana y regla: `src/lib/agenda/ventana-agenda.ts`; aviso: `src/components/agenda/AvisoProximamente.tsx`; lo usa `src/components/agenda/AgendaBooking.tsx`.
- `/agendar` usa la marca: fondo `#1A1A1A`, eyebrow `#D4B36A`, título en Playfair (`font-playfair`), tarjetas blancas con texto `#1A1A1A`. Sobre el fondo oscuro no queda texto oscuro suelto: todo formulario va adentro de su tarjeta (ej. `/agendar/cancelar/[id]`, `CitaCancelarView`).

## Seguridad

- **Endpoints públicos** (sin sesión): rate limit **compartido** por IP en Postgres (tabla `rate_limit_hits`, `src/lib/rate-limit-db.ts`; nunca un `Map` en memoria, que en Vercel no limita), límite de tamaño del body y campo trampa (honeypot). Todo en `src/lib/seguridad/publico.ts`: `permitirIP`, `leerJsonLimitado`, `esTrampa`, con los límites de cada endpoint en `LIMITES` y `MAX_BODY`. Un endpoint público nuevo usa ese helper.
- **Formularios públicos**: `<CampoTrampa>` + `useCampoTrampa()` (`src/components/ui/CampoTrampa.tsx`), y `...trampa.valor()` en el JSON que se manda.
- **Login del admin**: bloqueo por IP (5 fallos) y por email (10 fallos) en 15 minutos, compartido (`src/lib/seguridad/login.ts`).
- **Secretos**: comparar siempre con `igualSeguro` (`src/lib/seguridad/igual-seguro.ts`), nunca con `===`. IP del cliente: `ipCliente` (`src/lib/seguridad/ip.ts`).
- **CSP** (`next.config.ts`): sin `'unsafe-eval'` en producción; `/admin` no se puede embeber (`frame-ancestors 'none'`, `X-Frame-Options: DENY`) y lleva `Cross-Origin-Opener-Policy`. Lo fija `src/test/next-config-headers.test.ts`.
- **Incidentes**: [seguridad-incidentes.md](seguridad-incidentes.md).

## Datos

- Cambios de esquema: generar el SQL, revisarlo y correrlo a mano en Supabase (`sql/`, `prisma/`). Nunca `prisma migrate deploy` sin ver el diff.
- RLS habilitado en todas las tablas de `public`, **sin políticas**: la app accede solo con Prisma (rol postgres) y la service role.
- Nunca bajar secretos de producción a la máquina (`vercel env pull` de prod, dumps con datos de clientes).

## Calidad

Antes de cada commit: `tsc --noEmit`, `eslint`, `npm run test -- --coverage` (≥ 95 % en statements, branches, functions y lines; los archivos medidos están en `vitest.config.ts`), `npm run test:tz`, `npm run build` y los e2e que toquen lo cambiado (`npm run test:e2e`).

- Nunca `vercel --prod`.
- Nada de `git push` sin el OK explícito.

## Configurador

- Agua caliente: solo calefón eléctrico (`TIPO_AGUA` en `src/components/configurador/ConfiguradorMovara.tsx`).
- Cocina: anafe eléctrico o preparación gas (`tipoCocina` en el mismo archivo).

## Indicadores del admin

- Una función por concepto en `src/lib/indicadores/` (`citas`, `cobros`, `cuotas`, `leads`, `montos`, `pagos`, `pedidos`, `unidades`). El contador y su lista usan la misma función, así cuentan las mismas filas.

## Componentes reutilizables

Antes de crear un componente, fijate si ya está acá.

| Componente | Para qué |
| --- | --- |
| `components/layout/LayoutSitio` | Marco de página pública (Navbar + main + Footer). |
| `components/layout/NoEncontrado` | Contenido de la 404. |
| `components/layout/Navbar` | Header fijo del sitio, con Volver fuera de la home. |
| `components/layout/Footer` | Footer del sitio (datos de Sanity con respaldo). |
| `components/layout/BotonVolver` | Volver con historial interno o página padre. |
| `components/ui/LinkInterno` | Link a `/` o `/#seccion` que resuelve el scroll con header fijo. |
| `components/ui/ModalConfirmacion` | Confirmación con la marca (en lugar de `confirm()`). |
| `components/ui/CampoTrampa` | Honeypot de los formularios públicos (con `useCampoTrampa`). |
| `components/ui/BackToTop` | Botón para volver arriba (layout raíz). |
| `components/ui/WhatsAppStickyBar` | Barra fija de WhatsApp con cupos (se oculta en configurador, recibo, admin, studio). |
| `components/ui/CuposBar` | Barra de unidades reservadas / disponibles. |
| `components/motion/Reveal` | Animación de entrada al hacer scroll. |
| `components/motion/PageTransition` | Fade entre páginas (lo usa `app/template.tsx`). |
| `components/motion/CountUp` | Número que cuenta hasta su valor. |
| `components/modelos/ModeloCard` y `ModelosGrid` | Card y grilla de modelos (home y `/modelos`). |
| `components/detail/ImageGallery`, `FloorPlan`, `ContactForm` | Galería, plano y formulario de la ficha de un modelo. |
| `components/legal/PaginaLegal` | Contenido de una página legal (índice con anclas). |
| `components/legal/AvisoPrivacidad` | Aviso de privacidad debajo de cada formulario. |
| `components/agenda/ComoLlegarLink` | Link "Cómo llegar" al showroom. |
| `components/agenda/AvisoProximamente` | Aviso de agenda cerrada con WhatsApp y configurador. |
| `lib/agenda/ventana-agenda` | Meses de los próximos 60 días y si hay algún día disponible. |
| `lib/agenda/showroom` | Dirección, Maps y WhatsApp del showroom. |
| `lib/meta-pixel` | Eventos del píxel (`trackContact`, `trackLead`, `trackSchedule`…). |
| `components/recibo/MarcaMovara` | Marca del Recibo en Conformidad. |
| `components/configurador/FotoAmpliada` | Foto a pantalla completa. |
| `lib/fecha-ar` | Fechas en hora argentina. |
| `lib/seguridad/publico` | Rate limit compartido, límite de body y honeypot de los endpoints públicos. |
| `lib/seguridad/login` | Bloqueo de intentos fallidos del login (IP y email). |
| `lib/seguridad/igual-seguro` | Comparar secretos en tiempo constante. |
| `lib/whatsapp` | URL de WhatsApp con mensaje. |
| `lib/navegacion/pagina-padre` | Tabla de páginas padre. |
| `sanity/lib/image` | `urlImagenCompleta`, `posicionHotspot`. |

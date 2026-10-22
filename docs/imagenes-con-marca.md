# Imágenes con marca de agua del proveedor (HESHI)

Relevamiento del 22/10/2026 sobre `public/configurador/`. Las fotos del
proveedor traen la marca "HESHI" repetida en varias partes de la imagen (no
solo en una esquina), así que recortarlas no alcanza: hay que reemplazarlas
por los originales sin marca que se le pidieron al proveedor.

Para reemplazar una foto, usá el mismo nombre de archivo, así no hay que
tocar `src/data/material-catalog.ts`. Si la foto nueva tiene otra
proporción, revisá cómo queda la tarjeta en el configurador.

## Usadas en el sitio: reemplazar

Todas están en `public/configurador/` y se muestran en el configurador
(selectores de `src/data/material-catalog.ts`).

### Con la marca bien visible

| Archivo | Dónde se ve |
| --- | --- |
| `bano-banera-01.png` | Baño → Bañera, opción 1 |
| `bano-banera-02.png` | Baño → Bañera, opción 2 |
| `bano-banera-03.png` | Baño → Bañera, opción 3 |
| `bano-panel-01-marmol-venas1.png` | Baño → Paneles, mármol blanco con venas |
| `bano-panel-02-marmol-dorado.png` | Baño → Paneles, mármol dorado |
| `bano-panel-03-blanco-liso.png` | Baño → Paneles, blanco liso |
| `bano-panel-04-gris-marmol.png` | Baño → Paneles, gris mármol |
| `bano-puerta-01-negro-cuadricula.png` | Baño → Puerta, negro cuadriculado |
| `bano-puerta-02-blanco-cuadricula.png` | Baño → Puerta, blanco cuadriculado |
| `bano-puerta-03-blanco-horizontal.png` | Baño → Puerta, blanco horizontal |
| `bano-puerta-04-blanco-mixto.png` | Baño → Puerta, blanco mixto |
| `cocina-01-lshape-gris.png` | Cocina → L-Shape gris |
| `cocina-02-lshape-blanco.png` | Cocina → L-Shape blanco |
| `cocina-03-lshape-blanco2.png` | Cocina → L-Shape blanco moderno |
| `cocina-premium-ushape-01.png` | Cocina ampliada → En U, opción 1 |
| `exterior-01-gris-oscuro.png` | Exterior → Gris oscuro |
| `exterior-02-madera-naranja.png` | Exterior → Madera naranja |
| `exterior-03-madera-marron.png` | Exterior → Madera marrón |
| `exterior-04-blanco.png` | Exterior → Blanco |
| `exterior-05-gris-claro.png` | Exterior → Gris claro |
| `exterior-06-blanco-negro.png` | Exterior → Blanco con negro |
| `exterior-premium-04-marron-oscuro.png` | Exterior premium |
| `exterior-premium-05-madera-clara.png` | Exterior premium |
| `exterior-premium-07-madera-naranja.png` | Exterior premium |
| `exterior-premium-08-gris-medio.png` | Exterior premium |
| `exterior-premium-09-madera-clara2.png` | Exterior premium |
| `exterior-premium-12-blanco-liso.png` | Exterior premium |
| `exterior-premium-13-amarillo.png` | Exterior premium |
| `exterior-premium-14-celeste.png` | Exterior premium |
| `exterior-premium-15-rosa.png` | Exterior premium |
| `exterior-premium-16-verde.png` | Exterior premium |
| `exterior-premium-17-naranja.png` | Exterior premium |
| `puerta4vidrios.png` | Puerta principal → Con vidrio lateral |
| `puertacorrediza2hojas.png` | Puerta principal → Corredera doble hoja |
| `puertadoblehojaconcargo.png` | Puerta principal → Doble hoja moderna |
| `ventanaconabatienteconcargo.png` | Ventanas → Abatible con paño fijo |
| `ventanadeabrirconmosquitero.png` | Ventanas → Estándar con mosquitero |

### Con la marca tenue

| Archivo | Dónde se ve |
| --- | --- |
| `balcon con techocompleto.png` | Balcón → Techo, sobretecho completo |
| `balcon solo.png` | Balcón → Techo, sobretecho solo en el balcón. Ya se recortó la marca de arriba a la izquierda; quedan dos "HE" tenues, uno en la fachada de madera y otro en el piso |
| `exterior-premium-01-gris-lineas.png` | Exterior premium |
| `exterior-premium-03-gris-oscuro.png` | Exterior premium |
| `exterior-premium-10-marron-veta.png` | Exterior premium (logos chicos en los paneles) |
| `exterior-premium-11-madera-vertical.png` | Exterior premium (logos chicos en los paneles) |

## Sin marca visible

- `bachacocina01.png`, `bachacocina02.png`, `bachacocina03.png` (sin uso)
- `cocina-04-lshape-blanco-blanco..png`, `cocina-04-lshape-madera.png`, `cocina-04-lshape-moderno-negro.png`
- `cocina-premium-alacena-01.png`, `cocina-premium-alacena-02.png`, `cocina-premium-alacena-03.png`, `cocina-premium-ushape-02.png`
- `exterior-premium-02-azul-oscuro.png`, `exterior-premium-06-ladrillo.png`
- `puertadeabrir2hojas.png`
- `pisosbalcon.png` y `tipos de colores terraza.png`: sin uso. No tienen la marca, pero sí texto en chino.
- Todas las texturas de `cocina/` y `piso/`

## Sin uso en el sitio: ya movidas fuera de `public/`

Estas imágenes tienen la marca y no las usa ningún componente. Antes de
moverlas se verificó que no aparecieran en el código, los tests ni el
contenido de Sanity. Se pasaron de `public/configurador/` a
`assets-origen/configurador/`, que no se publica, así que ya no se pueden
abrir por URL. Solo hace falta reemplazarlas si se vuelven a usar.

| Archivo | Qué es |
| --- | --- |
| `20-layout-1.png` | Plano 20 ft, distribución 1 |
| `20-layout-2.png` | Plano 20 ft, distribución 2 |
| `20-layout-3.png` | Plano 20 ft, distribución 3 |
| `40-layout-2hab.png` | Plano 40 ft, 2 habitaciones |
| `40-layout-3hab.png` | Plano 40 ft, 3 habitaciones |
| `bano-01-marmol-blanco.png` | Baño completo, mármol blanco |
| `bano-02-marmol-gris.png` | Baño completo, mármol gris |
| `bano-03-marmol-blanco2.png` | Baño completo, mármol blanco 2 |
| `bano-04-marmol-gris2.png` | Baño completo, mármol gris 2 |
| `cocina-mesada-5-variedades.png` | Muestrario de 5 mesadas |
| `pisospvc.png` | Muestrario de pisos PVC |
| `pisosspc-concargo.png` | Muestrario de pisos SPC |

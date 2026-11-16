import { fromPath } from "pdf2pic";
import sharp, { type Sharp } from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const PDF_PATH = path.join(process.cwd(), "assets-origen/proveedor/heshi-catalogue.pdf");
const OUTPUT_ROOT = path.join(process.cwd(), "public/configurador");

// Ancho al que se normaliza cada página renderizada antes de recortar.
// Todas las coordenadas de PAGE_MAP están pensadas sobre este ancho (alto resultante ~844).
const RENDER_WIDTH = 1500;
const RENDER_HEIGHT = 2000;
const RENDER_DENSITY = 300;

type Crop = { top: number; left: number; width: number; height: number };
type PageMapEntry = { page: number; crop: Crop; output: string };

// Mapeo reconstruido a partir del contenido real de assets-origen/proveedor/heshi-catalogue.pdf (20 páginas).
// El PAGE_MAP original tenía los números de página corridos y subestimaba la cantidad
// de imágenes por sección (ver hallazgos reportados en la conversación).
const PAGE_MAP: PageMapEntry[] = [
  // MODELOS — página completa (plano + acotaciones)
  { page: 5, crop: { top: 15, left: 15, width: 1470, height: 815 }, output: "modelos/modelo-20ft-planta.jpg" },
  { page: 6, crop: { top: 15, left: 15, width: 1470, height: 815 }, output: "modelos/modelo-30ft-planta.jpg" },
  { page: 7, crop: { top: 15, left: 15, width: 1470, height: 815 }, output: "modelos/modelo-40ft-planta.jpg" },

  // EXTERIOR — "Standard appearance" (pág 8, 2x2) — usado solo para comparar contra
  // las fotos ya recortadas a mano en public/configurador/ext-liso-*.png
  { page: 8, crop: { top: 125, left: 90, width: 545, height: 335 }, output: "exterior/_review/p8-1.jpg" },
  { page: 8, crop: { top: 125, left: 735, width: 545, height: 335 }, output: "exterior/_review/p8-2.jpg" },
  { page: 8, crop: { top: 475, left: 90, width: 545, height: 335 }, output: "exterior/_review/p8-3.jpg" },
  { page: 8, crop: { top: 475, left: 735, width: 545, height: 335 }, output: "exterior/_review/p8-4.jpg" },

  // EXTERIOR — "Customized Metal Carved Panels" (pág 9 y 10, 2x3 cada una = 12 total)
  // usado solo para comparar contra las fotos ya recortadas a mano ext-calada-*.png
  { page: 9, crop: { top: 165, left: 75, width: 425, height: 290 }, output: "exterior/_review/p9-1.jpg" },
  { page: 9, crop: { top: 165, left: 540, width: 425, height: 290 }, output: "exterior/_review/p9-2.jpg" },
  { page: 9, crop: { top: 165, left: 1010, width: 425, height: 290 }, output: "exterior/_review/p9-3.jpg" },
  { page: 9, crop: { top: 495, left: 75, width: 425, height: 290 }, output: "exterior/_review/p9-4.jpg" },
  { page: 9, crop: { top: 495, left: 540, width: 425, height: 290 }, output: "exterior/_review/p9-5.jpg" },
  { page: 9, crop: { top: 495, left: 1010, width: 425, height: 290 }, output: "exterior/_review/p9-6.jpg" },
  { page: 10, crop: { top: 165, left: 75, width: 425, height: 290 }, output: "exterior/_review/p10-1.jpg" },
  { page: 10, crop: { top: 165, left: 540, width: 425, height: 290 }, output: "exterior/_review/p10-2.jpg" },
  { page: 10, crop: { top: 165, left: 1010, width: 425, height: 290 }, output: "exterior/_review/p10-3.jpg" },
  { page: 10, crop: { top: 495, left: 75, width: 425, height: 290 }, output: "exterior/_review/p10-4.jpg" },
  { page: 10, crop: { top: 495, left: 540, width: 425, height: 290 }, output: "exterior/_review/p10-5.jpg" },
  { page: 10, crop: { top: 495, left: 1010, width: 425, height: 290 }, output: "exterior/_review/p10-6.jpg" },

  // EXTERIOR — "Glass curtain wall" (pág 18, 3 arriba + 1 abajo ancha)
  { page: 18, crop: { top: 150, left: 75, width: 460, height: 285 }, output: "exterior/ext-vidrio-blanco.jpg" },
  { page: 18, crop: { top: 150, left: 545, width: 460, height: 285 }, output: "exterior/ext-vidrio-negro-galeria.jpg" },
  { page: 18, crop: { top: 150, left: 1015, width: 460, height: 285 }, output: "exterior/ext-vidrio-negro-amarillo.jpg" },
  { page: 18, crop: { top: 460, left: 370, width: 760, height: 285 }, output: "exterior/ext-vidrio-blanco-panoramico.jpg" },

  // EXTRAS — "Customized Sloping roof / Porch" (pág 19, 2x2)
  { page: 19, crop: { top: 150, left: 75, width: 640, height: 280 }, output: "extras/extra-porche-vidriado-negro.jpg" },
  { page: 19, crop: { top: 150, left: 775, width: 640, height: 280 }, output: "extras/extra-galeria-barandas-blancas.jpg" },
  { page: 19, crop: { top: 460, left: 75, width: 640, height: 280 }, output: "extras/extra-techo-dos-aguas-galeria.jpg" },
  { page: 19, crop: { top: 460, left: 775, width: 640, height: 280 }, output: "extras/extra-porche-barandas-blancas.jpg" },

  // BAÑO — "Bathroom - 20FT" (pág 11, 1x3)
  { page: 11, crop: { top: 185, left: 65, width: 415, height: 570 }, output: "bano/bano-20ft-vista-1.jpg" },
  { page: 11, crop: { top: 185, left: 520, width: 415, height: 570 }, output: "bano/bano-20ft-vista-2.jpg" },
  { page: 11, crop: { top: 185, left: 975, width: 415, height: 570 }, output: "bano/bano-20ft-vista-3.jpg" },

  // BAÑO — "Bathroom - 40FT" (pág 12, 1x4)
  { page: 12, crop: { top: 185, left: 25, width: 345, height: 570 }, output: "bano/bano-40ft-vista-1.jpg" },
  { page: 12, crop: { top: 185, left: 390, width: 345, height: 570 }, output: "bano/bano-40ft-vista-2.jpg" },
  { page: 12, crop: { top: 185, left: 755, width: 345, height: 570 }, output: "bano/bano-40ft-vista-3.jpg" },
  { page: 12, crop: { top: 185, left: 1120, width: 345, height: 570 }, output: "bano/bano-40ft-vista-4.jpg" },

  // BAÑO — "Bathroom-UV board" (pág 13, paneles de pared, 1x4)
  { page: 13, crop: { top: 270, left: 65, width: 315, height: 420 }, output: "bano/bano-pared-marmol-blanco-veta-gris.jpg" },
  { page: 13, crop: { top: 270, left: 405, width: 315, height: 420 }, output: "bano/bano-pared-marmol-blanco-veta-dorada.jpg" },
  { page: 13, crop: { top: 270, left: 745, width: 315, height: 420 }, output: "bano/bano-pared-blanco-liso.jpg" },
  { page: 13, crop: { top: 270, left: 1090, width: 315, height: 420 }, output: "bano/bano-pared-marmol-gris.jpg" },

  // BAÑO — "Bathroom-Customized Bathtub" (pág 14, 1x3)
  { page: 14, crop: { top: 185, left: 65, width: 415, height: 570 }, output: "bano/bano-banera-vista-1.jpg" },
  { page: 14, crop: { top: 185, left: 520, width: 415, height: 570 }, output: "bano/bano-banera-vista-2.jpg" },
  { page: 14, crop: { top: 185, left: 975, width: 415, height: 570 }, output: "bano/bano-banera-vista-3.jpg" },

  // COCINA — "Kitchen" (pág 15: 2x4 L-shape + muestras encimera + alacena + U-shape)
  { page: 15, crop: { top: 165, left: 20, width: 350, height: 160 }, output: "cocina/cocina-l-shape-beige-1.jpg" },
  { page: 15, crop: { top: 165, left: 389, width: 350, height: 160 }, output: "cocina/cocina-l-shape-blanca-1.jpg" },
  { page: 15, crop: { top: 165, left: 758, width: 350, height: 160 }, output: "cocina/cocina-l-shape-negra.jpg" },
  { page: 15, crop: { top: 165, left: 1127, width: 350, height: 160 }, output: "cocina/cocina-l-shape-beige-2.jpg" },
  { page: 15, crop: { top: 335, left: 20, width: 350, height: 160 }, output: "cocina/cocina-l-shape-blanca-marmol.jpg" },
  { page: 15, crop: { top: 335, left: 389, width: 350, height: 160 }, output: "cocina/cocina-l-shape-textura-gris.jpg" },
  { page: 15, crop: { top: 335, left: 758, width: 350, height: 160 }, output: "cocina/cocina-l-shape-blanca-2.jpg" },
  { page: 15, crop: { top: 335, left: 1127, width: 350, height: 160 }, output: "cocina/cocina-pileta-doble.jpg" },
  { page: 15, crop: { top: 545, left: 20, width: 610, height: 265 }, output: "cocina/cocina-encimera-muestras.jpg" },
  { page: 15, crop: { top: 565, left: 800, width: 270, height: 250 }, output: "cocina/cocina-alacena.jpg" },
  { page: 15, crop: { top: 565, left: 1085, width: 400, height: 250 }, output: "cocina/cocina-u-shape.jpg" },

  // PISO — "Floor-1" PVC (pág 16: muestras fanned + ambiente)
  { page: 16, crop: { top: 250, left: 100, width: 670, height: 450 }, output: "piso/piso-pvc-muestras.jpg" },
  { page: 16, crop: { top: 255, left: 800, width: 600, height: 450 }, output: "piso/piso-pvc-ambiente.jpg" },

  // PISO — "Floor-2" SPC/LVT (pág 17: 4 códigos + ambiente)
  { page: 17, crop: { top: 245, left: 95, width: 430, height: 230 }, output: "piso/piso-spc-9012.jpg" },
  { page: 17, crop: { top: 245, left: 585, width: 430, height: 230 }, output: "piso/piso-spc-7007.jpg" },
  { page: 17, crop: { top: 530, left: 95, width: 430, height: 230 }, output: "piso/piso-spc-9011.jpg" },
  { page: 17, crop: { top: 530, left: 585, width: 430, height: 230 }, output: "piso/piso-spc-9005.jpg" },
  { page: 17, crop: { top: 270, left: 1035, width: 420, height: 490 }, output: "piso/piso-spc-ambiente.jpg" },

  // DECORACIÓN — "Customer's Decoration Reference Examples" (pág 20, 2x4)
  { page: 20, crop: { top: 165, left: 65, width: 335, height: 275 }, output: "decoracion/decor-hall-tv.jpg" },
  { page: 20, crop: { top: 165, left: 420, width: 335, height: 275 }, output: "decoracion/decor-living.jpg" },
  { page: 20, crop: { top: 165, left: 775, width: 335, height: 275 }, output: "decoracion/decor-dormitorio.jpg" },
  { page: 20, crop: { top: 165, left: 1130, width: 335, height: 275 }, output: "decoracion/decor-living-tv.jpg" },
  { page: 20, crop: { top: 460, left: 65, width: 335, height: 275 }, output: "decoracion/decor-pasillo.jpg" },
  { page: 20, crop: { top: 460, left: 420, width: 335, height: 275 }, output: "decoracion/decor-cocina.jpg" },
  { page: 20, crop: { top: 460, left: 775, width: 335, height: 275 }, output: "decoracion/decor-dormitorio-cucheta.jpg" },
  { page: 20, crop: { top: 460, left: 1130, width: 335, height: 275 }, output: "decoracion/decor-living-cocina.jpg" },
];

async function renderPage(pageNumber: number): Promise<Sharp> {
  const convert = fromPath(PDF_PATH, {
    density: RENDER_DENSITY,
    width: RENDER_WIDTH,
    height: RENDER_HEIGHT,
    preserveAspectRatio: true,
    format: "png",
  });

  const result = await convert(pageNumber, { responseType: "buffer" });
  if (!result.buffer) {
    throw new Error(`pdf2pic no devolvió buffer para la página ${pageNumber}`);
  }

  const normalized = await sharp(result.buffer).resize({ width: RENDER_WIDTH }).toBuffer();
  return sharp(normalized);
}

async function main() {
  const pageCache = new Map<number, Buffer>();
  const uniquePages = [...new Set(PAGE_MAP.map((e) => e.page))];

  console.log(`Renderizando ${uniquePages.length} páginas únicas del catálogo...`);
  for (const pageNumber of uniquePages) {
    const rendered = await renderPage(pageNumber);
    const buf = await rendered.toBuffer();
    const meta = await sharp(buf).metadata();
    console.log(`  página ${pageNumber}: ${meta.width}x${meta.height}px`);
    pageCache.set(pageNumber, buf);
  }

  console.log(`\nRecortando ${PAGE_MAP.length} imágenes...`);
  let ok = 0;
  let failed = 0;

  for (const entry of PAGE_MAP) {
    const pageBuf = pageCache.get(entry.page);
    if (!pageBuf) continue;

    const outputPath = path.join(OUTPUT_ROOT, entry.output);
    await mkdir(path.dirname(outputPath), { recursive: true });

    try {
      await sharp(pageBuf)
        .extract({
          left: entry.crop.left,
          top: entry.crop.top,
          width: entry.crop.width,
          height: entry.crop.height,
        })
        .jpeg({ quality: 90 })
        .toFile(outputPath);
      console.log(`  OK  ${entry.output}`);
      ok++;
    } catch (err) {
      console.error(`  FAIL ${entry.output}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nListo: ${ok} imágenes generadas, ${failed} fallidas.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public/configurador");
const OUT = "/private/tmp/claude-501/-Users-lucianochiappero-movara/62346eb6-e587-4ad2-ae69-0cac03820d17/scratchpad/contact-sheet.html";

// Crops que sé que son aproximados / necesitan ojo particular (comunicado en el reporte).
const FLAGGED = new Set([
  "piso/piso-pvc-muestras.jpg", // 5 tablas abanicadas y superpuestas en una sola foto del proveedor
  "cocina/cocina-encimera-muestras.jpg", // 5 láminas numeradas en una sola foto
]);

const CATEGORIES = [
  { key: "modelos", label: "Modelos", note: "Planos completos, una imagen por página" },
  { key: "exterior", label: "Exterior", note: "Vidrio + candidatos calada/liso a comparar contra lo ya recortado a mano" },
  { key: "extras", label: "Extras", note: "Techos y porches (pág. 19)" },
  { key: "bano", label: "Baño", note: "20ft, 40ft, paneles UV, bañera" },
  { key: "cocina", label: "Cocina", note: "L-shape, encimeras, alacena, U-shape (pág. 15)" },
  { key: "piso", label: "Piso", note: "PVC (pág. 16) y SPC/LVT (pág. 17)" },
  { key: "decoracion", label: "Decoración", note: "Ejemplos de referencia del cliente (pág. 20)" },
];

async function thumb(filePath: string): Promise<string> {
  const buf = await sharp(filePath).resize({ width: 420, withoutEnlargement: true }).jpeg({ quality: 62 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const e of entries) {
    if (e.name === ".DS_Store") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(await walk(full));
    else if (/\.(jpg|jpeg|png)$/i.test(e.name)) files.push(full);
  }
  return files.sort();
}

function card(src: string, caption: string, tag?: string): string {
  const pill = tag ? `<span class="tag tag--${tag === "revisar" ? "warn" : "muted"}">${tag}</span>` : "";
  return `<figure class="card">
    <div class="card__img"><img src="${src}" alt="${caption}" loading="lazy" /></div>
    <figcaption><code>${caption}</code>${pill}</figcaption>
  </figure>`;
}

async function main() {
  const sections: string[] = [];
  let totalCount = 0;
  const navItems: string[] = [];

  // Sección especial: recortes manuales existentes
  const rootEntries = await readdir(ROOT, { withFileTypes: true });
  const manualFiles = rootEntries
    .filter((e) => e.isFile() && /\.(jpg|jpeg|png)$/i.test(e.name))
    .map((e) => path.join(ROOT, e.name))
    .sort();

  if (manualFiles.length) {
    const cards = await Promise.all(
      manualFiles.map(async (f) => card(await thumb(f), path.basename(f), "existente"))
    );
    sections.push(`
      <section id="manual" class="section">
        <div class="section__head">
          <h2>Recortes manuales previos</h2>
          <p>${manualFiles.length} imágenes ya recortadas a mano el 20/07, antes de este script — usadas como referencia de calidad y nomenclatura.</p>
        </div>
        <div class="grid">${cards.join("")}</div>
      </section>`);
    navItems.push(`<a href="#manual">Manuales <b>${manualFiles.length}</b></a>`);
    totalCount += manualFiles.length;
  }

  for (const cat of CATEGORIES) {
    const dir = path.join(ROOT, cat.key);
    let files: string[] = [];
    try {
      files = await walk(dir);
    } catch {
      continue;
    }
    if (!files.length) continue;
    totalCount += files.length;
    navItems.push(`<a href="#${cat.key}">${cat.label} <b>${files.length}</b></a>`);

    const cards = await Promise.all(
      files.map(async (f) => {
        const rel = path.relative(ROOT, f).replace(/\\/g, "/");
        const tag = FLAGGED.has(rel) ? "revisar" : rel.includes("_review/") ? "candidato" : undefined;
        return card(await thumb(f), rel, tag);
      })
    );

    sections.push(`
      <section id="${cat.key}" class="section">
        <div class="section__head">
          <h2>${cat.label}</h2>
          <p>${cat.note} · ${files.length} imágenes</p>
        </div>
        <div class="grid">${cards.join("")}</div>
      </section>`);
  }

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Revisión de recortes — Catálogo Heshi</title>
<style>
  :root {
    --bg: #F9F5EE;
    --surface: #FFFFFF;
    --ink: #2F2F2F;
    --ink-soft: #8A8272;
    --accent: #B08A3E;
    --accent-fill: #D4B06A;
    --border: #E6DCC3;
    --warn: #A6472F;
    --warn-bg: #F3E2DC;
    --muted-bg: #EFE9DA;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1B1914;
      --surface: #242019;
      --ink: #F1EAD9;
      --ink-soft: #B3A990;
      --accent: #D9B569;
      --accent-fill: #D4B06A;
      --border: #3B3527;
      --warn: #E1836A;
      --warn-bg: #4A2B22;
      --muted-bg: #322C20;
    }
  }
  :root[data-theme="dark"] {
    --bg: #1B1914; --surface: #242019; --ink: #F1EAD9; --ink-soft: #B3A990;
    --accent: #D9B569; --accent-fill: #D4B06A; --border: #3B3527; --warn: #E1836A;
    --warn-bg: #4A2B22; --muted-bg: #322C20;
  }
  :root[data-theme="light"] {
    --bg: #F9F5EE; --surface: #FFFFFF; --ink: #2F2F2F; --ink-soft: #8A8272;
    --accent: #B08A3E; --accent-fill: #D4B06A; --border: #E6DCC3; --warn: #A6472F;
    --warn-bg: #F3E2DC; --muted-bg: #EFE9DA;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  code, .tag, .count {
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  }
  h1, h2 { font-family: Georgia, "Iowan Old Style", ui-serif, serif; text-wrap: balance; }

  header.top {
    position: sticky; top: 0; z-index: 10;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 20px 32px;
  }
  header.top h1 { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; color: var(--ink); }
  header.top .sub { margin: 0 0 14px; color: var(--ink-soft); font-size: 0.9rem; max-width: 70ch; }
  nav.jump { display: flex; flex-wrap: wrap; gap: 8px; }
  nav.jump a {
    display: inline-flex; align-items: baseline; gap: 5px;
    padding: 5px 12px; border-radius: 999px;
    background: var(--muted-bg); color: var(--ink);
    text-decoration: none; font-size: 0.82rem; border: 1px solid var(--border);
  }
  nav.jump a b { color: var(--accent); font-weight: 700; }
  nav.jump a:hover { border-color: var(--accent); }

  main { padding: 8px 32px 64px; }
  .section { margin-top: 44px; }
  .section__head { margin-bottom: 16px; border-bottom: 2px solid var(--accent-fill); padding-bottom: 10px; }
  .section__head h2 { margin: 0 0 2px; font-size: 1.25rem; }
  .section__head p { margin: 0; color: var(--ink-soft); font-size: 0.85rem; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }
  .card {
    margin: 0; background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
  }
  .card__img { aspect-ratio: 4 / 3; background: var(--muted-bg); }
  .card__img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  figcaption {
    padding: 7px 10px; display: flex; align-items: center; justify-content: space-between; gap: 6px;
  }
  figcaption code { font-size: 0.68rem; color: var(--ink-soft); word-break: break-all; }
  .tag {
    flex-shrink: 0; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 2px 6px; border-radius: 5px; font-weight: 600;
  }
  .tag--warn { background: var(--warn-bg); color: var(--warn); }
  .tag--muted { background: var(--muted-bg); color: var(--ink-soft); }
</style>
</head>
<body>
  <header class="top">
    <h1>Revisión de recortes — Catálogo Heshi</h1>
    <p class="sub">${totalCount} imágenes generadas por <code>scripts/extract-configurator-images.ts</code> a partir de <code>assets-origen/proveedor/heshi-catalogue.pdf</code> (20 páginas). Candidatos de "exterior" marcados <span class="tag tag--muted" style="display:inline">candidato</span> todavía no reemplazan a los recortes manuales — están para comparar. Los marcados <span class="tag tag--warn" style="display:inline">revisar</span> vienen de una foto con varias muestras superpuestas y probablemente necesiten recorte individual a mano.</p>
    <nav class="jump">${navItems.join("")}</nav>
  </header>
  <main>${sections.join("")}</main>
</body>
</html>`;

  await writeFile(OUT, html);
  console.log(`done: ${totalCount} images`);
}

main();

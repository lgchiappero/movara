#!/usr/bin/env bash
# Renderiza cada página de un catálogo PDF como PNG (una imagen por página).
# Requiere poppler (pdftoppm): brew install poppler
#
# Uso: scripts/extract-catalogue-images.sh [pdf] [carpeta-destino] [dpi]
set -euo pipefail

PDF="${1:-assets-origen/proveedor/heshi-catalogue.pdf}"
OUT_DIR="${2:-docs/heshi-catalogue}"
DPI="${3:-200}"

if [ ! -f "$PDF" ]; then
  echo "No se encontró el PDF: $PDF" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

pdftoppm -png -r "$DPI" "$PDF" "$OUT_DIR/page"

echo "Listo. Imágenes en $OUT_DIR/"
ls "$OUT_DIR"

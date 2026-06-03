#!/usr/bin/env bash
# Build coursework.docx from MD sources.
#
# Steps:
#   1. (optional) render_plantuml.sh to update Chapter 2 PNGs
#   2. make_reference_docx.py to produce build/reference.docx
#   3. build_master_md.py to assemble build/master.md
#   4. pandoc to convert master.md → coursework.docx
#
# Usage:
#   cd <repo_root>
#   bash build/scripts/build_docx.sh
#
# Optional env vars:
#   SKIP_PLANTUML=1   skip rendering PlantUML diagrams
#   OUT_NAME=...      override output filename (default: EV_charging_DSS_coursework.docx)

set -e

cd "$(dirname "$0")/../.."
ROOT="$(pwd)"
BUILD="$ROOT/build"
OUT_NAME="${OUT_NAME:-EV_charging_DSS_coursework.docx}"

echo "[1/4] Render PlantUML diagrams..."
if [ "$SKIP_PLANTUML" != "1" ] && [ -x "$BUILD/render_plantuml.sh" ]; then
    bash "$BUILD/render_plantuml.sh" || echo "(plantuml rendering failed/skipped — placeholders will be used)"
else
    echo "(skipped per SKIP_PLANTUML or missing render_plantuml.sh)"
fi

echo "[2/4] Build reference.docx..."
OUT="$BUILD/reference.docx" REPO_ROOT="$ROOT" python3 "$BUILD/scripts/make_reference_docx.py"

echo "[3/4] Build master.md..."
REPO_ROOT="$ROOT" python3 "$BUILD/scripts/build_master_md.py"

echo "[4/4] pandoc master.md → $OUT_NAME ..."
# -implicit_figures: disable auto-captioning from alt text; captions are
# explicit paragraphs styled via custom-style="Caption" fenced divs.
pandoc "$BUILD/master.md" \
    --reference-doc="$BUILD/reference.docx" \
    -f "markdown+tex_math_dollars+tex_math_single_backslash-implicit_figures" \
    -t docx \
    -o "$BUILD/$OUT_NAME"

echo "==="
echo "DONE: $BUILD/$OUT_NAME"
ls -lh "$BUILD/$OUT_NAME"

#!/usr/bin/env bash
# Локальний рендерер PlantUML-діаграм для курсової.
#
# ЯК ВИКОРИСТАТИ:
#   1. Покладіть цей скрипт у корінь проєкту ev-charging-dss
#   2. Запустіть: bash build/render_plantuml.sh
#   3. PNG-файли потраплять у docs/chapter2/images/
#   4. Запустіть повторно build_docx.py — у новому docx будуть реальні діаграми
#
# Залежності: Java (>= 8). Якщо немає plantuml.jar — автозавантаження з github.

set -e

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SRC_DIR="$ROOT/docs/chapter2/images/sources"
OUT_DIR="$ROOT/docs/chapter2/images"
JAR_DIR="$ROOT/build/tools"
JAR="$JAR_DIR/plantuml.jar"

mkdir -p "$OUT_DIR" "$JAR_DIR"

if ! command -v java >/dev/null 2>&1; then
    echo "ERROR: Java не встановлено. macOS: brew install openjdk; Linux: apt install default-jre"
    exit 1
fi

if [ ! -f "$JAR" ]; then
    echo ">>> Завантажую plantuml.jar..."
    PLANTUML_VER="1.2024.8"
    URL="https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VER}/plantuml-${PLANTUML_VER}.jar"
    if command -v curl >/dev/null 2>&1; then
        curl -sSL -o "$JAR" "$URL"
    else
        wget -q -O "$JAR" "$URL"
    fi
    [ ! -s "$JAR" ] && { echo "ERROR: Не вдалося завантажити plantuml.jar"; exit 1; }
fi

echo ">>> Рендерю діаграми..."
cnt=0; fail=0
for puml in "$SRC_DIR"/*.puml; do
    name=$(basename "$puml" .puml)
    echo "  - $name.puml -> ${name}.png"
    if java -jar "$JAR" -tpng -o "$OUT_DIR" "$puml" 2>/dev/null; then
        cnt=$((cnt+1))
    else
        echo "    !! ПОМИЛКА"; fail=$((fail+1))
    fi
done
echo ""
echo "Готово: ${cnt} діаграм згенеровано, ${fail} помилок."
echo "PNG-файли у: $OUT_DIR"

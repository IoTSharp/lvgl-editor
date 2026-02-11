#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

source /home/xcssa/.openclaw/workspace/tools/emsdk/emsdk_env.sh

LVGL_DIR="/home/xcssa/.openclaw/workspace/tools/lvgl"
CONF_DIR="$SCRIPT_DIR"

echo "=== Building LVGL static library (emcc) ==="

# Collect all LVGL .c files
find "$LVGL_DIR/src" -name "*.c" > /tmp/lvgl_sources.txt
TOTAL=$(wc -l < /tmp/lvgl_sources.txt)
echo "Found $TOTAL source files"

# Compile each file
mkdir -p build/lvgl_objs
COUNT=0
while IFS= read -r src; do
  COUNT=$((COUNT + 1))
  # Create a unique .o name by replacing / with _
  obj="build/lvgl_objs/$(echo "$src" | sed 's|/|_|g').o"
  if [ ! -f "$obj" ] || [ "$src" -nt "$obj" ]; then
    emcc -O2 -c "$src" -o "$obj" \
      -I"$CONF_DIR" \
      -I"$LVGL_DIR/.." \
      -DLV_CONF_INCLUDE_SIMPLE \
      -Wno-unused-function \
      -Wno-implicit-function-declaration
  fi
  if [ $((COUNT % 50)) -eq 0 ]; then
    echo "  Compiled $COUNT / $TOTAL"
  fi
done < /tmp/lvgl_sources.txt

echo "  Compiled $COUNT / $TOTAL (done)"

# Archive
echo "=== Archiving liblvgl_emcc.a ==="
emar rcs build/liblvgl_emcc.a build/lvgl_objs/*.o

echo "=== Done: build/liblvgl_emcc.a ==="
ls -lh build/liblvgl_emcc.a

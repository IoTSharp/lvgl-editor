#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

source /home/xcssa/.openclaw/workspace/tools/emsdk/emsdk_env.sh

mkdir -p build
cd build
emcmake cmake ..
emmake make -j$(nproc)

# Copy output to editor public directory
mkdir -p ../../public/wasm
cp lvgl_wasm.html lvgl_wasm.js lvgl_wasm.wasm ../../public/wasm/

echo "Build complete! Files in public/wasm/"

cmake_minimum_required(VERSION 3.10)
project(lvgl_wasm C)

set(CMAKE_C_STANDARD 99)

# LVGL source path
set(LVGL_DIR "/home/xcssa/.openclaw/workspace/tools/lvgl")

# Include paths
include_directories(
    ${CMAKE_SOURCE_DIR}          # lv_conf.h
    ${LVGL_DIR}                  # lvgl internal includes (src/...)
    ${LVGL_DIR}/..               # so #include "lvgl.h" resolves to tools/lvgl/lvgl.h
)

# Collect LVGL source files
file(GLOB_RECURSE LVGL_SOURCES "${LVGL_DIR}/src/*.c")

# Project source files
set(PROJECT_SOURCES
    src/main.c
    src/ui_from_json.c
    src/cJSON.c
)

add_executable(lvgl_wasm ${PROJECT_SOURCES} ${LVGL_SOURCES})

# Emscripten compile options
set_target_properties(lvgl_wasm PROPERTIES
    SUFFIX ".html"
)

target_compile_definitions(lvgl_wasm PRIVATE
    LV_CONF_INCLUDE_SIMPLE
)

target_compile_options(lvgl_wasm PRIVATE
    -O2
    -Wno-unused-function
    -sUSE_SDL=2
)

target_link_options(lvgl_wasm PRIVATE
    -sUSE_SDL=2
    -sALLOW_MEMORY_GROWTH=1
    -sINITIAL_MEMORY=33554432
    "-sEXPORTED_FUNCTIONS=[\"_main\",\"_load_ui_json\",\"_set_screen_size\",\"_malloc\",\"_free\"]"
    "-sEXPORTED_RUNTIME_METHODS=[\"ccall\",\"cwrap\",\"stringToUTF8\",\"lengthBytesUTF8\"]"
    -sASYNCIFY
    --shell-file=${CMAKE_SOURCE_DIR}/shell.html
    -O2
)

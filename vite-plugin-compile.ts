/**
 * Vite plugin: server-side C compilation via emcc
 *
 * POST /api/compile  → compile user code, return { success, error?, buildId }
 * POST /api/project/build-lvgl → build project-specific LVGL static library
 * GET  /api/build/:id/output.js   → Emscripten JS glue
 * GET  /api/build/:id/output.wasm → compiled WASM binary
 */

import type { Plugin } from 'vite';
import { execFile } from 'node:child_process';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

// Font data sent from the client for server-side conversion
interface FontRequest {
  data: string;       // base64 data URI (data:font/ttf;base64,...)
  cFontName: string;  // e.g. "ui_font_noto"
  sizes: number[];    // e.g. [16, 24]
  ranges: string;     // pre-computed range args, e.g. "0x20-0x7e"
  bpp: number;        // 1 | 2 | 4 | 8
}

// Project LVGL config from client
interface LvglConfigRequest {
  colorFormat: 'RGB565' | 'RGB888' | 'ARGB8888';
  fontLarge: boolean;
  defaultFont: string;
  memSize: number; // KB
}

// Paths
const EMSDK_ENV = '/home/xcssa/.openclaw/workspace/tools/emsdk/emsdk_env.sh';
const LVGL_PARENT_DIR = '/home/xcssa/.openclaw/workspace/tools';
const PROJECT_DIR = '/home/xcssa/.openclaw/workspace/projects/lvgl-editor';
const LV_CONF_DIR = join(PROJECT_DIR, 'wasm');
const LIBLVGL_PATH = join(PROJECT_DIR, 'wasm/build/liblvgl_emcc.a');
const LV_CONF_TEMPLATE_PATH = join(PROJECT_DIR, 'wasm/lv_conf.h');

// Build cache: buildId → directory path
const builds = new Map<string, string>();

// LVGL lib cache: configHash → { libPath, confDir, building }
const lvglLibCache = new Map<string, { libPath: string; confDir: string; ready: boolean; error?: string }>();
const lvglLibBuilding = new Map<string, Promise<{ libPath: string; confDir: string }>>();

// Cleanup old builds after 10 minutes
const BUILD_TTL_MS = 10 * 60 * 1000;

/**
 * Compute a hash for the LVGL config to use as cache key
 */
function hashLvglConfig(config: LvglConfigRequest): string {
  const str = JSON.stringify(config);
  return createHash('md5').update(str).digest('hex').slice(0, 12);
}

/**
 * Generate a custom lv_conf.h based on the template and project config
 */
async function generateCustomLvConf(config: LvglConfigRequest): Promise<string> {
  let template = await readFile(LV_CONF_TEMPLATE_PATH, 'utf-8');

  // Color depth
  const colorDepth = config.colorFormat === 'RGB565' ? 16 : config.colorFormat === 'RGB888' ? 24 : 32;
  template = template.replace(
    /#define LV_COLOR_DEPTH\s+\d+/,
    `#define LV_COLOR_DEPTH ${colorDepth}`,
  );

  // Font large
  template = template.replace(
    /#define LV_FONT_FMT_TXT_LARGE\s+\d+/,
    `#define LV_FONT_FMT_TXT_LARGE ${config.fontLarge ? 1 : 0}`,
  );

  // Default font
  template = template.replace(
    /#define LV_FONT_DEFAULT\s+.+/,
    `#define LV_FONT_DEFAULT &lv_font_${config.defaultFont}`,
  );

  return template;
}

/**
 * Build a project-specific LVGL static library
 */
async function buildLvglLib(config: LvglConfigRequest): Promise<{ libPath: string; confDir: string }> {
  const configHash = hashLvglConfig(config);
  const cacheDir = join(tmpdir(), `lvgl-lib-${configHash}`);
  const libPath = join(cacheDir, 'liblvgl_emcc.a');

  // Check if already cached
  if (existsSync(libPath)) {
    return { libPath, confDir: cacheDir };
  }

  await mkdir(cacheDir, { recursive: true });

  // Generate custom lv_conf.h
  const customConf = await generateCustomLvConf(config);
  await writeFile(join(cacheDir, 'lv_conf.h'), customConf, 'utf-8');

  const LVGL_DIR = join(LVGL_PARENT_DIR, 'lvgl');

  // Build command (similar to build_lvgl_lib.sh but using custom conf dir)
  const buildCmd = `source ${EMSDK_ENV} 2>/dev/null && \
    find "${LVGL_DIR}/src" -name "*.c" > /tmp/lvgl_sources_${configHash}.txt && \
    mkdir -p "${cacheDir}/objs" && \
    while IFS= read -r src; do
      obj="${cacheDir}/objs/$(echo "$src" | sed 's|/|_|g').o"
      if [ ! -f "$obj" ] || [ "$src" -nt "$obj" ]; then
        emcc -O2 -c "$src" -o "$obj" \
          -I"${cacheDir}" \
          -I"${LVGL_PARENT_DIR}" \
          -DLV_CONF_INCLUDE_SIMPLE \
          -Wno-unused-function \
          -Wno-implicit-function-declaration
      fi
    done < /tmp/lvgl_sources_${configHash}.txt && \
    emar rcs "${libPath}" "${cacheDir}"/objs/*.o`;

  const result = await runShell(buildCmd, cacheDir);
  if (result.code !== 0) {
    throw new Error(`LVGL library build failed: ${result.stderr || result.stdout}`);
  }

  return { libPath, confDir: cacheDir };
}

function generateMainWrapper(width: number, height: number): string {
  return `#include "lvgl/lvgl.h"
#include <string.h>
#include <emscripten.h>

#define MAX_FB_WIDTH  800
#define MAX_FB_HEIGHT 600

static uint32_t framebuffer[MAX_FB_WIDTH * MAX_FB_HEIGHT];
static volatile int fb_ready = 0;
static int disp_width, disp_height;
static uint8_t draw_buf[MAX_FB_WIDTH * MAX_FB_HEIGHT * 4];

EMSCRIPTEN_KEEPALIVE uint32_t* wasi_get_framebuffer(void) { return framebuffer; }
EMSCRIPTEN_KEEPALIVE int wasi_get_fb_ready(void) { return fb_ready; }
EMSCRIPTEN_KEEPALIVE void wasi_clear_fb_ready(void) { fb_ready = 0; }
EMSCRIPTEN_KEEPALIVE int wasi_get_width(void) { return disp_width; }
EMSCRIPTEN_KEEPALIVE int wasi_get_height(void) { return disp_height; }

static void flush_cb(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
    int32_t w = area->x2 - area->x1 + 1;
    int32_t h = area->y2 - area->y1 + 1;
    uint32_t *src = (uint32_t *)px_map;
    for (int32_t y = 0; y < h; y++) {
        int32_t dst_y = area->y1 + y;
        if (dst_y < 0 || dst_y >= disp_height) continue;
        for (int32_t x = 0; x < w; x++) {
            int32_t dst_x = area->x1 + x;
            if (dst_x < 0 || dst_x >= disp_width) continue;
            framebuffer[dst_y * disp_width + dst_x] = src[y * w + x];
        }
    }
    fb_ready = 1;
    lv_display_flush_ready(disp);
}

static lv_indev_data_t mouse_data;
static void mouse_read_cb(lv_indev_t *indev, lv_indev_data_t *data) {
    (void)indev;
    data->point.x = mouse_data.point.x;
    data->point.y = mouse_data.point.y;
    data->state = mouse_data.state;
}

static uint32_t last_key = 0;
static lv_indev_state_t key_state = LV_INDEV_STATE_RELEASED;

/* Simple key event queue */
#define KEY_QUEUE_SIZE 32
static struct { uint32_t key; uint8_t pressed; } key_queue[KEY_QUEUE_SIZE];
static int key_queue_head = 0;
static int key_queue_tail = 0;

static void keyboard_read_cb(lv_indev_t *indev, lv_indev_data_t *data) {
    (void)indev;
    if (key_queue_head != key_queue_tail) {
        data->key = key_queue[key_queue_tail].key;
        data->state = key_queue[key_queue_tail].pressed ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
        key_queue_tail = (key_queue_tail + 1) % KEY_QUEUE_SIZE;
        data->continue_reading = (key_queue_head != key_queue_tail);
    } else {
        data->key = last_key;
        data->state = LV_INDEV_STATE_RELEASED;
    }
}

EMSCRIPTEN_KEEPALIVE void app_tick(uint32_t ms) {
    lv_tick_inc(ms);
    lv_timer_handler();
}

EMSCRIPTEN_KEEPALIVE void app_mouse_event(int x, int y, int pressed) {
    mouse_data.point.x = x;
    mouse_data.point.y = y;
    mouse_data.state = pressed ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}

EMSCRIPTEN_KEEPALIVE void app_key_event(uint32_t key, int pressed) {
    last_key = key;
    int next = (key_queue_head + 1) % KEY_QUEUE_SIZE;
    if (next != key_queue_tail) {
        key_queue[key_queue_head].key = key;
        key_queue[key_queue_head].pressed = (uint8_t)pressed;
        key_queue_head = next;
    }
}

#include "ui.h"

int main(void) {
    lv_init();

    disp_width = ${width};
    disp_height = ${height};
    lv_display_t *disp = lv_display_create(disp_width, disp_height);
    lv_display_set_flush_cb(disp, flush_cb);
    lv_display_set_buffers(disp, draw_buf, NULL, disp_width * disp_height * 4, LV_DISPLAY_RENDER_MODE_FULL);
    lv_display_set_color_format(disp, LV_COLOR_FORMAT_ARGB8888);

    memset(&mouse_data, 0, sizeof(mouse_data));
    mouse_data.state = LV_INDEV_STATE_RELEASED;
    lv_indev_t *mouse_indev = lv_indev_create();
    lv_indev_set_type(mouse_indev, LV_INDEV_TYPE_POINTER);
    lv_indev_set_read_cb(mouse_indev, mouse_read_cb);

    lv_indev_t *kb_indev = lv_indev_create();
    lv_indev_set_type(kb_indev, LV_INDEV_TYPE_KEYPAD);
    lv_indev_set_read_cb(kb_indev, keyboard_read_cb);

    /* Create a default group so that editable widgets (e.g. textarea)
       are automatically added to it, and link the keypad indev to it. */
    lv_group_t *g = lv_group_create();
    lv_group_set_default(g);
    lv_indev_set_group(kb_indev, g);

    ui_init();

    for (int i = 0; i < 10; i++) {
        lv_timer_handler();
        lv_tick_inc(33);
    }

    return 0;
}
`;
}

function runShell(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile('bash', ['-c', cmd], { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        code: err ? (err as NodeJS.ErrnoException & { status?: number }).status ?? 1 : 0,
      });
    });
  });
}

/**
 * Convert font files to LVGL C sources using lv_font_conv.
 * Returns a map of filename → C source content.
 */
async function convertFonts(
  fonts: FontRequest[],
  workDir: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const font of fonts) {
    // Decode base64 to a temp file
    const raw = font.data.replace(/^data:[^;]+;base64,/, '');
    const fontBytes = Buffer.from(raw, 'base64');

    // Detect extension from data URI or default to .ttf
    const ext = font.data.includes('font/opentype') || font.data.includes('.otf') ? '.otf' : '.ttf';
    const fontFile = join(workDir, `${font.cFontName}${ext}`);
    await writeFile(fontFile, fontBytes);

    // Build range args — fall back to basic ASCII if empty
    const rangeParts = font.ranges
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    if (rangeParts.length === 0) {
      rangeParts.push('0x20-0x7E');
    }

    const rangeArgs = rangeParts.map((r) => `--range=${r}`).join(' ');

    for (const size of font.sizes) {
      const outName = `${font.cFontName}_${size}`;
      const outFile = join(workDir, `${outName}.c`);

      const cmd = `lv_font_conv --font "${fontFile}" --size=${size} --bpp=${font.bpp} ${rangeArgs} --format=lvgl --output="${outFile}" --no-compress`;

      const convResult = await runShell(cmd, workDir);
      if (convResult.code !== 0) {
        throw new Error(
          `lv_font_conv failed for ${outName}: ${convResult.stderr || convResult.stdout}`,
        );
      }

      const cContent = await readFile(outFile, 'utf-8');
      result[`${outName}.c`] = cContent;
    }
  }

  return result;
}

/**
 * Resolve the LVGL library path and conf include dir for a given config.
 * Uses cache or falls back to default.
 */
async function resolveLvglLib(lvglConfig?: LvglConfigRequest): Promise<{ libPath: string; confIncludeDir: string }> {
  if (!lvglConfig) {
    // Use default library
    return { libPath: LIBLVGL_PATH, confIncludeDir: LV_CONF_DIR };
  }

  const configHash = hashLvglConfig(lvglConfig);
  const cached = lvglLibCache.get(configHash);
  if (cached?.ready && existsSync(cached.libPath)) {
    return { libPath: cached.libPath, confIncludeDir: cached.confDir };
  }

  // Check if already building
  let buildPromise = lvglLibBuilding.get(configHash);
  if (!buildPromise) {
    buildPromise = buildLvglLib(lvglConfig).then(result => {
      lvglLibCache.set(configHash, { libPath: result.libPath, confDir: result.confDir, ready: true });
      lvglLibBuilding.delete(configHash);
      return result;
    }).catch(err => {
      lvglLibCache.set(configHash, { libPath: '', confDir: '', ready: false, error: String(err) });
      lvglLibBuilding.delete(configHash);
      throw err;
    });
    lvglLibBuilding.set(configHash, buildPromise);
  }

  const result = await buildPromise;
  return { libPath: result.libPath, confIncludeDir: result.confDir };
}

export default function compilePlugin(): Plugin {
  return {
    name: 'lvgl-compile',
    configureServer(server) {
      // POST /api/project/build-lvgl — build project-specific LVGL library
      server.middlewares.use('/api/project/build-lvgl', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
          lvglConfig: LvglConfigRequest;
        };

        try {
          const { libPath, confIncludeDir } = await resolveLvglLib(body.lvglConfig);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            configHash: hashLvglConfig(body.lvglConfig),
            libPath,
            confDir: confIncludeDir,
          }));
        } catch (err) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: String(err),
          }));
        }
      });

      // POST /api/compile
      server.middlewares.use('/api/compile', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        // Read body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
          files: Record<string, string>;
          fonts?: FontRequest[];
          width: number;
          height: number;
          lvglConfig?: LvglConfigRequest;
        };

        const { files, fonts, width, height, lvglConfig } = body;
        const buildId = randomUUID();
        const buildDir = join(tmpdir(), `lvgl-build-${buildId}`);

        try {
          await mkdir(buildDir, { recursive: true });

          // Resolve LVGL library (project-specific or default)
          let libPath: string;
          let confIncludeDir: string;
          try {
            const resolved = await resolveLvglLib(lvglConfig);
            libPath = resolved.libPath;
            confIncludeDir = resolved.confIncludeDir;
          } catch (libErr) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: `LVGL 库编译失败: ${String(libErr)}`,
              buildId: '',
            }));
            return;
          }

          // Check lib exists
          if (!existsSync(libPath)) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: 'liblvgl_emcc.a not found. Run wasm/build_lvgl_lib.sh first.',
              buildId: '',
            }));
            return;
          }

          // Write user files
          for (const [name, content] of Object.entries(files)) {
            await writeFile(join(buildDir, name), content, 'utf-8');
          }

          // Write main_wrapper.c
          await writeFile(join(buildDir, 'main_wrapper.c'), generateMainWrapper(width, height), 'utf-8');

          // Convert font resources via lv_font_conv
          let fontCFiles: Record<string, string> = {};
          if (fonts && fonts.length > 0) {
            try {
              fontCFiles = await convertFonts(fonts, buildDir);
              // Write generated font .c files into buildDir
              for (const [name, content] of Object.entries(fontCFiles)) {
                await writeFile(join(buildDir, name), content, 'utf-8');
              }
            } catch (fontErr) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: `字体转换失败: ${String(fontErr)}`,
                buildId: '',
              }));
              return;
            }
          }

          // Collect .c files from user
          const cFiles = Object.keys(files).filter(f => f.endsWith('.c'));
          const fontFiles = Object.keys(fontCFiles);
          const sourceFiles = ['main_wrapper.c', ...cFiles, ...fontFiles].join(' ');

          const emccCmd = `source ${EMSDK_ENV} 2>/dev/null && emcc ${sourceFiles} \
            -O2 -DLV_CONF_INCLUDE_SIMPLE \
            -I${LVGL_PARENT_DIR} \
            -I${LVGL_PARENT_DIR}/lvgl \
            -I${LVGL_PARENT_DIR}/lvgl/src \
            -I${confIncludeDir} \
            -I. \
            ${libPath} \
            -sALLOW_MEMORY_GROWTH=1 \
            -sINITIAL_MEMORY=33554432 \
            -sEXPORTED_FUNCTIONS="['_main','_app_tick','_app_mouse_event','_app_key_event','_wasi_get_framebuffer','_wasi_get_fb_ready','_wasi_clear_fb_ready','_wasi_get_width','_wasi_get_height']" \
            -sEXPORTED_RUNTIME_METHODS="['ccall','cwrap','HEAPU8','HEAPU32']" \
            -sNO_EXIT_RUNTIME=1 \
            -sMODULARIZE=1 \
            -sEXPORT_NAME='LvglModule' \
            -sENVIRONMENT=web \
            -Wno-unused-function \
            -Wno-implicit-function-declaration \
            -o output.js`;

          const result = await runShell(emccCmd, buildDir);

          if (result.code !== 0) {
            // Cleanup on failure
            await rm(buildDir, { recursive: true, force: true }).catch(() => {});
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: result.stderr || result.stdout,
              buildId: '',
            }));
            return;
          }

          // Store build directory
          builds.set(buildId, buildDir);

          // Schedule cleanup
          setTimeout(async () => {
            builds.delete(buildId);
            await rm(buildDir, { recursive: true, force: true }).catch(() => {});
          }, BUILD_TTL_MS);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            buildId,
          }));
        } catch (err) {
          await rm(buildDir, { recursive: true, force: true }).catch(() => {});
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: String(err),
            buildId: '',
          }));
        }
      });

      // GET /api/build/:buildId/output.js
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/api\/build\/([a-f0-9-]+)\/(output\.js|output\.wasm)$/);
        if (!match || req.method !== 'GET') {
          next();
          return;
        }

        const buildId = match[1];
        const fileName = match[2];
        const buildDir = builds.get(buildId);

        if (!buildDir) {
          res.statusCode = 404;
          res.end('Build not found');
          return;
        }

        const filePath = join(buildDir, fileName);
        readFile(filePath)
          .then((data) => {
            if (fileName === 'output.js') {
              res.setHeader('Content-Type', 'application/javascript');
            } else {
              res.setHeader('Content-Type', 'application/wasm');
            }
            res.setHeader('Cache-Control', 'no-cache');
            res.end(data);
          })
          .catch(() => {
            res.statusCode = 404;
            res.end('File not found');
          });
      });
    },
  };
}

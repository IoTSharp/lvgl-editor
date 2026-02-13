/**
 * Server-side C compiler service
 * Sends user code to the Vite dev server for emcc compilation,
 * then loads the Emscripten module in the browser.
 */

export type CompileStatus =
  | 'idle'
  | 'compiling'
  | 'loading'
  | 'running'
  | 'done'
  | 'error';

/** Runtime handle for interactive WASM execution */
export interface WasmRuntime {
  tick(ms: number): void;
  mouseEvent(x: number, y: number, pressed: boolean): void;
  keyEvent(key: number, pressed: boolean): void;
  getFramebuffer(): Uint8Array | null;
  getWidth(): number;
  getHeight(): number;
  destroy(): void;
}

export interface CompileResult {
  success: boolean;
  output: string;
  runtime: WasmRuntime | null;
  width: number;
  height: number;
}

interface CompileResponse {
  success: boolean;
  error?: string;
  buildId: string;
}

// Emscripten module type
interface EmscriptenModule {
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => (...args: unknown[]) => unknown;
  HEAPU8: Uint8Array;
  _main?: () => number;
}

/** Font data for server-side conversion */
export interface FontCompileRequest {
  data: string;       // base64 data URI
  cFontName: string;  // e.g. "ui_font_noto"
  sizes: number[];    // e.g. [16, 24]
  ranges: string;     // pre-computed range string, e.g. "0x20-0x7e"
  bpp: number;        // 1 | 2 | 4 | 8
}

/**
 * Compile C code on the server and return a WasmRuntime for interactive use.
 */
export async function compileCode(
  userFiles: Record<string, string>,
  width: number,
  height: number,
  onStatus?: (status: CompileStatus, message: string) => void,
  fonts?: FontCompileRequest[],
): Promise<CompileResult> {
  const result: CompileResult = {
    success: false,
    output: '',
    runtime: null,
    width,
    height,
  };

  try {
    // Step 1: Send code to server for compilation
    onStatus?.('compiling', '正在服务端编译...');

    // Strip "include/" prefix — server expects flat file names
    const files: Record<string, string> = {};
    for (const [name, content] of Object.entries(userFiles)) {
      // userFiles may have both "ui.h" and "include/ui.h" — keep only non-prefixed
      if (!name.startsWith('include/')) {
        files[name] = content;
      }
    }

    const resp = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, fonts: fonts ?? [], width, height }),
    });

    if (!resp.ok) {
      throw new Error(`服务端错误: ${resp.status} ${resp.statusText}`);
    }

    const data: CompileResponse = await resp.json();

    if (!data.success) {
      result.output = data.error ?? '编译失败（未知错误）';
      onStatus?.('error', '编译失败');
      return result;
    }

    // Step 2: Load the Emscripten JS glue
    onStatus?.('loading', '正在加载编译结果...');

    const buildId = data.buildId;
    const runtime = await loadEmscriptenModule(buildId, width, height);

    if (runtime) {
      result.runtime = runtime;
      result.width = runtime.getWidth();
      result.height = runtime.getHeight();
      result.success = true;
      result.output = '编译成功';
      onStatus?.('done', '运行中');
    } else {
      result.output = 'Emscripten 模块加载失败';
      onStatus?.('error', '模块加载失败');
    }

    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.output = '错误: ' + msg;
    onStatus?.('error', msg);
    return result;
  }
}

/**
 * Load the Emscripten JS glue via dynamic script injection,
 * initialize the module, and return a WasmRuntime.
 */
async function loadEmscriptenModule(
  buildId: string,
  width: number,
  height: number,
): Promise<WasmRuntime | null> {
  const jsUrl = `/api/build/${buildId}/output.js`;
  const wasmUrl = `/api/build/${buildId}/output.wasm`;

  // Fetch the JS glue as text and evaluate it
  const jsResp = await fetch(jsUrl);
  if (!jsResp.ok) throw new Error('Failed to load output.js');
  const jsCode = await jsResp.text();

  // Evaluate the module factory — Emscripten MODULARIZE creates a global factory
  // We use Function constructor to avoid polluting global scope
  const factory = new Function(jsCode + '\nreturn LvglModule;')() as (
    opts: Record<string, unknown>,
  ) => Promise<EmscriptenModule>;

  // Initialize the module
  const module = await factory({
    locateFile: (path: string) => {
      if (path.endsWith('.wasm')) return wasmUrl;
      return path;
    },
  });

  // Wrap exported functions
  const appTick = module.cwrap('app_tick', null, ['number']) as (ms: number) => void;
  const appMouseEvent = module.cwrap('app_mouse_event', null, ['number', 'number', 'number']) as (
    x: number,
    y: number,
    pressed: number,
  ) => void;
  const appKeyEvent = module.cwrap('app_key_event', null, ['number', 'number']) as (
    key: number,
    pressed: number,
  ) => void;
  const getFb = module.cwrap('wasi_get_framebuffer', 'number', []) as () => number;
  const getFbReady = module.cwrap('wasi_get_fb_ready', 'number', []) as () => number;
  const clearFbReady = module.cwrap('wasi_clear_fb_ready', null, []) as () => void;
  const getWidth = module.cwrap('wasi_get_width', 'number', []) as () => number;
  const getHeight = module.cwrap('wasi_get_height', 'number', []) as () => number;

  const w = getWidth() || width;
  const h = getHeight() || height;
  let destroyed = false;

  return {
    tick(ms: number) {
      if (destroyed) return;
      appTick(ms);
    },

    mouseEvent(x: number, y: number, pressed: boolean) {
      if (destroyed) return;
      appMouseEvent(x, y, pressed ? 1 : 0);
    },

    keyEvent(key: number, pressed: boolean) {
      if (destroyed) return;
      appKeyEvent(key, pressed ? 1 : 0);
    },

    getFramebuffer(): Uint8Array | null {
      if (destroyed) return null;
      const ready = getFbReady();
      if (!ready) return null;
      const fbPtr = getFb();
      if (fbPtr <= 0) return null;
      clearFbReady();
      const fbSize = w * h * 4;
      // Copy from HEAPU8 — the underlying buffer may detach on growth
      return new Uint8Array(module.HEAPU8.buffer.slice(fbPtr, fbPtr + fbSize));
    },

    getWidth() { return w; },
    getHeight() { return h; },

    destroy() {
      destroyed = true;
    },
  };
}

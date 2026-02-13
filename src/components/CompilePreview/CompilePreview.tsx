import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useLogicEditorStore } from '../LogicEditor';
import { useResourceStore } from '../../resources';
import { useAppStore } from '../../store/appStore';
import { useProjectStore } from '../../store/projectStore';
import { generateCode } from '../../codegen';
import { compileCode, type CompileStatus, type WasmRuntime, type FontCompileRequest } from './compilerService';
import { getCharsetRanges } from '../../resources/converters/fontConverter';
import type { LvglComponent } from '../../types';
import type { FontResource, ImageResource } from '../../resources/types';
import { loadImageFromBase64, generateImageCCode, DEFAULT_IMAGE_OPTIONS } from '../../resources/converters/imageConverter';
import './CompilePreview.css';

/**
 * Collect all custom font + size combinations used by components.
 * Returns a Map of cFontName -> Set of sizes.
 */
function collectUsedCustomFontSizes(
  pages: { components: LvglComponent[] }[],
  fontResources: FontResource[],
  defaultFont?: string,
  defaultFontSize?: number
): Map<string, Set<number>> {
  const usedFonts = new Map<string, Set<number>>();
  const isBuiltin = (name: string) => /^montserrat_\d+$/.test(name);
  const customFontNames = new Set(fontResources.map(f => f.cFontName));

  const addFont = (fontName: string, size: number) => {
    if (!usedFonts.has(fontName)) {
      usedFonts.set(fontName, new Set());
    }
    usedFonts.get(fontName)!.add(size);
  };

  const walkComponents = (components: LvglComponent[]) => {
    for (const comp of components) {
      if (comp.props.fontResource) {
        const fontName = comp.props.fontResource as string;
        if (!isBuiltin(fontName) && customFontNames.has(fontName)) {
          addFont(fontName, (comp.props.fontSize as number) || 16);
        }
      } else if (comp.props.fontSize !== undefined && defaultFont && !isBuiltin(defaultFont) && customFontNames.has(defaultFont)) {
        // No fontResource but has fontSize override — uses default font with different size
        const fontSize = comp.props.fontSize as number;
        if (fontSize !== (defaultFontSize || 16)) {
          addFont(defaultFont, fontSize);
        }
      }
      if (comp.styles.default.textFont) {
        const fontName = comp.styles.default.textFont;
        if (!isBuiltin(fontName) && customFontNames.has(fontName)) {
          addFont(fontName, comp.styles.default.textFontSize || 16);
        }
      }
      for (const state of ['pressed', 'focused', 'disabled'] as const) {
        const stateStyles = comp.styles[state];
        if (stateStyles?.textFont) {
          const fontName = stateStyles.textFont;
          if (!isBuiltin(fontName) && customFontNames.has(fontName)) {
            addFont(fontName, stateStyles.textFontSize || 16);
          }
        }
      }
      walkComponents(comp.children);
    }
  };

  for (const page of pages) {
    walkComponents(page.components);
  }

  // Include the project default font if it's a custom font (with its default size)
  if (defaultFont && !isBuiltin(defaultFont) && customFontNames.has(defaultFont)) {
    addFont(defaultFont, defaultFontSize || 16);
  }

  return usedFonts;
}

/** Map JS keyboard event.key to LVGL key codes */
const LV_KEY_MAP: Record<string, number> = {
  Enter:      10,   // LV_KEY_ENTER
  Escape:     27,   // LV_KEY_ESC
  Backspace:  8,    // LV_KEY_BACKSPACE
  Delete:     127,  // LV_KEY_DEL
  ArrowRight: 19,   // LV_KEY_RIGHT
  ArrowLeft:  20,   // LV_KEY_LEFT
  ArrowUp:    17,   // LV_KEY_UP
  ArrowDown:  18,   // LV_KEY_DOWN
  Tab:        9,    // LV_KEY_NEXT
  Home:       2,    // LV_KEY_HOME
  End:        3,    // LV_KEY_END
};

const CompilePreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<WasmRuntime | null>(null);
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mousePressedRef = useRef(false);

  const [status, setStatus] = useState<CompileStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [compileOutput, setCompileOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [running, setRunning] = useState(false);

  const pages = useEditorStore((s) => s.pages);
  const canvas = useEditorStore((s) => s.canvas);
  const logicGraphs = useLogicEditorStore((s) => s.graphs);
  const { images: imageResources, fonts: fontResources } = useResourceStore();
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const getProjectConfig = useProjectStore((s) => s.getProjectConfig);

  const [projectDefaultFont, setProjectDefaultFont] = useState<string | undefined>();
  const [projectDefaultFontSize, setProjectDefaultFontSize] = useState<number | undefined>();
  const [projectUseBuiltinSymbols, setProjectUseBuiltinSymbols] = useState<boolean>(true);
  const [projectSymbolFont, setProjectSymbolFont] = useState<string | undefined>();

  // Load project default font
  useEffect(() => {
    if (!currentProjectId) return;
    getProjectConfig(currentProjectId).then(cfg => {
      if (cfg) {
        setProjectDefaultFont(cfg.lvglConfig.defaultFont);
        setProjectDefaultFontSize(cfg.lvglConfig.defaultFontSize);
        setProjectUseBuiltinSymbols(cfg.lvglConfig.useBuiltinSymbols !== false);
        setProjectSymbolFont(cfg.lvglConfig.symbolFont);
      }
    });
  }, [currentProjectId, getProjectConfig]);

  // Generate C code from current editor state
  const generateCCode = useCallback(() => {
    return generateCode(pages, {}, logicGraphs, undefined, imageResources, fontResources, projectDefaultFont, projectDefaultFontSize, projectUseBuiltinSymbols, projectSymbolFont);
  }, [pages, logicGraphs, imageResources, fontResources, projectDefaultFont, projectDefaultFontSize, projectUseBuiltinSymbols, projectSymbolFont]);

  // Render framebuffer to canvas
  const renderFramebuffer = useCallback((fbData: Uint8Array, width: number, height: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    cvs.width = width;
    cvs.height = height;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    // Convert ARGB8888 (LVGL, little-endian: B G R A) to RGBA (Canvas)
    for (let i = 0; i < width * height; i++) {
      const off = i * 4;
      pixels[off]     = fbData[off + 2]; // R
      pixels[off + 1] = fbData[off + 1]; // G
      pixels[off + 2] = fbData[off];     // B
      pixels[off + 3] = fbData[off + 3] || 255; // A
    }

    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Stop the event loop and destroy runtime
  const stopRuntime = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    if (runtimeRef.current) {
      runtimeRef.current.destroy();
      runtimeRef.current = null;
    }
    setRunning(false);
  }, []);

  // Start the requestAnimationFrame event loop
  const startEventLoop = useCallback((runtime: WasmRuntime) => {
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Cap delta to avoid huge jumps (e.g. tab was backgrounded)
      const ms = Math.min(delta, 100);
      runtime.tick(Math.round(ms));

      const fb = runtime.getFramebuffer();
      if (fb) {
        renderFramebuffer(fb, runtime.getWidth(), runtime.getHeight());
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, [renderFramebuffer]);

  // Handle compile & run
  const handleCompile = useCallback(async () => {
    if (status === 'compiling' || status === 'loading' || status === 'running') {
      return;
    }

    // Stop any previous runtime
    stopRuntime();

    setCompileOutput('');
    setShowOutput(false);

    const code = generateCCode();

    const userFiles: Record<string, string> = {};
    for (const [fileName, content] of Object.entries(code)) {
      userFiles[fileName] = content;
    }

    // Generate image C array files for used image resources
    if (imageResources.length > 0) {
      const usedImageIds = new Set<string>();
      const walkImages = (components: LvglComponent[]) => {
        for (const comp of components) {
          if (comp.type === 'img' && comp.props.src) {
            const matched = imageResources.find(
              (img) => img.id === comp.props.src || img.name === comp.props.src
            );
            if (matched) usedImageIds.add(matched.id);
          }
          walkImages(comp.children);
        }
      };
      for (const page of pages) walkImages(page.components);

      const usedImages = imageResources.filter((img) => usedImageIds.has(img.id));
      for (const img of usedImages) {
        try {
          const { imageData } = await loadImageFromBase64(img.data);
          const convOptions = { ...DEFAULT_IMAGE_OPTIONS, format: img.format };
          const result = generateImageCCode(img.cArrayName, imageData, convOptions);
          userFiles[`${img.cArrayName}.c`] = result.cCode;
        } catch (err) {
          console.error(`Failed to generate C code for image ${img.name}:`, err);
        }
      }
    }

    // Build font compile requests by dynamically collecting used font+size combos
    const usedFontSizes = collectUsedCustomFontSizes(pages, fontResources, projectDefaultFont, projectDefaultFontSize);
    const fontRequests: FontCompileRequest[] = fontResources
      .filter((font) => usedFontSizes.has(font.cFontName))
      .map((font) => {
        const ranges = getCharsetRanges(font.charset, font.customChars);
        const rangeStr = ranges.length > 0
          ? ranges.map(([start, end]) => `0x${start.toString(16)}-0x${end.toString(16)}`).join(',')
          : '0x20-0x7E'; // fallback to basic ASCII
        const sizes = [...usedFontSizes.get(font.cFontName)!].sort((a, b) => a - b);
        return {
          data: font.data,
          cFontName: font.cFontName,
          sizes,
          ranges: rangeStr,
          bpp: font.bpp,
        };
      });

    const result = await compileCode(
      userFiles,
      canvas.width,
      canvas.height,
      (newStatus, message) => {
        setStatus(newStatus);
        setStatusMessage(message);
      },
      fontRequests.length > 0 ? fontRequests : undefined,
    );

    setCompileOutput(result.output);

    if (result.success && result.runtime) {
      runtimeRef.current = result.runtime;
      setRunning(true);
      setStatus('done');
      setStatusMessage('运行中 — 点击画布可交互');

      // Render initial frame
      const fb = result.runtime.getFramebuffer();
      if (fb) {
        renderFramebuffer(fb, result.runtime.getWidth(), result.runtime.getHeight());
      }

      // Start event loop
      startEventLoop(result.runtime);

      // Focus canvas for keyboard input
      canvasRef.current?.focus();
    } else if (!result.success) {
      setShowOutput(true);
      setStatus('error');
    } else {
      setStatus('done');
      setStatusMessage('编译成功（无运行时）');
    }
  }, [status, generateCCode, canvas.width, canvas.height, renderFramebuffer, stopRuntime, startEventLoop, pages, imageResources, fontResources, projectDefaultFont, projectDefaultFontSize]);

  // Handle stop button
  const handleStop = useCallback(() => {
    stopRuntime();
    setStatus('idle');
    setStatusMessage('已停止');
  }, [stopRuntime]);

  // Get mouse position relative to canvas, accounting for CSS scaling
  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }, []);

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const { x, y } = getCanvasPos(e);
    rt.mouseEvent(x, y, mousePressedRef.current);
  }, [getCanvasPos]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rt = runtimeRef.current;
    if (!rt) return;
    mousePressedRef.current = true;
    const { x, y } = getCanvasPos(e);
    rt.mouseEvent(x, y, true);
    // Focus canvas for keyboard events
    canvasRef.current?.focus();
  }, [getCanvasPos]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rt = runtimeRef.current;
    if (!rt) return;
    mousePressedRef.current = false;
    const { x, y } = getCanvasPos(e);
    rt.mouseEvent(x, y, false);
  }, [getCanvasPos]);

  const handleMouseLeave = useCallback(() => {
    // Release mouse when leaving canvas
    if (mousePressedRef.current && runtimeRef.current) {
      mousePressedRef.current = false;
    }
  }, []);

  // Keyboard event handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const rt = runtimeRef.current;
    if (!rt) return;
    e.preventDefault();

    // Check for mapped control keys first
    const lvKey = LV_KEY_MAP[e.key];
    if (lvKey !== undefined) {
      rt.keyEvent(lvKey, true);
    } else if (e.key.length === 1) {
      // Single printable character — send its Unicode code point
      rt.keyEvent(e.key.charCodeAt(0), true);
    }
  }, []);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const rt = runtimeRef.current;
    if (!rt) return;
    e.preventDefault();

    const lvKey = LV_KEY_MAP[e.key];
    if (lvKey !== undefined) {
      rt.keyEvent(lvKey, false);
    } else if (e.key.length === 1) {
      rt.keyEvent(e.key.charCodeAt(0), false);
    }
  }, []);

  // Clear canvas on mount
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    cvs.width = canvas.width;
    cvs.height = canvas.height;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击"编译运行"查看 LVGL 渲染结果', canvas.width / 2, canvas.height / 2);
    }
  }, [canvas.width, canvas.height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (runtimeRef.current) {
        runtimeRef.current.destroy();
      }
    };
  }, []);

  const statusIcon = {
    idle: '⚡',
    compiling: '🔨',
    loading: '📦',
    running: '▶️',
    done: running ? '🟢' : '✅',
    error: '❌',
  }[status];

  const isWorking = ['compiling', 'loading', 'running'].includes(status);

  return (
    <div className="compile-preview">
      <div className="compile-preview-toolbar">
        <button
          className={`compile-btn ${isWorking ? 'working' : ''}`}
          onClick={handleCompile}
          disabled={isWorking}
        >
          {isWorking ? '⏳ 处理中...' : '🔨 编译运行'}
        </button>

        {running && (
          <button className="compile-stop-btn" onClick={handleStop}>
            ⏹ 停止
          </button>
        )}

        <span className="compile-status">
          {statusIcon} {statusMessage || (status === 'idle' ? '就绪' : '')}
        </span>

        <div className="compile-toolbar-right">
          <button
            className={`compile-output-toggle ${showOutput ? 'active' : ''}`}
            onClick={() => setShowOutput(!showOutput)}
          >
            📋 {showOutput ? '隐藏输出' : '编译输出'}
          </button>
        </div>
      </div>

      <div className="compile-preview-body">
        <div
          className="compile-canvas-wrapper"
          style={{ width: canvas.width, height: canvas.height }}
        >
          {isWorking && (
            <div className="compile-overlay">
              <div className="compile-spinner" />
              <div className="compile-overlay-text">{statusMessage}</div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`compile-canvas ${running ? 'interactive' : ''}`}
            width={canvas.width}
            height={canvas.height}
            tabIndex={running ? 0 : undefined}
            onMouseMove={running ? handleMouseMove : undefined}
            onMouseDown={running ? handleMouseDown : undefined}
            onMouseUp={running ? handleMouseUp : undefined}
            onMouseLeave={running ? handleMouseLeave : undefined}
            onKeyDown={running ? handleKeyDown : undefined}
            onKeyUp={running ? handleKeyUp : undefined}
          />
        </div>

        {showOutput && (
          <div className="compile-output-panel">
            <div className="compile-output-header">
              <span>编译输出</span>
              <button onClick={() => setCompileOutput('')}>清除</button>
            </div>
            <pre className="compile-output-content">
              {compileOutput || '（无输出）'}
            </pre>
          </div>
        )}
      </div>

      <div className="compile-preview-footer">
        服务端 emcc 编译，LVGL 真实渲染 · 支持鼠标和键盘交互
      </div>
    </div>
  );
};

export default CompilePreview;

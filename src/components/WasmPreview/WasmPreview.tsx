import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { editorStateToJson } from './editorStateToJson';
import './WasmPreview.css';

type Status = 'loading' | 'ready' | 'error';

const WasmPreview: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const pages = useEditorStore((s) => s.pages);
  const currentPageId = useEditorStore((s) => s.currentPageId);
  const canvas = useEditorStore((s) => s.canvas);

  // Send UI JSON to iframe
  const sendToWasm = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || status !== 'ready') return;
    const json = editorStateToJson(pages, currentPageId, canvas);
    iframe.contentWindow.postMessage({ type: 'load-ui', json }, '*');
  }, [pages, currentPageId, canvas, status]);

  // Listen for lvgl-ready from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'lvgl-ready') {
        setStatus('ready');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Debounced sync on state change
  useEffect(() => {
    if (status !== 'ready') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      sendToWasm();
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pages, currentPageId, canvas, status, sendToWasm]);

  // Timeout for loading — mark error after 15s
  useEffect(() => {
    if (status !== 'loading') return;
    const t = setTimeout(() => {
      setStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }, 15000);
    return () => clearTimeout(t);
  }, [status]);

  const handleRefresh = () => {
    setStatus('loading');
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = '/wasm/lvgl_wasm.html';
    }
  };

  const statusLabel =
    status === 'ready'
      ? '✅ 就绪'
      : status === 'loading'
        ? '⏳ LVGL 运行时加载中...'
        : '❌ 加载失败';

  return (
    <div className="wasm-preview">
      <div className="wasm-preview-toolbar">
        <span className={`wasm-preview-status wasm-preview-status--${status}`}>
          {statusLabel}
        </span>
        <button className="wasm-preview-refresh" onClick={handleRefresh}>
          🔄 刷新
        </button>
      </div>

      <div className="wasm-preview-body">
        <div
          className="wasm-preview-iframe-wrapper"
          style={{ width: canvas.width, height: canvas.height }}
        >
          {status === 'loading' && (
            <div className="wasm-preview-overlay">LVGL 运行时加载中...</div>
          )}
          {status === 'error' && (
            <div className="wasm-preview-overlay wasm-preview-overlay--error">
              WASM 加载失败，请点击刷新重试
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="wasm-preview-iframe"
            src="/wasm/lvgl_wasm.html"
            title="LVGL WASM 预览"
            width={canvas.width}
            height={canvas.height}
          />
        </div>
      </div>

      <div className="wasm-preview-footer">
        使用 LVGL WASM 运行时渲染，与真实设备效果一致
      </div>
    </div>
  );
};

export default WasmPreview;

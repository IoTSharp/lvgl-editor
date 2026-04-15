/// <reference types="vite/client" />

declare module 'virtual:compile-preview' {
  import type { FC } from 'react';

  const CompilePreview: FC;
  export default CompilePreview;
}

interface OmniHostWindowApi {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
}

interface OmniHostBridge {
  window: OmniHostWindowApi;
  invoke?: (handler: string, payload?: unknown) => Promise<unknown>;
  on?: (event: string, handler: (payload: unknown) => void) => void;
}

interface Window {
  omni?: OmniHostBridge;
}

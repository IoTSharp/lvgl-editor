import type { Page, Theme } from '../types';
import type { LogicGraph } from '../components/LogicEditor/types';
import type { ImageResource, FontResource } from '../resources/types';
import type { CodeGenOptions } from '../codegen/types';
import type { CIntegrationProfileId } from './cIntegration';

export type TargetId = 'c-lvgl' | 'lispbm-vesc' | 'basic-iotembedded';
export const DEFAULT_TARGET: TargetId = 'c-lvgl';
export const TARGETS = [
  { id: 'c-lvgl' as const, label: 'C / LVGL', language: 'c' },
  { id: 'lispbm-vesc' as const, label: 'LispBM / VESC', language: 'scheme' },
  { id: 'basic-iotembedded' as const, label: 'BASIC / IoTEmbedded', language: 'vb' },
];
export function resolveTargetId(value?: unknown): TargetId {
  if (value === undefined) return DEFAULT_TARGET;
  if (TARGETS.some(t => t.id === value)) return value as TargetId;
  throw new Error(`Unknown output target: ${String(value)}`);
}
export interface EditorInitializationOptions {
  defaultTarget?: TargetId;
  allowedTargets?: TargetId[];
  allowTargetSwitch?: boolean;
}
declare global { interface Window { LVGL_EDITOR_OPTIONS?: EditorInitializationOptions; } }
export function getInitializationOptions(options: EditorInitializationOptions = typeof window === 'undefined' ? {} : window.LVGL_EDITOR_OPTIONS ?? {}) {
  const defaultTarget = resolveTargetId(options.defaultTarget);
  const allowedTargets = options.allowedTargets === undefined ? TARGETS.map(t => t.id) : options.allowedTargets.map(resolveTargetId);
  if (!allowedTargets.length || !allowedTargets.includes(defaultTarget)) throw new Error('Default output target must be allowed by the host.');
  return { defaultTarget, allowedTargets, allowTargetSwitch: options.allowTargetSwitch !== false };
}
/** Validate a saved/explicit target without changing it to the host default. */
export function resolveHostTarget(value?: unknown, options?: EditorInitializationOptions): TargetId {
  const target = resolveTargetId(value);
  const host = getInitializationOptions(options);
  if (!host.allowedTargets.includes(target) || (!host.allowTargetSwitch && target !== host.defaultTarget)) throw new Error(`Host configuration does not allow output for ${target}.`);
  return target;
}
export interface OutputInput {
  target?: TargetId;
  cIntegrationProfile?: CIntegrationProfileId;
  pages: Page[];
  logicGraphs?: LogicGraph[];
  theme?: Theme;
  images?: ImageResource[];
  fonts?: FontResource[];
  options?: Partial<CodeGenOptions>;
  defaultFont?: string;
  defaultFontSize?: number;
  useBuiltinSymbols?: boolean;
  symbolFont?: string;
}
export interface OutputIssue {
  code: string;
  message: string;
  componentId?: string;
  eventId?: string;
  nodeId?: string;
}
export interface SourceMapEntry {
  file: string;
  line: number;
  componentId?: string;
  eventId?: string;
  pageId?: string;
}
export interface OutputManifest {
  schemaVersion: 1;
  target: TargetId;
  cIntegrationProfile?: CIntegrationProfileId;
  api: string;
  status: 'source-contract';
  deployable: false;
  files: { path: string; bytes: number; sha256?: string; owner: 'generated' | 'user' | 'resource' }[];
}
export interface OutputBundle {
  target: TargetId;
  files: Record<string, string | Uint8Array>;
  issues: OutputIssue[];
  deployable: false;
  manifest: OutputManifest;
  sourceMap: SourceMapEntry[];
}
export class OutputValidationError extends Error {
  readonly issues: OutputIssue[];
  constructor(issues: OutputIssue[]) {
    super(issues.map(i => i.message).join('\n'));
    this.issues = issues;
    this.name = 'OutputValidationError';
  }
}

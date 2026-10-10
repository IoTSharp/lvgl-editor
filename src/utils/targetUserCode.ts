import type { TargetId } from '../output';

export type TargetCode = Partial<Record<TargetId, string>>;

/** A legacy untagged string is always C. Other languages never inherit it. */
export function readTargetCode(target: TargetId, codeByTarget?: TargetCode, legacyCode?: string): string {
  return codeByTarget?.[target] ?? (target === 'c-lvgl' ? legacyCode ?? '' : '');
}

export function writeTargetCode(target: TargetId, code: string, codeByTarget?: TargetCode, legacyCode?: string): TargetCode {
  const preserved = { ...codeByTarget };
  if (preserved['c-lvgl'] === undefined && legacyCode !== undefined) preserved['c-lvgl'] = legacyCode;
  return { ...preserved, [target]: code };
}

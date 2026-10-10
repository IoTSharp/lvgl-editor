import { useSyncExternalStore } from 'react';
import { ru } from './ru';
import { legacyToEnglish } from './messages';

export type Lang = 'en' | 'zh' | 'ru';
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
  { id: 'ru', label: 'Русский' },
];
const STORAGE_KEY = 'lvgl-editor-lang';
const listeners = new Set<() => void>();
const englishToChinese = Object.fromEntries(Object.entries(legacyToEnglish).map(([zh, en]) => [en, zh]));
let current: Lang = 'en';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'zh' || saved === 'ru') current = saved;
} catch { /* Storage may be unavailable; the default is English. */ }
if (typeof document !== 'undefined') document.documentElement.lang = current === 'zh' ? 'zh-CN' : current;

export function getLang(): Lang { return current; }
export function setLang(lang: Lang): void {
  if (!LANGS.some(item => item.id === lang)) throw new Error(`Unknown language: ${lang}`);
  if (lang === current) return;
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* Keep the session choice. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useLang(): Lang { return useSyncExternalStore(subscribe, getLang, () => 'en'); }

/** Translate UI labels only. Project names, resource data and user code remain untouched. */
export function t(key: string | undefined, ...args: Array<string | number>): string {
  key ??= '';
  const parts = key.match(/^([^\p{L}\p{N}/(]*)(.*?)([:：]?)$/u);
  const prefix = parts?.[1] ?? '';
  const core = parts?.[2] ?? key;
  const suffix = parts?.[3] ?? '';
  const english = legacyToEnglish[key] ?? legacyToEnglish[core] ?? key;
  const decorated = legacyToEnglish[key] === undefined &&
    (legacyToEnglish[core] !== undefined || ((prefix || suffix) && (ru[core] !== undefined || englishToChinese[core] !== undefined)));
  const base = decorated ? legacyToEnglish[core] ?? core : english;
  const translated = current === 'ru' ? (ru[base] ?? base)
    : current === 'zh' ? (englishToChinese[base] ?? (decorated ? core : key)) : base;
  let text = decorated ? prefix + translated + (suffix === '：' ? ':' : suffix) : translated;
  if (args.length) text = text.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] === undefined ? match : String(args[Number(index)]));
  return text;
}

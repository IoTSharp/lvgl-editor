// Small helpers for writing LispBM source

import type { LispGenOptions } from './types';

/** Quote a JS string as a LispBM string literal. */
export function lstr(s: string): string {
  return '"' + String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t') + '"';
}

/** `#rrggbb` (or `#rgb`) -> `0xRRGGBB`; invalid input -> black. */
export function lcolor(color: string | undefined): string {
  if (!color) return '0x000000';
  let hex = color.replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) hex = hex.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6,8}$/.test(hex)) return '0x000000';
  return '0x' + hex.slice(0, 6).toUpperCase();
}

/** 0..1 opacity -> 0..255 */
export function lopa(opacity: number): number {
  return Math.round(opacity * 255);
}

function words(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(w => w.toLowerCase());
}

/** A valid, lower-case LispBM symbol body (without prefix) in the requested style. */
export function symbolBody(name: string, options: Pick<LispGenOptions, 'namingStyle'>): string {
  const sep = options.namingStyle === 'snake_case' ? '_' : '-';
  let body = words(name).join(sep);
  if (!body) body = 'unnamed';
  if (/^[0-9]/.test(body)) body = 'n' + sep + body;
  return body;
}

/** Join symbol parts with the style separator, e.g. `sym(opts, 'ui', 'btn', 1)` -> `ui-btn-1`. */
export function sym(options: Pick<LispGenOptions, 'namingStyle'>, ...parts: Array<string | number>): string {
  const sep = options.namingStyle === 'snake_case' ? '_' : '-';
  return parts.map(p => (typeof p === 'number' ? String(p) : symbolBody(p, options))).join(sep);
}

export function indent(options: Pick<LispGenOptions, 'indentSize'>, level = 1): string {
  return ' '.repeat(options.indentSize * level);
}

export function comment(text: string): string {
  return ';; ' + text;
}

export function banner(title: string): string[] {
  const bar = ';; ' + '='.repeat(60);
  return [bar, `;; ${title}`, bar];
}

export function userCode(name: string, options: Pick<LispGenOptions, 'userCodeMarkers'>, ind = ''): string[] {
  if (!options.userCodeMarkers) return [];
  return [`${ind};; USER CODE BEGIN ${name}`, `${ind};; USER CODE END ${name}`];
}

/** Indent every non-empty line by `n` spaces. */
export function shift(lines: string[], n: number): string[] {
  const pad = ' '.repeat(n);
  return lines.map(l => (l.length ? pad + l : l));
}

/** LVGL built-in symbols (FontAwesome) -> UTF-8 text, for header buttons and the like. */
const LV_SYMBOLS: Record<string, number> = {
  AUDIO: 0xF001, VIDEO: 0xF008, LIST: 0xF00B, OK: 0xF00C, CLOSE: 0xF00D, POWER: 0xF011,
  SETTINGS: 0xF013, HOME: 0xF015, DOWNLOAD: 0xF019, DRIVE: 0xF01C, REFRESH: 0xF021,
  MUTE: 0xF026, VOLUME_MID: 0xF027, VOLUME_MAX: 0xF028, IMAGE: 0xF03E, TINT: 0xF043,
  PREV: 0xF048, PLAY: 0xF04B, PAUSE: 0xF04C, STOP: 0xF04D, NEXT: 0xF051, EJECT: 0xF052,
  LEFT: 0xF053, RIGHT: 0xF054, PLUS: 0xF067, MINUS: 0xF068, EYE_OPEN: 0xF06E,
  EYE_CLOSE: 0xF070, WARNING: 0xF071, SHUFFLE: 0xF074, UP: 0xF077, DOWN: 0xF078,
  LOOP: 0xF079, DIRECTORY: 0xF07B, UPLOAD: 0xF093, CALL: 0xF095, CUT: 0xF0C4,
  COPY: 0xF0C5, SAVE: 0xF0C7, BARS: 0xF0C9, ENVELOPE: 0xF0E0, CHARGE: 0xF0E7,
  PASTE: 0xF0EA, BELL: 0xF0F3, KEYBOARD: 0xF11C, GPS: 0xF124, FILE: 0xF158,
  WIFI: 0xF1EB, BLUETOOTH: 0xF293, TRASH: 0xF2ED, EDIT: 0xF304, BACKSPACE: 0xF55A,
  SD_CARD: 0xF7C2,
};

/** `LV_SYMBOL_OK` -> the glyph character; anything else is returned unchanged. */
export function symbolText(icon: string): string {
  const m = /^LV_SYMBOL_([A-Z_]+)$/.exec(icon.trim());
  if (m && LV_SYMBOLS[m[1]] !== undefined) return String.fromCodePoint(LV_SYMBOLS[m[1]]);
  return icon;
}

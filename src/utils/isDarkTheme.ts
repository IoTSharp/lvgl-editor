import type { Theme } from '../types';

/** LVGL's default theme has a light and a dark variant; pick by the theme's background brightness. */
export function isDarkTheme(theme: Theme): boolean {
  const hex = theme.colors.background.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

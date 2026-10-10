export const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

export const DIR: Record<string, string> = { top: 'LV_DIR_TOP', bottom: 'LV_DIR_BOTTOM', left: 'LV_DIR_LEFT', right: 'LV_DIR_RIGHT' };

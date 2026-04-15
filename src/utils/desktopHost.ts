export function isDesktopHostAvailable() {
  return typeof window !== 'undefined' && typeof window.omni !== 'undefined';
}

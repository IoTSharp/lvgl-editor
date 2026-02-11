import type { Page, CanvasState, LvglComponent } from '../../types';

interface WasmUIJson {
  screen: {
    width: number;
    height: number;
    bgColor: string;
  };
  components: WasmComponent[];
}

interface WasmComponent {
  type: string;
  id: string;
  parent: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  widthMode?: string;
  heightMode?: string;
  align?: string;
  alignOffsetX?: number;
  alignOffsetY?: number;
  flags?: Record<string, boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  styles: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pressed?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    focused?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disabled?: Record<string, any>;
  };
}

function flattenTree(
  components: LvglComponent[],
  parentId: string | null,
): WasmComponent[] {
  const result: WasmComponent[] = [];

  for (const comp of components) {
    const wc: WasmComponent = {
      type: comp.type,
      id: comp.id,
      parent: parentId,
      x: comp.x,
      y: comp.y,
      width: comp.width,
      height: comp.height,
      props: { ...comp.props },
      styles: {
        default: { ...comp.styles.default },
      },
    };

    if (comp.widthMode) wc.widthMode = comp.widthMode;
    if (comp.heightMode) wc.heightMode = comp.heightMode;
    if (comp.align && comp.align !== 'default') {
      wc.align = comp.align;
      if (comp.alignOffsetX) wc.alignOffsetX = comp.alignOffsetX;
      if (comp.alignOffsetY) wc.alignOffsetY = comp.alignOffsetY;
    }
    if (comp.flags) {
      const flags: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(comp.flags)) {
        if (v !== undefined) flags[k] = v;
      }
      if (Object.keys(flags).length > 0) wc.flags = flags;
    }

    if (comp.styles.pressed) wc.styles.pressed = { ...comp.styles.pressed };
    if (comp.styles.focused) wc.styles.focused = { ...comp.styles.focused };
    if (comp.styles.disabled) wc.styles.disabled = { ...comp.styles.disabled };

    result.push(wc);

    if (comp.children.length > 0) {
      result.push(...flattenTree(comp.children, comp.id));
    }
  }

  return result;
}

export function editorStateToJson(
  pages: Page[],
  currentPageId: string,
  canvas: CanvasState,
): string {
  const page = pages.find((p) => p.id === currentPageId);

  const json: WasmUIJson = {
    screen: {
      width: canvas.width,
      height: canvas.height,
      bgColor: page?.backgroundColor || '#ffffff',
    },
    components: page ? flattenTree(page.components, null) : [],
  };

  return JSON.stringify(json);
}

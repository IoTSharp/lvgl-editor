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
  parentComp?: LvglComponent,
): WasmComponent[] {
  const result: WasmComponent[] = [];

  // Build child-to-tab/tile mapping for container parents
  let childToVirtualParent: Record<string, string> = {};
  if (parentComp?.type === 'tabview' && parentComp.props?.tabs) {
    const tabChildMap: Record<string, string[]> = parentComp.props.tabChildMap || {};
    const defaultTab = String(parentComp.props.activeTab || 0);
    for (const [tabIndex, childIds] of Object.entries(tabChildMap)) {
      if (Array.isArray(childIds)) {
        for (const childId of childIds) {
          childToVirtualParent[childId] = `${parentComp.id}__tab__${tabIndex}`;
        }
      }
    }
    // Default: unmapped children go to activeTab
    for (const comp of components) {
      if (!childToVirtualParent[comp.id]) {
        childToVirtualParent[comp.id] = `${parentComp.id}__tab__${defaultTab}`;
      }
    }
  } else if (parentComp?.type === 'tileview' && parentComp.props?.rows !== undefined) {
    const tileChildMap: Record<string, string[]> = parentComp.props.tileChildMap || {};
    const defaultTile = `${parentComp.props.currentRow || 0}-${parentComp.props.currentCol || 0}`;
    for (const [tileKey, childIds] of Object.entries(tileChildMap)) {
      if (Array.isArray(childIds)) {
        for (const childId of childIds) {
          childToVirtualParent[childId] = `${parentComp.id}__tile__${tileKey}`;
        }
      }
    }
    for (const comp of components) {
      if (!childToVirtualParent[comp.id]) {
        childToVirtualParent[comp.id] = `${parentComp.id}__tile__${defaultTile}`;
      }
    }
  } else if (parentComp?.type === 'win') {
    for (const comp of components) {
      childToVirtualParent[comp.id] = `${parentComp.id}__win_content`;
    }
  }

  for (const comp of components) {
    const effectiveParent = childToVirtualParent[comp.id] || parentId;

    const wc: WasmComponent = {
      type: comp.type,
      id: comp.id,
      parent: effectiveParent,
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
      result.push(...flattenTree(comp.children, comp.id, comp));
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

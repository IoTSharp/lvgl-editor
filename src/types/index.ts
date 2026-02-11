// Theme Types

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export type ThemePreset = 'light' | 'dark' | 'custom';

// Animation Types
export type AnimationType =
  | 'fade_in'
  | 'fade_out'
  | 'slide_left'
  | 'slide_right'
  | 'slide_up'
  | 'slide_down'
  | 'zoom_in'
  | 'zoom_out'
  | 'custom';

export type AnimationEasing =
  | 'linear'
  | 'ease_in'
  | 'ease_out'
  | 'ease_in_out'
  | 'overshoot'
  | 'bounce';

export interface Animation {
  id: string;
  name: string;
  targetComponentId: string;
  type: AnimationType;
  easing: AnimationEasing;
  duration: number;
  delay: number;
  repeat: number;
  property: string;
  startValue: number;
  endValue: number;
}

// LVGL Component Types

export interface StyleProps {
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: string;
  opacity?: number;
  padding?: number;
  // Shadow
  shadowColor?: string;
  shadowWidth?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowSpread?: number;
  shadowOpacity?: number;
  // Transform
  transformAngle?: number;
  transformZoomX?: number;
  transformZoomY?: number;
  transformPivotX?: number;
  transformPivotY?: number;
  // Scrollbar
  scrollbarMode?: 'off' | 'on' | 'active' | 'auto';
  scrollbarWidth?: number;
  scrollbarColor?: string;
  // Text / Font
  textFont?: string;
  textFontSize?: number;
  textLetterSpace?: number;
  textLineSpace?: number;
  // Four-direction padding
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  // Four-corner border radius
  borderRadiusTopLeft?: number;
  borderRadiusTopRight?: number;
  borderRadiusBottomLeft?: number;
  borderRadiusBottomRight?: number;
  // Border side
  borderSide?: 'full' | 'top' | 'bottom' | 'left' | 'right' | 'top_bottom' | 'left_right' | 'none';
  // Background gradient
  bgGradColor?: string;
  bgGradDir?: 'none' | 'hor' | 'ver';
  bgGradStop?: number; // 0-255
  // Outline
  outlineColor?: string;
  outlineWidth?: number;
  outlinePad?: number;
  // Text decoration
  textDecor?: 'none' | 'underline' | 'strikethrough';
  // Blend mode
  blendMode?: 'normal' | 'additive' | 'subtractive' | 'multiply';
}

// LVGL Event Types
export type LvglEventType = 
  | 'LV_EVENT_CLICKED'
  | 'LV_EVENT_PRESSED'
  | 'LV_EVENT_RELEASED'
  | 'LV_EVENT_LONG_PRESSED'
  | 'LV_EVENT_VALUE_CHANGED'
  | 'LV_EVENT_FOCUSED'
  | 'LV_EVENT_DEFOCUSED'
  | 'LV_EVENT_READY'
  | 'LV_EVENT_CANCEL';

// Built-in Action Types
export type BuiltinActionType = 
  | 'navigate'
  | 'setProperty'
  | 'show'
  | 'hide'
  | 'enable'
  | 'disable'
  | 'setText'
  | 'setValue';

// Built-in Action Configuration
export interface BuiltinAction {
  type: BuiltinActionType;
  targetPage?: string;      // For navigate
  targetComponent?: string; // For setProperty, show, hide, enable, disable, setText, setValue
  property?: string;        // For setProperty
  value?: string | number | boolean;  // For setProperty, setText, setValue
}

// Event Binding (Phase 3 - Enhanced)
export interface EventBinding {
  id: string;
  eventType: LvglEventType;
  handlerType: 'builtin' | 'custom';
  // For builtin actions
  action?: BuiltinAction;
  // For custom C code
  customCode?: string;
}

// Page Definition (Phase 3 - Multi-page support)
export interface Page {
  id: string;
  name: string;
  components: LvglComponent[];
  backgroundColor?: string;
}

export type LvglAlign = 'default' | 'center' | 'top_left' | 'top_mid' | 'top_right' | 'bottom_left' | 'bottom_mid' | 'bottom_right' | 'left_mid' | 'right_mid';

export interface LvglFlags {
  clickable?: boolean;
  checkable?: boolean;
  scrollable?: boolean;
  scrollElastic?: boolean;
  scrollMomentum?: boolean;
  scrollOnFocus?: boolean;
  snappable?: boolean;
  pressLock?: boolean;
  eventBubble?: boolean;
  gesturesBubble?: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

export interface LvglComponent {
  id: string;
  type: string; // 'btn', 'label', etc.
  name: string; // 用户可编辑的名称
  x: number;
  y: number;
  width: number;
  height: number;
  children: LvglComponent[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>; // 组件特有属性
  styles: {
    default: StyleProps;
    pressed?: StyleProps;
    focused?: StyleProps;
    disabled?: StyleProps;
  };
  events: EventBinding[];
  animations: Animation[];
  parentId: string | null;
  // Phase 2: Lock and visibility
  locked: boolean;
  visible: boolean;
  // Size mode
  widthMode?: 'px' | 'percent' | 'content';
  heightMode?: 'px' | 'percent' | 'content';
  // Alignment
  align?: LvglAlign;
  alignOffsetX?: number;
  alignOffsetY?: number;
  // Flags
  flags?: LvglFlags;
}

// Component Category Definition
export interface ComponentCategory {
  id: string;
  name: string;
  icon: string;
  collapsed: boolean;
}

// Component Definition (for palette)
export interface ComponentDefinition {
  type: string;
  name: string;
  icon: string;
  category: string;
  defaultWidth: number;
  defaultHeight: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultProps: Record<string, any>;
  defaultStyles: LvglComponent['styles'];
  isContainer: boolean;
}

// Canvas State
export interface CanvasState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

// Selection State
export interface SelectionState {
  selectedIds: string[];
  hoveredId: string | null;
}

// History State for Undo/Redo
export interface HistoryEntry {
  components?: LvglComponent[]; // Legacy support
  pages?: Page[]; // Multi-page support
  timestamp: number;
}

// Drag State
export interface DragState {
  isDragging: boolean;
  dragType: 'new' | 'move' | 'resize' | null;
  draggedComponentType: string | null;
  draggedComponentId: string | null;
  resizeHandle: ResizeHandle | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export type ResizeHandle = 
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

// Alignment Guide
export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

// Phase 2: Clipboard
export interface ClipboardData {
  components: LvglComponent[];
  type: 'copy' | 'cut';
}

// Phase 2: Style Clipboard
export interface StyleClipboard {
  styles: LvglComponent['styles'];
}

// Phase 2: Box Selection
export interface BoxSelection {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Phase 2: Context Menu
export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  targetId: string | null; // null means canvas context menu
}

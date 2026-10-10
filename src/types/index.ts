// Theme Types

import type { TargetId } from '../output/types';

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
  /** recolors an image with this color (LVGL image_recolor); library icons default to the theme text color */
  imageRecolor?: string;
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
  // Size limits, margins and gaps
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  padRow?: number;
  padColumn?: number;
  // Offsets (translate in px, skew in degrees)
  translateX?: number;
  translateY?: number;
  skewX?: number;
  skewY?: number;
  // Opacity of single parts (0..255) and corner clipping
  bgOpa?: number;
  borderOpa?: number;
  outlineOpa?: number;
  textOpa?: number;
  clipCorner?: boolean;
  // More transforms and effects
  transformWidth?: number;
  transformHeight?: number;
  bgMainStop?: number; // 0-255
  borderPost?: boolean;
  blurRadius?: number;
  // Text outline
  textOutlineWidth?: number;
  textOutlineColor?: string;
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
  | 'LV_EVENT_CANCEL'
  | 'LV_EVENT_PRESSING'
  | 'LV_EVENT_PRESS_LOST'
  | 'LV_EVENT_SHORT_CLICKED'
  | 'LV_EVENT_SINGLE_CLICKED'
  | 'LV_EVENT_DOUBLE_CLICKED'
  | 'LV_EVENT_TRIPLE_CLICKED'
  | 'LV_EVENT_LONG_PRESSED_REPEAT'
  | 'LV_EVENT_GESTURE'
  | 'LV_EVENT_SCROLL_BEGIN'
  | 'LV_EVENT_SCROLL'
  | 'LV_EVENT_SCROLL_END'
  | 'LV_EVENT_KEY'
  | 'LV_EVENT_INSERT'
  | 'LV_EVENT_REFRESH'
  | 'LV_EVENT_STATE_CHANGED'
  | 'LV_EVENT_LEAVE'
  | 'LV_EVENT_HOVER_OVER'
  | 'LV_EVENT_HOVER_LEAVE'
  | 'LV_EVENT_SCREEN_LOAD_START'
  | 'LV_EVENT_SCREEN_LOADED'
  | 'LV_EVENT_SCREEN_UNLOAD_START'
  | 'LV_EVENT_SCREEN_UNLOADED';

// Built-in Action Types
export type BuiltinActionType = 
  | 'navigate'
  | 'setProperty'
  | 'show'
  | 'hide'
  | 'enable'
  | 'disable'
  | 'setText'
  | 'setValue'
  | 'setState'
  | 'setFlag';

// Built-in Action Configuration
export interface BuiltinAction {
  type: BuiltinActionType;
  targetPage?: string;      // For navigate
  animation?: string;       // For navigate: screen-load animation (none, fade, move_left, ...)
  duration?: number;        // For navigate: animation time in ms
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
  /** Handwritten code is preserved per target and is never translated. */
  customCodeByTarget?: Partial<Record<TargetId, string>>;
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
  clickFocusable?: boolean;
  scrollOne?: boolean;
  scrollChainHor?: boolean;
  scrollChainVer?: boolean;
  scrollWithArrow?: boolean;
  eventTrickle?: boolean;
  stateTrickle?: boolean;
  advHittest?: boolean;
  floating?: boolean;
  ignoreLayout?: boolean;
  overflowVisible?: boolean;
  flexInNewTrack?: boolean;
}

/** Keeps a component property in sync with a logic variable (checked every 50 ms on the board) */
export interface ComponentBinding {
  id: string;
  kind: 'text' | 'value' | 'hidden' | 'disabled' | 'checked';
  variable: string;       // name of a logic variable
  format?: string;        // text: printf format, e.g. "%.1f km/h" (empty = the value as it is)
  op?: '' | '==' | '!=' | '>' | '<' | '>=' | '<='; // flag kinds: comparison (empty = value is non-zero)
  compare?: number;
}

export interface LvglComponent {
  id: string;
  type: string; // 'btn', 'label', etc.
  name: string; // user-editable name
  x: number;
  y: number;
  width: number;
  height: number;
  children: LvglComponent[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>; // component-specific props
  styles: {
    default: StyleProps;
    pressed?: StyleProps;
    focused?: StyleProps;
    disabled?: StyleProps;
    checked?: StyleProps;
    hovered?: StyleProps;
    edited?: StyleProps;
    scrolled?: StyleProps;
    // "<part>" / "<part>:<state>" keys, e.g. knob, knob:pressed (see utils/styleKeys)
    [partKey: string]: StyleProps | undefined;
  };
  events: EventBinding[];
  bindings?: ComponentBinding[];
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

// Resource Management Types

export type ImageFormat = 'RGB565' | 'RGB888' | 'ARGB8888';

export interface ImageResource {
  id: string;
  name: string;
  originalName: string;
  width: number;
  height: number;
  format: ImageFormat;
  data: string; // Base64 encoded original image
  cArrayName: string;
  size: number; // File size in bytes
  createdAt: number;
}

export interface FontResource {
  id: string;
  name: string;
  family: string;
  sizes: number[];
  charset: CharsetType;
  customChars?: string; // For custom charset
  data: string; // Base64 encoded TTF/OTF
  cFontName: string;
  size: number; // File size in bytes
  createdAt: number;
}

export type CharsetType = 'ascii' | 'latin' | 'cjk-basic' | 'custom';

export interface CharsetPreset {
  id: CharsetType;
  name: string;
  description: string;
  ranges: [number, number][]; // Unicode ranges
}

export const CHARSET_PRESETS: CharsetPreset[] = [
  {
    id: 'ascii',
    name: 'ASCII',
    description: 'Basic ASCII characters (32-126)',
    ranges: [[32, 126]],
  },
  {
    id: 'latin',
    name: 'Latin Extended',
    description: 'ASCII + Latin Extended (32-591)',
    ranges: [[32, 126], [160, 591]],
  },
  {
    id: 'cjk-basic',
    name: 'CJK Basic',
    description: 'ASCII + Common CJK characters',
    ranges: [[32, 126], [0x4E00, 0x9FFF]],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Custom character set',
    ranges: [],
  },
];

export interface IconResource {
  id: string;
  name: string;
  category: string;
  svgData: string;
  width: number;
  height: number;
}

export interface ResourceStore {
  images: ImageResource[];
  fonts: FontResource[];
  icons: IconResource[];
}

// Project file format
export interface ProjectFile {
  version: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  canvasSize: {
    width: number;
    height: number;
  };
  pages: ProjectPage[];
  resources: {
    images: ImageResource[];
    fonts: FontResource[];
  };
  variables: ProjectVariable[];
  codeGenOptions: CodeGenOptions;
}

export interface ProjectPage {
  id: string;
  name: string;
  components: any[]; // LvglComponent[]
}

export interface ProjectVariable {
  id: string;
  name: string;
  type: 'int' | 'string' | 'bool' | 'float';
  defaultValue: string;
}

export interface CodeGenOptions {
  outputFormat: 'single-file' | 'multi-file';
  includeComments: boolean;
  useStaticAllocation: boolean;
  prefix: string;
  indentSize: number;
  indentStyle: 'spaces' | 'tabs';
}

// Image conversion options
export interface ImageConversionOptions {
  format: ImageFormat;
  dither: boolean;
  compress: boolean;
  swapBytes: boolean; // For RGB565 byte order
}

// Font conversion options
export interface FontConversionOptions {
  sizes: number[];
  charset: CharsetType;
  customChars?: string;
  bpp: 1 | 2 | 4 | 8; // Bits per pixel for anti-aliasing
  compress: boolean;
}

// Built-in icons (Material Icons subset)
export interface BuiltInIcon {
  name: string;
  category: string;
  path: string; // SVG path data
}

export const ICON_CATEGORIES = [
  'action',
  'navigation',
  'content',
  'communication',
  'device',
  'file',
  'hardware',
  'social',
  'toggle',
] as const;

export type IconCategory = typeof ICON_CATEGORIES[number];

// Types for the LispBM code generator (VESC Express + LVGL bridge)

export interface LispGenOptions {
  /** Symbol style for generated names. LispBM reads symbols case-insensitively, so camelCase is not offered. */
  namingStyle: 'kebab-case' | 'snake_case';
  indentSize: number;
  generateComments: boolean;
  userCodeMarkers: boolean;
}

export const DEFAULT_LISP_OPTIONS: LispGenOptions = {
  namingStyle: 'kebab-case',
  indentSize: 2,
  generateComments: true,
  userCodeMarkers: true,
};

/** Files of the generated project: `main.lisp` next to a `ui/` folder. */
export interface GeneratedLisp {
  'main.lisp': string;
  'ui/ui.lisp': string;
  'ui/ui_events.lisp': string;
  'ui/ui_logic.lisp': string;
}

export type LispFileName = keyof GeneratedLisp;

export const LISP_FILE_NAMES: LispFileName[] = [
  'main.lisp',
  'ui/ui.lisp',
  'ui/ui_events.lisp',
  'ui/ui_logic.lisp',
];

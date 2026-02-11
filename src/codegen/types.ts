// Code Generation Types

export interface CodeGenOptions {
  lvglVersion: '8' | '9';
  namingStyle: 'snake_case' | 'camelCase';
  indentStyle: 'spaces' | 'tabs';
  indentSize: number;
  generateComments: boolean;
  userCodeMarkers: boolean;
}

export interface GeneratedCode {
  'ui.h': string;
  'ui.c': string;
  'ui_events.h': string;
  'ui_events.c': string;
  'ui_logic.h': string;
  'ui_logic.c': string;
}

export const DEFAULT_CODEGEN_OPTIONS: CodeGenOptions = {
  lvglVersion: '9',
  namingStyle: 'snake_case',
  indentStyle: 'spaces',
  indentSize: 4,
  generateComments: true,
  userCodeMarkers: true,
};

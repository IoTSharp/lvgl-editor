// C code formatter utilities

import type { CodeGenOptions } from '../types';

/**
 * Get indentation string based on options
 */
export function getIndent(options: CodeGenOptions, level: number = 1): string {
  const char = options.indentStyle === 'tabs' ? '\t' : ' '.repeat(options.indentSize);
  return char.repeat(level);
}

/**
 * Format a block of code with proper indentation
 */
export function formatBlock(code: string, options: CodeGenOptions, baseLevel: number = 0): string {
  const lines = code.split('\n');
  const indent = getIndent(options, baseLevel);
  return lines.map(line => line.trim() ? indent + line : '').join('\n');
}

/**
 * Generate a C comment
 */
export function generateComment(text: string, options: CodeGenOptions, multiline: boolean = false): string {
  if (!options.generateComments) return '';
  
  if (multiline) {
    const lines = text.split('\n');
    return [
      '/*',
      ...lines.map(line => ` * ${line}`),
      ' */',
    ].join('\n');
  }
  
  return `// ${text}`;
}

/**
 * Generate a section header comment
 */
export function generateSectionHeader(title: string, options: CodeGenOptions): string {
  if (!options.generateComments) return '';
  
  const line = '-'.repeat(60);
  return [
    `/* ${line} */`,
    `/* ${title.padEnd(58)} */`,
    `/* ${line} */`,
  ].join('\n');
}

/**
 * Generate user code markers
 */
export function generateUserCodeMarker(name: string, options: CodeGenOptions, isStart: boolean): string {
  if (!options.userCodeMarkers) return '';
  
  const marker = isStart ? 'USER_CODE_START' : 'USER_CODE_END';
  return `/* ${marker}: ${name} */`;
}

/**
 * Generate user code section
 */
export function generateUserCodeSection(name: string, options: CodeGenOptions, defaultContent: string = ''): string {
  if (!options.userCodeMarkers) return defaultContent;
  
  return [
    generateUserCodeMarker(name, options, true),
    defaultContent,
    generateUserCodeMarker(name, options, false),
  ].filter(Boolean).join('\n');
}

/**
 * Format C function definition
 */
export function formatFunction(
  returnType: string,
  name: string,
  params: string[],
  body: string,
  options: CodeGenOptions,
  isStatic: boolean = false
): string {
  const staticPrefix = isStatic ? 'static ' : '';
  const paramStr = params.length > 0 ? params.join(', ') : 'void';
  const indent = getIndent(options);
  
  // Indent body lines
  const bodyLines = body.split('\n').map(line => {
    if (line.trim()) {
      return indent + line.trim();
    }
    return '';
  }).join('\n');
  
  return `${staticPrefix}${returnType} ${name}(${paramStr}) {\n${bodyLines}\n}`;
}

/**
 * Format extern declaration
 */
export function formatExtern(type: string, name: string): string {
  return `extern ${type} *${name};`;
}

/**
 * Format variable definition
 */
export function formatVarDef(type: string, name: string, isStatic: boolean = false): string {
  const staticPrefix = isStatic ? 'static ' : '';
  return `${staticPrefix}${type} *${name};`;
}

/**
 * Format function declaration
 */
export function formatFuncDecl(returnType: string, name: string, params: string[]): string {
  const paramStr = params.length > 0 ? params.join(', ') : 'void';
  return `${returnType} ${name}(${paramStr});`;
}

/**
 * Wrap code in include guard
 */
export function wrapInIncludeGuard(code: string, guardName: string): string {
  return [
    `#ifndef ${guardName}`,
    `#define ${guardName}`,
    '',
    code,
    '',
    `#endif /* ${guardName} */`,
  ].join('\n');
}

/**
 * Generate include statement
 */
export function generateInclude(header: string, isSystem: boolean = false): string {
  return isSystem ? `#include <${header}>` : `#include "${header}"`;
}

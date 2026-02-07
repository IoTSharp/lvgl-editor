// ui_logic.h template generator
// Generates header file for logic orchestration functions

import type { CodeGenOptions } from '../types';
import type { LogicGraph } from '../../components/LogicEditor/types';
import {
  wrapInIncludeGuard,
  generateInclude,
  generateSectionHeader,
} from '../formatters/cFormatter';

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/__+/g, '_')
    .replace(/^_/, '');
}

/**
 * Generate ui_logic.h header file
 */
export function generateLogicHeader(
  options: CodeGenOptions,
  graphs: LogicGraph[] = []
): string {
  const lines: string[] = [];
  
  // Includes
  lines.push(generateInclude('lvgl.h'));
  lines.push(generateInclude('stdbool.h', true));
  lines.push(generateInclude('stdint.h', true));
  lines.push('');
  
  if (options.generateComments) {
    lines.push(generateSectionHeader('Logic Function Declarations', options));
    lines.push('');
  }
  
  if (graphs.length > 0) {
    // Generate function declarations for each graph
    for (const graph of graphs) {
      const functionName = toSnakeCase(`logic_${graph.name}`);
      
      if (options.generateComments && graph.description) {
        lines.push(`// ${graph.description}`);
      }
      lines.push(`void ${functionName}(void);`);
    }
    lines.push('');
    
    // Generate init function declaration
    if (options.generateComments) {
      lines.push('// Initialize all logic graphs');
    }
    lines.push('void ui_logic_init(void);');
  } else {
    if (options.generateComments) {
      lines.push('// No logic graphs defined');
      lines.push('');
    }
    lines.push('void ui_logic_init(void);');
  }
  
  const content = lines.join('\n');
  return wrapInIncludeGuard(content, 'UI_LOGIC_H');
}

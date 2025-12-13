/**
 * Type conversion utilities between token types and Figma types
 */

import type { TokenType } from '../../types/index.js';

/**
 * Map token type to Figma variable type
 */
export function mapTokenTypeToFigmaType(tokenType: string): VariableResolvedDataType {
  const typeMap: Record<string, VariableResolvedDataType> = {
    'color': 'COLOR',
    'dimension': 'FLOAT',
    'spacing': 'FLOAT',
    'fontFamily': 'STRING',
    'fontWeight': 'STRING',
    'fontSize': 'FLOAT',
    'duration': 'STRING',
    'string': 'STRING',
    'number': 'FLOAT',
    'boolean': 'BOOLEAN',
    'shadow': 'STRING',
    'gradient': 'STRING'
  };

  return typeMap[tokenType] || 'STRING';
}

/**
 * Map Figma variable type to token type
 */
export function mapFigmaTypeToTokenType(figmaType: VariableResolvedDataType): TokenType {
  const typeMap: Record<VariableResolvedDataType, TokenType> = {
    'COLOR': 'color',
    'FLOAT': 'number',
    'STRING': 'string',
    'BOOLEAN': 'boolean'
  };
  return typeMap[figmaType] || 'string';
}

/**
 * Get default value for a given Figma type
 */
export function getDefaultValueForType(type: VariableResolvedDataType): any {
  switch (type) {
    case 'COLOR':
      return { r: 0, g: 0, b: 0 }; // Black
    case 'FLOAT':
      return 0;
    case 'STRING':
      return '';
    case 'BOOLEAN':
      return false;
    default:
      return null;
  }
}

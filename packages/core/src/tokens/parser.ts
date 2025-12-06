/**
 * Token Parser
 *
 * Functions for parsing and manipulating token identifiers.
 */

import type { TokenEntry, LegacyTokenEntry } from '../types/index.js';

/**
 * Parse prefixed variable ID: "collection:mode:VariableID:X:Y"
 *
 * Returns the collection, mode, and raw Variable ID components.
 */
export function parseVariableId(prefixedId: string): {
  collection: string;
  mode: string;
  varId: string;
} {
  const parts = prefixedId.split(':');
  if (parts.length >= 4) {
    return {
      collection: parts[0],
      mode: parts[1],
      varId: parts.slice(2).join(':'),
    };
  }
  return { collection: '', mode: '', varId: prefixedId };
}

/**
 * Extract raw Variable ID from prefixed format
 *
 * Returns just the "VariableID:X:Y" part.
 */
export function extractVariableId(prefixedId: string): string {
  const match = prefixedId.match(/VariableID:[^:]+:[^:]+$/);
  return match ? match[0] : '';
}

/**
 * Convert dot-separated path to array
 */
export function pathToArray(dotPath: string): string[] {
  return dotPath.split('.');
}

/**
 * Convert path array to dot-separated string
 */
export function arrayToPath(pathArray: string[]): string {
  return pathArray.join('.');
}

/**
 * Check if an object is a W3C DTCG token (has $type, $value, $variableId)
 */
export function isToken(obj: any): obj is TokenEntry {
  return obj && typeof obj === 'object' && '$type' in obj && '$value' in obj && '$variableId' in obj;
}

/**
 * Check if an object is a legacy token (has type, value)
 */
export function isLegacyToken(obj: any): obj is LegacyTokenEntry {
  return obj && typeof obj === 'object' && 'type' in obj && 'value' in obj;
}

/**
 * Recursively count tokens in a nested structure
 * Works with both W3C DTCG format ($type) and legacy format (type)
 */
export function countTokens(obj: any): number {
  if (isToken(obj) || isLegacyToken(obj)) {
    return 1;
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).reduce((sum: number, value) => sum + countTokens(value), 0);
  }

  return 0;
}

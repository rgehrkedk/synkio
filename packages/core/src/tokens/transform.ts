/**
 * Token Transform
 *
 * Functions for transforming token paths to platform-specific names.
 */

import type { Adapter, TokenEntry, TransformOptions } from '../types/index.js';
import { isToken } from './parser.js';

/**
 * Transform case of a string
 */
export function transformCase(str: string, caseType: string): string {
  switch (caseType) {
    case 'kebab':
      return str.toLowerCase();
    case 'camel':
      return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    case 'pascal':
      return str.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
    case 'snake':
      return str.replace(/-/g, '_').toLowerCase();
    case 'constant':
      return str.replace(/-/g, '_').toUpperCase();
    default:
      return str;
  }
}

/**
 * Convert token path to platform-specific token name
 *
 * Applies adapter configuration: strips segments, joins with separator, transforms case.
 */
export function pathToTokenName(pathArray: string[], adapter: Adapter): string {
  // Strip configured segments
  const filteredPath = pathArray.filter(
    segment => !adapter.transform.stripSegments.includes(segment)
  );

  // Join with separator
  let tokenName = filteredPath.join(adapter.transform.separator);

  // Transform case
  tokenName = transformCase(tokenName, adapter.transform.case);

  return tokenName;
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determine which JSON file a token belongs to based on collection and path
 */
export function getJsonFile(collection: string, pathArray: string[]): string {
  if (collection === 'primitives') {
    const category = pathArray[2];
    return `tokens/primitives/${category}.json`;
  }
  if (collection === 'themes') {
    const mode = pathArray[1];
    return `tokens/themes/${mode}.json`;
  }
  if (collection === 'brands') {
    const brand = pathArray[1];
    return `tokens/brands/${brand}.json`;
  }
  return `tokens/${collection}.json`;
}

/**
 * Get the path within the JSON file (strips collection/mode prefix)
 */
export function getJsonPath(collection: string, pathArray: string[]): string[] {
  if (collection === 'primitives') {
    return pathArray.slice(2);
  }
  if (collection === 'themes') {
    return pathArray.slice(2);
  }
  if (collection === 'brands') {
    return pathArray.slice(2);
  }
  return pathArray.slice(1);
}

/**
 * Transform a single token based on config options
 * - Can keep or remove $ prefix from type/value
 * - Can override type values
 * - Always preserves $variableId for round-trip Figma tracking
 */
export function transformToken(token: TokenEntry, options?: TransformOptions): any {
  const useDollar = options?.useDollarPrefix ?? false;
  const typeOverrides = options?.typeOverrides ?? {};

  // Get the type value and apply overrides if configured
  let typeValue = token.$type;
  if (typeValue && typeOverrides[typeValue]) {
    typeValue = typeOverrides[typeValue];
  }

  if (useDollar) {
    // Keep $ prefix (W3C DTCG format)
    return {
      $type: typeValue,
      $value: token.$value,
      $variableId: token.$variableId,
    };
  } else {
    // Remove $ prefix (Style Dictionary legacy format)
    return {
      value: token.$value,
      type: typeValue,
      $variableId: token.$variableId,
    };
  }
}

/**
 * Recursively transform nested tokens
 */
export function transformNestedTokens(obj: any, options?: TransformOptions): any {
  if (isToken(obj)) {
    return transformToken(obj, options);
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = transformNestedTokens(value, options);
    }
    return result;
  }

  return obj;
}

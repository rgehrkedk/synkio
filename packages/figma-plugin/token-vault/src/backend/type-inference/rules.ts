/**
 * Type inference rule engine
 */

import type { TokenType } from '../../types/index.js';
import { TYPE_PATTERNS } from './patterns.js';

/**
 * Infer token type from path using pattern matching
 * @param path - Token path (e.g., 'colors/primary', 'spacing/small')
 * @returns Inferred token type
 */
export function inferTypeFromPath(path: string): TokenType {
  const lowerPath = path.toLowerCase();
  const segments = lowerPath.split('/');
  const firstSegment = segments[0];

  // Try patterns in priority order
  for (const pattern of TYPE_PATTERNS) {
    // Check if any keyword matches the first segment
    if (pattern.keywords.includes(firstSegment)) {
      // Apply refinement if available
      if (pattern.refine) {
        return pattern.refine(lowerPath);
      }
      return pattern.type;
    }

    // Check if any keyword appears anywhere in path
    for (const keyword of pattern.keywords) {
      if (lowerPath.includes(keyword)) {
        // Apply refinement if available
        if (pattern.refine) {
          return pattern.refine(lowerPath);
        }
        return pattern.type;
      }
    }
  }

  // Default to string for unknown types
  return 'string';
}

/**
 * Infer type from value structure
 * @param value - Token value
 * @returns Inferred token type or null if cannot determine
 */
export function inferTypeFromValue(value: unknown): TokenType | null {
  if (typeof value === 'string') {
    // Check for color patterns
    if (value.startsWith('#') || value.startsWith('rgb')) {
      return 'color';
    }
    // Check for number with units
    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(value)) {
      return 'dimension';
    }
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  return null;
}

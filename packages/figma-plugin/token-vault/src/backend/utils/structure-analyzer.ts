/**
 * Structure Analyzer Utility
 *
 * Analyzes JSON structure and extracts levels with keys.
 * NO auto-detection of roles - just extracts structural information.
 */

import type { LevelConfiguration } from '../../types/level-config.types.js';

/**
 * Result of analyzing JSON structure
 */
export interface AnalyzedStructure {
  /**
   * Array of detected levels in the JSON hierarchy
   */
  levels: AnalyzedLevel[];

  /**
   * Maximum depth found in the structure
   */
  maxDepth: number;

  /**
   * Whether the structure contains token values
   */
  hasTokenValues: boolean;
}

/**
 * Information about a single level in the hierarchy
 */
export interface AnalyzedLevel {
  /**
   * Level depth (1-based index)
   */
  depth: number;

  /**
   * All unique keys found at this level
   */
  keys: string[];

  /**
   * Sample values from this level (up to 3)
   */
  sampleValues: SampleValue[];

  /**
   * Total number of unique keys at this level
   */
  keyCount: number;
}

/**
 * Sample value with context
 */
export interface SampleValue {
  /**
   * Path to this value (dot-separated)
   */
  path: string;

  /**
   * The value itself (primitive or object preview)
   */
  value: unknown;

  /**
   * Type of value
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

/**
 * Analyze JSON structure and extract levels.
 *
 * This function traverses the JSON structure and extracts information about
 * each level of nesting, including:
 * - Keys found at each level
 * - Sample values
 * - Total depth
 *
 * It does NOT attempt to detect roles (Collection/Mode/Token Path).
 * That is the responsibility of the UI component in Task Group 3.
 *
 * @param data - Parsed JSON data to analyze
 * @returns Analyzed structure with level information
 *
 * @example
 * ```ts
 * const structure = analyzeJsonStructure({
 *   theme: {
 *     light: {
 *       colors: {
 *         primary: "#FF0000"
 *       }
 *     }
 *   }
 * });
 * // Returns 4 levels: [theme], [light], [colors], [primary]
 * ```
 */
export function analyzeJsonStructure(data: unknown): AnalyzedStructure {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON data: expected object');
  }

  const levelMap = new Map<number, Set<string>>();
  const sampleMap = new Map<number, SampleValue[]>();
  let maxDepth = 0;
  let hasTokenValues = false;

  /**
   * Recursively traverse structure
   */
  function traverse(obj: any, depth: number, path: string[] = []): void {
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    // Initialize level sets if not exists
    if (!levelMap.has(depth)) {
      levelMap.set(depth, new Set());
      sampleMap.set(depth, []);
    }

    const keys = levelMap.get(depth)!;
    const samples = sampleMap.get(depth)!;

    // Process each key at this level
    for (const [key, value] of Object.entries(obj)) {
      keys.add(key);
      const currentPath = [...path, key];

      // Add sample if we have less than 3
      if (samples.length < 3) {
        samples.push({
          path: currentPath.join('.'),
          value: getValuePreview(value),
          type: getValueType(value),
        });
      }

      // Check if this is a token value
      if (isTokenValue(value)) {
        hasTokenValues = true;
      }

      // Recurse if object (but not if it's a token object with $value)
      if (typeof value === 'object' && value !== null && !isTokenValue(value)) {
        traverse(value, depth + 1, currentPath);
      }
    }
  }

  // Start traversal
  traverse(data, 1);

  // Convert to sorted array of levels
  const levels: AnalyzedLevel[] = [];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const keys = Array.from(levelMap.get(depth) || []).sort();
    const samples = sampleMap.get(depth) || [];

    levels.push({
      depth,
      keys,
      sampleValues: samples,
      keyCount: keys.length,
    });
  }

  return {
    levels,
    maxDepth,
    hasTokenValues,
  };
}

/**
 * Check if value is a Design Tokens format token value
 */
function isTokenValue(value: any): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return '$value' in value || '$type' in value;
}

/**
 * Get type of value
 */
function getValueType(value: unknown): SampleValue['type'] {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'object';
  const type = typeof value;
  if (type === 'object') return 'object';
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  return 'object';
}

/**
 * Get preview of value for display
 */
function getValuePreview(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (typeof value === 'object') {
    // Check for token value
    if ('$value' in value) {
      return (value as any).$value;
    }
    // Return object preview
    const keys = Object.keys(value);
    return `{${keys.length} keys}`;
  }

  // Primitive values
  return value;
}

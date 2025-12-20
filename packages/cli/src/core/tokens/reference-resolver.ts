/**
 * Reference Resolver
 *
 * Handles resolution of Figma variable references ($ref) to DTCG path references.
 */

import type { RawTokens } from '../tokens.js';

/**
 * Builds a lookup map from VariableID to path for resolving references.
 *
 * @param rawTokens - The raw token data from Figma
 * @returns Map from variableId to token path
 *
 * @example
 * const tokens = {
 *   'var1': { variableId: 'VariableID:1:31', path: 'colors.primary', ... },
 *   'var2': { variableId: 'VariableID:1:32', path: 'colors.secondary', ... },
 * };
 * const lookup = buildVariableIdLookup(tokens);
 * // Map { 'VariableID:1:31' => 'colors.primary', 'VariableID:1:32' => 'colors.secondary' }
 */
export function buildVariableIdLookup(rawTokens: RawTokens): Map<string, string> {
  const variableIdToPath = new Map<string, string>();

  for (const entry of Object.values(rawTokens)) {
    if (entry.variableId && entry.path) {
      variableIdToPath.set(entry.variableId, entry.path);
    }
  }

  return variableIdToPath;
}

/**
 * Value object that may contain a $ref property
 */
export interface RefValue {
  $ref?: string;
  [key: string]: unknown;
}

/**
 * Resolves a token value, converting $ref variable references to DTCG path references.
 *
 * If the value contains a $ref property pointing to a variable ID, this function
 * looks up the referenced variable's path and returns it in DTCG format: `{path}`.
 *
 * @param value - The token value (may contain $ref)
 * @param variableIdToPath - Lookup map from variable ID to path
 * @param entryPath - The path of the current token (for warning messages)
 * @returns The resolved value (DTCG reference string or original value)
 *
 * @example
 * // Reference resolution
 * const lookup = new Map([['VariableID:1:31', 'colors.primary']]);
 * resolveReference({ $ref: 'VariableID:1:31' }, lookup, 'bg.primary')
 * // Returns: '{colors.primary}'
 *
 * // Non-reference value
 * resolveReference('#ff0000', lookup, 'colors.accent')
 * // Returns: '#ff0000'
 */
export function resolveReference(
  value: unknown,
  variableIdToPath: Map<string, string>,
  entryPath: string
): unknown {
  // Check if value is an object with $ref property
  if (value && typeof value === 'object' && '$ref' in value) {
    const refValue = value as RefValue;
    const refVariableId = refValue.$ref;

    if (refVariableId) {
      const refPath = variableIdToPath.get(refVariableId);

      if (refPath) {
        // DTCG format: wrap path in curly braces
        return `{${refPath}}`;
      }

      // Fallback: warn and keep original reference if path not found
      console.warn(`Warning: Could not resolve reference ${refVariableId} for token ${entryPath}`);
      return value;
    }
  }

  // Not a reference, return as-is
  return value;
}

/**
 * Checks if a value is a reference (has $ref property).
 *
 * @param value - The value to check
 * @returns True if the value contains a $ref property
 */
export function isReference(value: unknown): value is RefValue {
  return value !== null && typeof value === 'object' && '$ref' in value;
}

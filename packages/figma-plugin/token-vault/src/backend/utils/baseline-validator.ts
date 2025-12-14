/**
 * Baseline validation utilities
 *
 * Validates baseline data for broken alias references and circular references
 * before import or sync operations. Broken aliases cause corruption in Figma
 * and must block operations.
 */

export interface BrokenAlias {
  tokenPath: string;       // e.g., "colors.button-bg"
  tokenKey: string;        // e.g., "key2"
  aliasReference: string;  // e.g., "{colors.primary}"
  referencePath: string;   // e.g., "colors.primary"
  error: string;
}

export interface CircularReference {
  path: string[];          // e.g., ["A", "B", "C", "A"]
  error: string;
}

export interface ValidationResult {
  valid: boolean;
  brokenAliases: BrokenAlias[];
  circularReferences: CircularReference[];
  errorCount: number;
  warnings: string[];
}

/**
 * Validate baseline for broken alias references and circular refs
 *
 * Performs comprehensive validation of baseline data:
 * - Checks that all alias references point to existing tokens
 * - Detects circular reference chains
 * - Returns detailed error information for debugging
 *
 * @param baseline - Baseline object with $metadata and baseline properties
 * @returns Validation result with errors and warnings
 */
export function validateBaseline(baseline: any): ValidationResult {
  const brokenAliases: BrokenAlias[] = [];
  const circularReferences: CircularReference[] = [];
  const warnings: string[] = [];

  // Validate baseline format
  if (!baseline || typeof baseline !== 'object') {
    return {
      valid: false,
      brokenAliases: [],
      circularReferences: [],
      errorCount: 1,
      warnings: ['Invalid baseline format: expected object']
    };
  }

  if (!baseline.baseline) {
    return {
      valid: false,
      brokenAliases: [],
      circularReferences: [],
      errorCount: 1,
      warnings: ['Invalid baseline format: missing baseline property']
    };
  }

  const tokens = baseline.baseline;

  // Validate baseline is an object
  if (typeof tokens !== 'object' || Array.isArray(tokens)) {
    return {
      valid: false,
      brokenAliases: [],
      circularReferences: [],
      errorCount: 1,
      warnings: ['Invalid baseline format: baseline must be an object']
    };
  }

  // Build path index for quick lookups
  const pathToKey = buildPathIndex(tokens);

  // Check each token for broken aliases
  for (const [key, token] of Object.entries(tokens)) {
    if (!token || typeof token !== 'object') {
      continue; // Skip invalid entries
    }

    const t = token as any;

    if (isAlias(t.value)) {
      const referencePath = extractReferencePath(t.value);

      if (!pathToKey.has(referencePath)) {
        brokenAliases.push({
          tokenPath: t.path || key,
          tokenKey: key,
          aliasReference: t.value,
          referencePath,
          error: `Referenced token "${referencePath}" does not exist`
        });
      }
    }
  }

  // Check for circular references
  const circular = detectCircularReferences(tokens, pathToKey);
  circularReferences.push(...circular);

  const errorCount = brokenAliases.length + circularReferences.length;

  return {
    valid: errorCount === 0,
    brokenAliases,
    circularReferences,
    errorCount,
    warnings
  };
}

/**
 * Build index: path → key for fast lookups
 *
 * Creates a Map for O(1) lookup when validating alias references.
 *
 * @param tokens - Token object from baseline
 * @returns Map of token path to token key
 */
function buildPathIndex(tokens: any): Map<string, string> {
  const index = new Map<string, string>();

  for (const [key, token] of Object.entries(tokens)) {
    if (!token || typeof token !== 'object') {
      continue;
    }

    const t = token as any;
    if (t.path) {
      index.set(t.path, key);
    }
  }

  return index;
}

/**
 * Check if value is an alias reference
 *
 * Alias references are strings wrapped in curly braces: "{path.to.token}"
 *
 * @param value - Token value to check
 * @returns True if value is an alias reference
 */
function isAlias(value: any): boolean {
  return typeof value === 'string' &&
    value.startsWith('{') &&
    value.endsWith('}') &&
    value.length > 2;
}

/**
 * Extract path from alias reference
 *
 * Removes the curly braces from the alias reference.
 *
 * @param aliasValue - Alias reference (e.g., "{colors.primary}")
 * @returns Extracted path (e.g., "colors.primary")
 */
function extractReferencePath(aliasValue: string): string {
  return aliasValue.slice(1, -1);
}

/**
 * Detect circular reference chains
 *
 * Uses depth-first search with cycle detection to find circular references.
 * Tracks visited nodes and current stack to detect when we revisit a node
 * in the current path.
 *
 * @param tokens - Token object from baseline
 * @param pathToKey - Path index for lookups
 * @returns Array of circular references found
 */
function detectCircularReferences(
  tokens: any,
  pathToKey: Map<string, string>
): CircularReference[] {
  const circular: CircularReference[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function visit(path: string, stack: string[]): boolean {
    // Found a cycle - the path is already in our current recursion stack
    if (recursionStack.has(path)) {
      const cycleStart = stack.indexOf(path);
      const cycle = [...stack.slice(cycleStart), path];
      circular.push({
        path: cycle,
        error: `Circular reference detected: ${cycle.join(' → ')}`
      });
      return true;
    }

    // Already processed this path completely
    if (visited.has(path)) {
      return false;
    }

    // Mark as being processed
    visited.add(path);
    recursionStack.add(path);
    stack.push(path);

    // Check if this token has an alias
    const key = pathToKey.get(path);
    if (key) {
      const token = tokens[key];
      if (token && isAlias(token.value)) {
        const refPath = extractReferencePath(token.value);
        visit(refPath, [...stack]);
      }
    }

    // Done processing this path
    recursionStack.delete(path);

    return false;
  }

  // Check all tokens as potential cycle starting points
  for (const [key, token] of Object.entries(tokens)) {
    if (!token || typeof token !== 'object') {
      continue;
    }

    const t = token as any;
    if (t.path) {
      visit(t.path, []);
    }
  }

  return circular;
}

/**
 * Quick validation - just check if any errors exist
 *
 * Lightweight check for use cases where detailed error info is not needed.
 *
 * @param baseline - Baseline object to validate
 * @returns True if validation errors exist
 */
export function hasValidationErrors(baseline: any): boolean {
  const result = validateBaseline(baseline);
  return !result.valid;
}

/**
 * Get broken aliases only (for quick check)
 *
 * Returns only broken alias information, skipping circular reference detection.
 * Useful for scenarios where you only care about missing token references.
 *
 * @param baseline - Baseline object to validate
 * @returns Array of broken alias errors
 */
export function getBrokenAliases(baseline: any): BrokenAlias[] {
  const result = validateBaseline(baseline);
  return result.brokenAliases;
}

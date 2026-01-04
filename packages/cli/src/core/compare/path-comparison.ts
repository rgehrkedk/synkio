/**
 * Path-Based Comparison Module
 *
 * Provides path-based comparison for bootstrap scenarios where the baseline
 * has no Figma IDs. This is used during the first pull after `init-baseline`.
 */

import type { BaselineData, BaselineEntry } from '../../types/index.js';

/**
 * Result of path-based comparison between code and Figma baselines
 */
export interface PathComparisonResult {
  /** Tokens that exist in both with matching paths */
  matched: PathMatch[];
  /** Tokens only in code baseline (not in Figma) */
  onlyInCode: BaselineEntry[];
  /** Tokens only in Figma (not in code baseline) */
  onlyInFigma: BaselineEntry[];
  /** Tokens with same path but different values */
  valueChanges: PathValueChange[];
}

/**
 * A matched token pair from path-based comparison
 */
export interface PathMatch {
  path: string;
  collection: string;
  mode: string;
  codeEntry: BaselineEntry;
  figmaEntry: BaselineEntry;
}

/**
 * A value change detected during path-based comparison
 */
export interface PathValueChange {
  path: string;
  collection: string;
  mode: string;
  codeValue: unknown;
  figmaValue: unknown;
}

/**
 * Compare two baselines by path (for bootstrap when code baseline has no IDs)
 *
 * This comparison matches tokens by their path + collection + mode, since
 * the code baseline from `init-baseline` has no Figma variable IDs.
 *
 * @param codeBaseline - Baseline from init-baseline (no IDs)
 * @param figmaBaseline - Baseline from Figma pull (has IDs)
 * @returns Comparison result showing matched, only-in-code, only-in-figma, and value changes
 */
export function compareBaselinesByPath(
  codeBaseline: BaselineData,
  figmaBaseline: BaselineData
): PathComparisonResult {
  const result: PathComparisonResult = {
    matched: [],
    onlyInCode: [],
    onlyInFigma: [],
    valueChanges: [],
  };

  // Build lookup from code baseline: key is "path:collection.mode"
  const codeLookup = new Map<string, BaselineEntry>();
  for (const entry of Object.values(codeBaseline.baseline)) {
    const key = `${entry.path}:${entry.collection}.${entry.mode}`;
    codeLookup.set(key, entry);
  }

  // Compare Figma entries against code
  for (const figmaEntry of Object.values(figmaBaseline.baseline)) {
    const key = `${figmaEntry.path}:${figmaEntry.collection}.${figmaEntry.mode}`;
    const codeEntry = codeLookup.get(key);

    if (codeEntry) {
      // Found in both - check for value changes
      result.matched.push({
        path: figmaEntry.path,
        collection: figmaEntry.collection,
        mode: figmaEntry.mode,
        codeEntry,
        figmaEntry,
      });

      if (!valuesEqual(codeEntry.value, figmaEntry.value)) {
        result.valueChanges.push({
          path: figmaEntry.path,
          collection: figmaEntry.collection,
          mode: figmaEntry.mode,
          codeValue: codeEntry.value,
          figmaValue: figmaEntry.value,
        });
      }

      // Remove from lookup to track what's left
      codeLookup.delete(key);
    } else {
      // Only in Figma
      result.onlyInFigma.push(figmaEntry);
    }
  }

  // Remaining in code lookup = only in code
  result.onlyInCode = Array.from(codeLookup.values());

  return result;
}

/**
 * Check if two values are equal (deep comparison via JSON)
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Check if a baseline has any variableIds
 *
 * Used to detect if this is a bootstrap scenario (init-baseline created
 * a baseline without IDs) vs a normal sync (baseline has IDs from Figma).
 *
 * @param baseline - Baseline to check
 * @returns true if any entry has a variableId
 */
export function baselineHasIds(baseline: BaselineData): boolean {
  const entries = Object.values(baseline.baseline);
  if (entries.length === 0) return false;
  return entries.some(entry => entry.variableId != null);
}

/**
 * Check if comparison result has any changes
 */
export function hasPathChanges(result: PathComparisonResult): boolean {
  return (
    result.onlyInCode.length > 0 ||
    result.onlyInFigma.length > 0 ||
    result.valueChanges.length > 0
  );
}

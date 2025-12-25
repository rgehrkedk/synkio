/**
 * Comparison logic for plugin UI.
 *
 * Two explicit comparison modes:
 * 1. ID-based (compareSinceSyncBaseline): Figma → Code workflow
 *    - Uses variableId for matching
 *    - Detects renames via ID matching
 *    - Baseline source: Sync button (saveBaselineSnapshot)
 *
 * 2. Path-based (compareWithCodeBaseline): Code → Figma workflow
 *    - Uses path for matching
 *    - No rename detection (code lacks Figma IDs)
 *    - Baseline source: Remote fetch or file import
 */

import type { SyncData, TokenEntry, StyleEntry } from './types';

/**
 * Detects phantom Figma modes (internal IDs like "21598:4")
 * These occur when modes are deleted or names aren't properly resolved
 */
function isPhantomMode(mode: string): boolean {
  return /^\d+:\d+$/.test(mode);
}

export interface SimpleDiff {
  id: string;
  name: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  collection: string;
  mode: string;
  oldName?: string;
  oldValue?: any;
  newValue?: any;
}

export interface SimpleCompareResult {
  diffs: SimpleDiff[];
  counts: {
    added: number;
    modified: number;
    deleted: number;
    total: number;
  };
}

/**
 * Build ID-based comparison key for sync baseline workflow.
 * Uses variableId for matching (Figma → Code).
 *
 * Format: variableId:collection.mode
 * Example: "VariableID:123:456:globals.light"
 */
function buildIdBasedKey(token: TokenEntry): string {
  const collectionMode = `${token.collection}.${token.mode}`;
  return `${token.variableId}:${collectionMode}`;
}

/**
 * Build path-based comparison key for code baseline workflow.
 * Uses path for matching (Code → Figma).
 *
 * Format: path:collection.mode
 * Example: "colors.primary.500:globals.light"
 */
function buildPathBasedKey(token: TokenEntry): string {
  const collectionMode = `${token.collection}.${token.mode}`;
  return `${token.path}:${collectionMode}`;
}

/**
 * Detect if we should use path-based comparison.
 * Returns true if baseline tokens lack variableId (code-first scenario).
 */
function shouldUsePathBasedComparison(baseline: SyncData): boolean {
  // Check first few tokens - if any lack variableId, use path-based
  const sampleSize = Math.min(baseline.tokens.length, 5);
  for (let i = 0; i < sampleSize; i++) {
    if (!baseline.tokens[i].variableId) {
      return true;
    }
  }
  return false;
}

/**
 * Build a comparison key for a token (backward compatible).
 * Delegates to ID-based or path-based key builder based on mode.
 */
function buildTokenKey(token: TokenEntry, usePathBasedKey: boolean): string {
  if (usePathBasedKey || !token.variableId) {
    return buildPathBasedKey(token);
  }
  return buildIdBasedKey(token);
}

/**
 * Build lookup maps for resolving references between formats.
 *
 * Returns:
 * - pathToId: Map from path to variableId (from current Figma data)
 * - idToPath: Map from variableId to path (from current Figma data)
 *
 * Note: We store path only (not collection.path) because DTCG references
 * like "{colors.blue.300}" don't include collection names.
 */
function buildReferenceLookups(current: SyncData): {
  pathToId: Map<string, string>;
  idToPath: Map<string, string>;
} {
  const pathToId = new Map<string, string>();
  const idToPath = new Map<string, string>();

  for (const token of current.tokens) {
    if (token.variableId) {
      // Store path only (without collection) for DTCG reference matching
      pathToId.set(token.path, token.variableId);
      idToPath.set(token.variableId, token.path);
    }
  }

  return { pathToId, idToPath };
}

/**
 * Normalize a value for comparison.
 *
 * Handles the difference between:
 * - DTCG reference: "{colors.blue.300}" (string, path only)
 * - Figma reference: {"$ref": "VariableID:123:456"} (object)
 *
 * Both are normalized to path-only format: "{colors.blue.300}"
 *
 * Returns a normalized string representation for comparison.
 */
function normalizeValueForComparison(
  value: unknown,
  pathToId: Map<string, string>,
  idToPath: Map<string, string>
): string {
  // Handle Figma's $ref format
  if (typeof value === 'object' && value !== null && '$ref' in value) {
    const refId = (value as { $ref: string }).$ref;
    // Convert to path-based reference for comparison
    const path = idToPath.get(refId);

    if (path) {
      return `{${path}}`;
    }
    return `{ref:${refId}}`;
  }

  // Handle DTCG curly brace reference format
  if (typeof value === 'string') {
    const match = value.match(/^\{(.+)\}$/);
    if (match) {
      // Already a path reference
      return `{${match[1]}}`;
    }
  }

  // For other values, use JSON stringification
  return JSON.stringify(value);
}

/**
 * Compare two values, handling reference format differences.
 */
function valuesEqual(
  currentValue: unknown,
  baselineValue: unknown,
  pathToId: Map<string, string>,
  idToPath: Map<string, string>
): boolean {
  const normalizedCurrent = normalizeValueForComparison(currentValue, pathToId, idToPath);
  const normalizedBaseline = normalizeValueForComparison(baselineValue, pathToId, idToPath);
  return normalizedCurrent === normalizedBaseline;
}

/**
 * Simple compare for plugin UI
 * Shows what has changed since last sync - no rename detection
 */
export function compareSnapshots(current: SyncData, baseline: SyncData): SimpleCompareResult {
  const diffs: SimpleDiff[] = [];

  // Detect comparison mode based on baseline data
  const usePathBasedKey = shouldUsePathBasedComparison(baseline);

  // Build reference lookup maps for normalizing alias values
  const { pathToId, idToPath } = buildReferenceLookups(current);

  // Debug: log lookup map size
  console.log('[compare] usePathBasedKey:', usePathBasedKey);
  console.log('[compare] idToPath size:', idToPath.size);
  console.log('[compare] current tokens:', current.tokens.length);
  console.log('[compare] baseline tokens:', baseline.tokens.length);

  // Debug: sample some lookups
  if (idToPath.size > 0) {
    const firstEntry = idToPath.entries().next().value;
    console.log('[compare] sample idToPath entry:', firstEntry);
  }

  // Debug: log sample current token with $ref value
  const sampleRefToken = current.tokens.find(t =>
    typeof t.value === 'object' && t.value !== null && '$ref' in t.value
  );
  if (sampleRefToken) {
    console.log('[compare] sample current $ref token:', {
      path: sampleRefToken.path,
      collection: sampleRefToken.collection,
      value: sampleRefToken.value
    });
  }

  // Debug: log sample baseline token with {} reference
  const sampleBaselineRef = baseline.tokens.find(t =>
    typeof t.value === 'string' && t.value.startsWith('{')
  );
  if (sampleBaselineRef) {
    console.log('[compare] sample baseline ref token:', {
      path: sampleBaselineRef.path,
      collection: sampleBaselineRef.collection,
      mode: sampleBaselineRef.mode,
      value: sampleBaselineRef.value
    });
    // Show what key would be built for this token
    const baselineKey = buildTokenKey(sampleBaselineRef, usePathBasedKey);
    console.log('[compare] baseline key for sample:', baselineKey);
  }

  // Debug: also find matching current token for colors.focus.default
  if (sampleRefToken) {
    const currentKey = buildTokenKey(sampleRefToken, usePathBasedKey);
    console.log('[compare] current key for sample $ref token:', currentKey);
  }

  // Build baseline map
  const baselineMap = new Map<string, TokenEntry>();
  for (const token of baseline.tokens) {
    const key = buildTokenKey(token, usePathBasedKey);
    baselineMap.set(key, token);
  }

  // Debug: check if the sample keys match
  if (sampleRefToken && sampleBaselineRef) {
    const currentKey = buildTokenKey(sampleRefToken, usePathBasedKey);
    const foundBaseline = baselineMap.get(currentKey);
    console.log('[compare] baseline map lookup for current key:', {
      key: currentKey,
      found: !!foundBaseline,
      foundValue: foundBaseline?.value
    });

    // Test the normalization on these specific values
    if (foundBaseline) {
      const normCurrent = normalizeValueForComparison(sampleRefToken.value, pathToId, idToPath);
      const normBaseline = normalizeValueForComparison(foundBaseline.value, pathToId, idToPath);
      console.log('[compare] normalization test:', {
        currentRaw: sampleRefToken.value,
        baselineRaw: foundBaseline.value,
        normCurrent,
        normBaseline,
        equal: normCurrent === normBaseline
      });
    }
  }

  // Debug: track mismatch samples
  let mismatchLogCount = 0;
  let addedCount = 0;
  let matchedCount = 0;

  // Find modified and added
  for (const token of current.tokens) {
    // Skip tokens with phantom modes (internal Figma IDs like "21598:4")
    if (isPhantomMode(token.mode)) {
      continue;
    }

    const key = buildTokenKey(token, usePathBasedKey);
    const baselineToken = baselineMap.get(key);

    if (!baselineToken) {
      // Debug: log first few "added" tokens that couldn't find baseline
      if (addedCount < 3) {
        console.log('[compare] token marked as added (no baseline found):', {
          key,
          path: token.path,
          collection: token.collection,
          mode: token.mode
        });
      }
      addedCount++;
      diffs.push({
        id: key,
        name: token.path,
        type: 'added',
        collection: token.collection,
        mode: token.mode,
        newValue: token.value,
      });
    } else {
      matchedCount++;
      // Use normalized comparison for values (handles $ref vs {path} format differences)
      const valueChanged = !valuesEqual(token.value, baselineToken.value, pathToId, idToPath);
      const pathChanged = token.path !== baselineToken.path;

      // Debug: log first few value mismatches
      if (valueChanged && mismatchLogCount < 3) {
        const normCurrent = normalizeValueForComparison(token.value, pathToId, idToPath);
        const normBaseline = normalizeValueForComparison(baselineToken.value, pathToId, idToPath);
        console.log('[compare] value mismatch:', {
          path: token.path,
          currentRaw: token.value,
          baselineRaw: baselineToken.value,
          normalizedCurrent: normCurrent,
          normalizedBaseline: normBaseline
        });
        mismatchLogCount++;
      }

      if (pathChanged && valueChanged) {
        // Both path and value changed
        diffs.push({
          id: key,
          name: token.path,
          type: 'renamed',
          collection: token.collection,
          mode: token.mode,
          oldName: baselineToken.path,
          oldValue: baselineToken.value,
          newValue: token.value,
        });
      } else if (pathChanged) {
        // Only path changed (renamed)
        diffs.push({
          id: key,
          name: token.path,
          type: 'renamed',
          collection: token.collection,
          mode: token.mode,
          oldName: baselineToken.path,
        });
      } else if (valueChanged) {
        // Only value changed
        diffs.push({
          id: key,
          name: token.path,
          type: 'modified',
          collection: token.collection,
          mode: token.mode,
          oldValue: baselineToken.value,
          newValue: token.value,
        });
      }
      baselineMap.delete(key);
    }
  }

  // Remaining in baselineMap = deleted
  const deletedCount = baselineMap.size;
  for (const [key, token] of baselineMap) {
    diffs.push({
      id: key,
      name: token.path,
      type: 'deleted',
      collection: token.collection,
      mode: token.mode,
      oldValue: token.value,
    });
  }

  // Debug: summary of token comparison
  console.log('[compare] token comparison summary:', {
    matched: matchedCount,
    added: addedCount,
    deleted: deletedCount,
    totalDiffs: diffs.length
  });

  // Compare styles if present
  if (current.styles || baseline.styles) {
    const currentStyles = current.styles || [];
    const baselineStyles = baseline.styles || [];

    // Build baseline styles map
    const baselineStylesMap = new Map<string, StyleEntry>();
    for (const style of baselineStyles) {
      baselineStylesMap.set(style.styleId, style);
    }

    // Find modified and added styles
    for (const style of currentStyles) {
      const baselineStyle = baselineStylesMap.get(style.styleId);

      if (!baselineStyle) {
        diffs.push({
          id: style.styleId,
          name: style.path,
          type: 'added',
          collection: `${style.type}-styles`,
          mode: 'value',
          newValue: style.value,
        });
      } else {
        const valueChanged = JSON.stringify(style.value) !== JSON.stringify(baselineStyle.value);
        const pathChanged = style.path !== baselineStyle.path;

        if (pathChanged && valueChanged) {
          diffs.push({
            id: style.styleId,
            name: style.path,
            type: 'renamed',
            collection: `${style.type}-styles`,
            mode: 'value',
            oldName: baselineStyle.path,
            oldValue: baselineStyle.value,
            newValue: style.value,
          });
        } else if (pathChanged) {
          diffs.push({
            id: style.styleId,
            name: style.path,
            type: 'renamed',
            collection: `${style.type}-styles`,
            mode: 'value',
            oldName: baselineStyle.path,
          });
        } else if (valueChanged) {
          diffs.push({
            id: style.styleId,
            name: style.path,
            type: 'modified',
            collection: `${style.type}-styles`,
            mode: 'value',
            oldValue: baselineStyle.value,
            newValue: style.value,
          });
        }
        baselineStylesMap.delete(style.styleId);
      }
    }

    // Remaining in baselineStylesMap = deleted styles
    for (const [styleId, style] of baselineStylesMap) {
      diffs.push({
        id: styleId,
        name: style.path,
        type: 'deleted',
        collection: `${style.type}-styles`,
        mode: 'value',
        oldValue: style.value,
      });
    }
  }

  const counts = {
    added: diffs.filter(d => d.type === 'added').length,
    modified: diffs.filter(d => d.type === 'modified').length,
    deleted: diffs.filter(d => d.type === 'deleted').length,
    renamed: diffs.filter(d => d.type === 'renamed').length,
    total: diffs.length,
  };

  return { diffs, counts };
}

/**
 * Compare current Figma state with sync baseline (Figma → Code workflow).
 *
 * Always uses ID-based comparison via variableId.
 * Detects: added, deleted, modified, renamed (via ID matching).
 *
 * @param current - Current Figma variables and styles
 * @param syncBaseline - Last synced state from Sync button
 */
export function compareSinceSyncBaseline(
  current: SyncData,
  syncBaseline: SyncData
): SimpleCompareResult {
  // Force ID-based comparison for sync baseline
  const diffs: SimpleDiff[] = [];
  const { pathToId, idToPath } = buildReferenceLookups(current);

  // Build baseline map using ID-based keys
  const baselineMap = new Map<string, TokenEntry>();
  for (const token of syncBaseline.tokens) {
    const key = buildIdBasedKey(token);
    baselineMap.set(key, token);
  }

  // Find modified and added
  for (const token of current.tokens) {
    if (isPhantomMode(token.mode)) continue;

    const key = buildIdBasedKey(token);
    const baselineToken = baselineMap.get(key);

    if (!baselineToken) {
      diffs.push({
        id: key,
        name: token.path,
        type: 'added',
        collection: token.collection,
        mode: token.mode,
        newValue: token.value,
      });
    } else {
      const valueChanged = !valuesEqual(token.value, baselineToken.value, pathToId, idToPath);
      const pathChanged = token.path !== baselineToken.path;

      if (pathChanged && valueChanged) {
        diffs.push({
          id: key,
          name: token.path,
          type: 'renamed',
          collection: token.collection,
          mode: token.mode,
          oldName: baselineToken.path,
          oldValue: baselineToken.value,
          newValue: token.value,
        });
      } else if (pathChanged) {
        diffs.push({
          id: key,
          name: token.path,
          type: 'renamed',
          collection: token.collection,
          mode: token.mode,
          oldName: baselineToken.path,
        });
      } else if (valueChanged) {
        diffs.push({
          id: key,
          name: token.path,
          type: 'modified',
          collection: token.collection,
          mode: token.mode,
          oldValue: baselineToken.value,
          newValue: token.value,
        });
      }
      baselineMap.delete(key);
    }
  }

  // Remaining = deleted
  for (const [key, token] of baselineMap) {
    diffs.push({
      id: key,
      name: token.path,
      type: 'deleted',
      collection: token.collection,
      mode: token.mode,
      oldValue: token.value,
    });
  }

  // Compare styles (same logic as compareSnapshots)
  if (current.styles || syncBaseline.styles) {
    const currentStyles = current.styles || [];
    const baselineStyles = syncBaseline.styles || [];
    const baselineStylesMap = new Map<string, StyleEntry>();

    for (const style of baselineStyles) {
      baselineStylesMap.set(style.styleId, style);
    }

    for (const style of currentStyles) {
      const baselineStyle = baselineStylesMap.get(style.styleId);

      if (!baselineStyle) {
        diffs.push({
          id: style.styleId,
          name: style.path,
          type: 'added',
          collection: `${style.type}-styles`,
          mode: 'value',
          newValue: style.value,
        });
      } else {
        const valueChanged = JSON.stringify(style.value) !== JSON.stringify(baselineStyle.value);
        const pathChanged = style.path !== baselineStyle.path;

        if (pathChanged && valueChanged) {
          diffs.push({
            id: style.styleId,
            name: style.path,
            type: 'renamed',
            collection: `${style.type}-styles`,
            mode: 'value',
            oldName: baselineStyle.path,
            oldValue: baselineStyle.value,
            newValue: style.value,
          });
        } else if (pathChanged) {
          diffs.push({
            id: style.styleId,
            name: style.path,
            type: 'renamed',
            collection: `${style.type}-styles`,
            mode: 'value',
            oldName: baselineStyle.path,
          });
        } else if (valueChanged) {
          diffs.push({
            id: style.styleId,
            name: style.path,
            type: 'modified',
            collection: `${style.type}-styles`,
            mode: 'value',
            oldValue: baselineStyle.value,
            newValue: style.value,
          });
        }
        baselineStylesMap.delete(style.styleId);
      }
    }

    for (const [styleId, style] of baselineStylesMap) {
      diffs.push({
        id: styleId,
        name: style.path,
        type: 'deleted',
        collection: `${style.type}-styles`,
        mode: 'value',
        oldValue: style.value,
      });
    }
  }

  const counts = {
    added: diffs.filter(d => d.type === 'added').length,
    modified: diffs.filter(d => d.type === 'modified').length,
    deleted: diffs.filter(d => d.type === 'deleted').length,
    renamed: diffs.filter(d => d.type === 'renamed').length,
    total: diffs.length,
  };

  return { diffs, counts };
}

/**
 * Compare current Figma state with code baseline (Code → Figma workflow).
 *
 * Always uses path-based comparison.
 * Detects: added, deleted, modified (no rename detection - code lacks IDs).
 *
 * @param current - Current Figma variables and styles
 * @param codeBaseline - State from remote fetch or import
 */
export function compareWithCodeBaseline(
  current: SyncData,
  codeBaseline: SyncData
): SimpleCompareResult {
  // Force path-based comparison for code baseline
  const diffs: SimpleDiff[] = [];
  const { pathToId, idToPath } = buildReferenceLookups(current);

  // Build baseline map using path-based keys
  const baselineMap = new Map<string, TokenEntry>();
  for (const token of codeBaseline.tokens) {
    const key = buildPathBasedKey(token);
    baselineMap.set(key, token);
  }

  // Find modified and added
  for (const token of current.tokens) {
    if (isPhantomMode(token.mode)) continue;

    const key = buildPathBasedKey(token);
    const baselineToken = baselineMap.get(key);

    if (!baselineToken) {
      diffs.push({
        id: key,
        name: token.path,
        type: 'added',
        collection: token.collection,
        mode: token.mode,
        newValue: token.value,
      });
    } else {
      const valueChanged = !valuesEqual(token.value, baselineToken.value, pathToId, idToPath);

      if (valueChanged) {
        diffs.push({
          id: key,
          name: token.path,
          type: 'modified',
          collection: token.collection,
          mode: token.mode,
          oldValue: baselineToken.value,
          newValue: token.value,
        });
      }
      baselineMap.delete(key);
    }
  }

  // Remaining = deleted
  for (const [key, token] of baselineMap) {
    diffs.push({
      id: key,
      name: token.path,
      type: 'deleted',
      collection: token.collection,
      mode: token.mode,
      oldValue: token.value,
    });
  }

  // Compare styles (path-based only, no renames)
  if (current.styles || codeBaseline.styles) {
    const currentStyles = current.styles || [];
    const baselineStyles = codeBaseline.styles || [];
    const baselineStylesMap = new Map<string, StyleEntry>();

    // Use path as key for code baseline (no styleId guaranteed)
    for (const style of baselineStyles) {
      baselineStylesMap.set(style.path, style);
    }

    for (const style of currentStyles) {
      const baselineStyle = baselineStylesMap.get(style.path);

      if (!baselineStyle) {
        diffs.push({
          id: style.path,
          name: style.path,
          type: 'added',
          collection: `${style.type}-styles`,
          mode: 'value',
          newValue: style.value,
        });
      } else {
        const valueChanged = JSON.stringify(style.value) !== JSON.stringify(baselineStyle.value);

        if (valueChanged) {
          diffs.push({
            id: style.path,
            name: style.path,
            type: 'modified',
            collection: `${style.type}-styles`,
            mode: 'value',
            oldValue: baselineStyle.value,
            newValue: style.value,
          });
        }
        baselineStylesMap.delete(style.path);
      }
    }

    for (const [path, style] of baselineStylesMap) {
      diffs.push({
        id: path,
        name: style.path,
        type: 'deleted',
        collection: `${style.type}-styles`,
        mode: 'value',
        oldValue: style.value,
      });
    }
  }

  const counts = {
    added: diffs.filter(d => d.type === 'added').length,
    modified: diffs.filter(d => d.type === 'modified').length,
    deleted: diffs.filter(d => d.type === 'deleted').length,
    renamed: 0,  // No rename detection in path-based mode
    total: diffs.length,
  };

  return { diffs, counts };
}

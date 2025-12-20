/**
 * Variable Comparator
 *
 * Handles token-level comparison logic for detecting value changes,
 * path changes, new variables, and deleted variables.
 */

import type {
  BaselineEntry,
  ValueChange,
  PathChange,
  NewVariable,
  DeletedVariable,
} from '../../types/index.js';

import { parseVariableId } from '../tokens.js';

/**
 * Result of token comparison
 */
export interface TokenComparisonResult {
  valueChanges: ValueChange[];
  pathChanges: PathChange[];
  newVariables: NewVariable[];
}

/**
 * Build a lookup map for baseline entries by variableId and mode.
 *
 * @param entries - Baseline entries
 * @returns Map of variableId -> Map of mode -> BaselineEntry
 */
export function buildBaselineByVarId(
  entries: Record<string, BaselineEntry>
): Map<string, Map<string, BaselineEntry>> {
  const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();

  for (const [prefixedId, entry] of Object.entries(entries)) {
    const varId = entry.variableId || parseVariableId(prefixedId).varId;
    const mode = entry.mode || parseVariableId(prefixedId).mode;

    if (!baselineByVarId.has(varId)) {
      baselineByVarId.set(varId, new Map());
    }
    baselineByVarId.get(varId)!.set(mode, entry);
  }

  return baselineByVarId;
}

/**
 * Compare tokens between baseline and fetched entries.
 * Detects value changes, path changes, and new variables.
 *
 * @param baselineByVarId - Lookup map from baseline
 * @param fetchedEntries - Newly fetched entries
 * @param renamedModes - Set of "collection:mode" keys for renamed modes
 * @returns TokenComparisonResult
 */
export function compareTokens(
  baselineByVarId: Map<string, Map<string, BaselineEntry>>,
  fetchedEntries: Record<string, BaselineEntry>,
  renamedModes: Set<string>
): TokenComparisonResult {
  const result: TokenComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    newVariables: [],
  };

  for (const [prefixedId, fetchedEntry] of Object.entries(fetchedEntries)) {
    const varId = fetchedEntry.variableId || parseVariableId(prefixedId).varId;
    const mode = fetchedEntry.mode || parseVariableId(prefixedId).mode;

    // Check if this variable ID exists in baseline
    if (!baselineByVarId.has(varId)) {
      // Completely new variable
      result.newVariables.push({
        variableId: prefixedId,
        path: fetchedEntry.path,
        value: fetchedEntry.value,
        type: fetchedEntry.type,
        collection: fetchedEntry.collection,
        mode: fetchedEntry.mode,
      });
      continue;
    }

    const baselineModes = baselineByVarId.get(varId)!;

    // Check if this specific mode existed in baseline
    if (!baselineModes.has(mode)) {
      // Mode doesn't exist for this variable - could be new mode or renamed mode
      // This is handled by the mode detection logic above
      continue;
    }

    const baselineEntry = baselineModes.get(mode)!;

    // Compare path
    const pathChanged = baselineEntry.path !== fetchedEntry.path;
    if (pathChanged) {
      result.pathChanges.push({
        variableId: prefixedId,
        oldPath: baselineEntry.path,
        newPath: fetchedEntry.path,
        value: fetchedEntry.value,
        type: fetchedEntry.type,
      });
    }

    // Compare value (check even if path changed - both can happen simultaneously)
    if (JSON.stringify(baselineEntry.value) !== JSON.stringify(fetchedEntry.value)) {
      result.valueChanges.push({
        variableId: prefixedId,
        path: fetchedEntry.path,
        oldValue: baselineEntry.value,
        newValue: fetchedEntry.value,
        type: fetchedEntry.type,
      });
    }
  }

  return result;
}

/**
 * Detect deleted variables (in baseline but not in fetched).
 * Excludes variables that belong to deleted or renamed modes.
 *
 * @param baselineEntries - Previous baseline entries
 * @param fetchedEntries - Newly fetched entries
 * @param deletedModeSet - Set of "collection:mode" keys for deleted modes
 * @param renamedModes - Set of "collection:mode" keys for renamed modes
 * @returns Array of deleted variables
 */
export function detectDeletedVariables(
  baselineEntries: Record<string, BaselineEntry>,
  fetchedEntries: Record<string, BaselineEntry>,
  deletedModeSet: Set<string>,
  renamedModes: Set<string>
): DeletedVariable[] {
  const deletedVariables: DeletedVariable[] = [];

  for (const [prefixedId, baselineEntry] of Object.entries(baselineEntries)) {
    if (!fetchedEntries[prefixedId]) {
      // Skip if this variable belongs to a deleted or renamed mode
      const modeKey = `${baselineEntry.collection}:${baselineEntry.mode}`;
      if (deletedModeSet.has(modeKey) || renamedModes.has(modeKey)) {
        continue;
      }

      deletedVariables.push({
        variableId: prefixedId,
        path: baselineEntry.path,
        value: baselineEntry.value,
        type: baselineEntry.type,
        collection: baselineEntry.collection,
        mode: baselineEntry.mode,
      });
    }
  }

  return deletedVariables;
}

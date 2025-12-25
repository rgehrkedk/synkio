// =============================================================================
// Compare - ID-based Diffing Engine
// Matches the CLI's comparison logic for consistency
// =============================================================================

import {
  BaselineData,
  BaselineEntry,
  ComparisonResult,
  ValueChange,
  PathChange,
  NewVariable,
  DeletedVariable,
  ModeRename,
  ModeChange,
  CollectionRename,
} from './types';

// =============================================================================
// Main Comparison Function
// =============================================================================

/**
 * Compare two baselines using ID-based matching
 * This distinguishes renames from deletions
 */
export function compareBaselines(
  oldBaseline: BaselineData,
  newBaseline: BaselineData
): ComparisonResult {
  const result: ComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    collectionRenames: [],
    modeRenames: [],
    newModes: [],
    deletedModes: [],
    newVariables: [],
    deletedVariables: [],
  };

  const oldEntries = Object.values(oldBaseline.baseline);
  const newEntries = Object.values(newBaseline.baseline);

  // Build ID-based lookup maps
  const oldByVariableId = new Map<string, BaselineEntry[]>();
  const newByVariableId = new Map<string, BaselineEntry[]>();

  for (const entry of oldEntries) {
    if (entry.variableId) {
      const existing = oldByVariableId.get(entry.variableId) || [];
      existing.push(entry);
      oldByVariableId.set(entry.variableId, existing);
    }
  }

  for (const entry of newEntries) {
    if (entry.variableId) {
      const existing = newByVariableId.get(entry.variableId) || [];
      existing.push(entry);
      newByVariableId.set(entry.variableId, existing);
    }
  }

  // Track processed IDs
  const processedOldIds = new Set<string>();
  const processedNewIds = new Set<string>();

  // Detect collection and mode renames first
  detectCollectionRenames(oldEntries, newEntries, result);
  detectModeRenames(oldEntries, newEntries, result);

  // Compare by variable ID
  for (const [variableId, oldVarEntries] of oldByVariableId) {
    const newVarEntries = newByVariableId.get(variableId);

    if (!newVarEntries || newVarEntries.length === 0) {
      // Variable deleted
      for (const oldEntry of oldVarEntries) {
        result.deletedVariables.push({
          variableId,
          path: oldEntry.path,
          value: oldEntry.value,
          type: oldEntry.type,
          collection: oldEntry.collection,
          mode: oldEntry.mode,
        });
        processedOldIds.add(`${variableId}:${oldEntry.collection}:${oldEntry.mode}`);
      }
    } else {
      // Variable exists in both - compare by mode
      for (const oldEntry of oldVarEntries) {
        const oldKey = `${variableId}:${oldEntry.collection}:${oldEntry.mode}`;
        processedOldIds.add(oldKey);

        // Find matching mode (considering mode renames)
        const matchingNew = findMatchingEntry(oldEntry, newVarEntries, result.modeRenames);

        if (!matchingNew) {
          // Mode was deleted for this variable
          result.deletedVariables.push({
            variableId,
            path: oldEntry.path,
            value: oldEntry.value,
            type: oldEntry.type,
            collection: oldEntry.collection,
            mode: oldEntry.mode,
          });
        } else {
          const newKey = `${variableId}:${matchingNew.collection}:${matchingNew.mode}`;
          processedNewIds.add(newKey);

          // Check for path change (rename)
          if (oldEntry.path !== matchingNew.path) {
            result.pathChanges.push({
              variableId,
              oldPath: oldEntry.path,
              newPath: matchingNew.path,
              value: matchingNew.value,
              type: matchingNew.type,
              collection: matchingNew.collection,
              mode: matchingNew.mode,
            });
          }
          // Check for value change
          else if (!valuesEqual(oldEntry.value, matchingNew.value)) {
            result.valueChanges.push({
              variableId,
              path: matchingNew.path,
              oldValue: oldEntry.value,
              newValue: matchingNew.value,
              type: matchingNew.type,
              collection: matchingNew.collection,
              mode: matchingNew.mode,
            });
          }
        }
      }

      // Check for new modes for this variable
      for (const newEntry of newVarEntries) {
        const newKey = `${variableId}:${newEntry.collection}:${newEntry.mode}`;
        if (!processedNewIds.has(newKey)) {
          processedNewIds.add(newKey);
          result.newVariables.push({
            variableId,
            path: newEntry.path,
            value: newEntry.value,
            type: newEntry.type,
            collection: newEntry.collection,
            mode: newEntry.mode,
          });
        }
      }
    }
  }

  // Find completely new variables
  for (const [variableId, newVarEntries] of newByVariableId) {
    if (!oldByVariableId.has(variableId)) {
      for (const newEntry of newVarEntries) {
        result.newVariables.push({
          variableId,
          path: newEntry.path,
          value: newEntry.value,
          type: newEntry.type,
          collection: newEntry.collection,
          mode: newEntry.mode,
        });
      }
    }
  }

  return result;
}

// =============================================================================
// Collection and Mode Rename Detection
// =============================================================================

function detectCollectionRenames(
  oldEntries: BaselineEntry[],
  newEntries: BaselineEntry[],
  result: ComparisonResult
): void {
  // Group by collection ID
  const oldCollections = new Map<string, string>(); // collectionId -> name
  const newCollections = new Map<string, string>();

  for (const entry of oldEntries) {
    if (entry.collectionId) {
      oldCollections.set(entry.collectionId, entry.collection);
    }
  }

  for (const entry of newEntries) {
    if (entry.collectionId) {
      newCollections.set(entry.collectionId, entry.collection);
    }
  }

  // Find renames
  for (const [collectionId, oldName] of oldCollections) {
    const newName = newCollections.get(collectionId);
    if (newName && newName !== oldName) {
      result.collectionRenames.push({
        oldCollection: oldName,
        newCollection: newName,
      });
    }
  }
}

function detectModeRenames(
  oldEntries: BaselineEntry[],
  newEntries: BaselineEntry[],
  result: ComparisonResult
): void {
  // Group by collection and mode ID
  const oldModes = new Map<string, { collection: string; mode: string }>(); // modeId -> {collection, mode}
  const newModes = new Map<string, { collection: string; mode: string }>();

  for (const entry of oldEntries) {
    if (entry.modeId) {
      oldModes.set(entry.modeId, { collection: entry.collection, mode: entry.mode });
    }
  }

  for (const entry of newEntries) {
    if (entry.modeId) {
      newModes.set(entry.modeId, { collection: entry.collection, mode: entry.mode });
    }
  }

  // Find renames
  for (const [modeId, old] of oldModes) {
    const newMode = newModes.get(modeId);
    if (newMode && newMode.mode !== old.mode) {
      result.modeRenames.push({
        collection: newMode.collection,
        oldMode: old.mode,
        newMode: newMode.mode,
      });
    }
  }

  // Find new modes
  const oldModeNames = new Set([...oldModes.values()].map(m => `${m.collection}:${m.mode}`));
  for (const [modeId, newMode] of newModes) {
    if (!oldModes.has(modeId)) {
      const modeKey = `${newMode.collection}:${newMode.mode}`;
      if (!oldModeNames.has(modeKey)) {
        result.newModes.push({
          collection: newMode.collection,
          mode: newMode.mode,
        });
      }
    }
  }

  // Find deleted modes
  const newModeNames = new Set([...newModes.values()].map(m => `${m.collection}:${m.mode}`));
  for (const [modeId, oldMode] of oldModes) {
    if (!newModes.has(modeId)) {
      const modeKey = `${oldMode.collection}:${oldMode.mode}`;
      if (!newModeNames.has(modeKey)) {
        result.deletedModes.push({
          collection: oldMode.collection,
          mode: oldMode.mode,
        });
      }
    }
  }
}

// =============================================================================
// Helpers
// =============================================================================

function findMatchingEntry(
  oldEntry: BaselineEntry,
  newEntries: BaselineEntry[],
  modeRenames: ModeRename[]
): BaselineEntry | undefined {
  // Direct match by collection and mode
  let match = newEntries.find(
    e => e.collection === oldEntry.collection && e.mode === oldEntry.mode
  );

  if (match) return match;

  // Check if mode was renamed
  const modeRename = modeRenames.find(
    r => r.collection === oldEntry.collection && r.oldMode === oldEntry.mode
  );

  if (modeRename) {
    match = newEntries.find(
      e => e.collection === oldEntry.collection && e.mode === modeRename.newMode
    );
  }

  return match;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  // Handle references
  if (isReference(a) && isReference(b)) {
    return (a as { $ref: string }).$ref === (b as { $ref: string }).$ref;
  }

  // Handle primitives
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  // Handle null
  if (a === null || b === null) {
    return a === b;
  }

  // Deep equality for objects
  return JSON.stringify(a) === JSON.stringify(b);
}

function isReference(value: unknown): boolean {
  return typeof value === 'object' && value !== null && '$ref' in value;
}

// =============================================================================
// Path-based Comparison (for code baselines without IDs)
// =============================================================================

export function compareByPath(
  oldBaseline: BaselineData,
  newBaseline: BaselineData
): ComparisonResult {
  const result: ComparisonResult = {
    valueChanges: [],
    pathChanges: [], // No rename detection in path-based mode
    collectionRenames: [],
    modeRenames: [],
    newModes: [],
    deletedModes: [],
    newVariables: [],
    deletedVariables: [],
  };

  const oldByPath = new Map<string, BaselineEntry>();
  const newByPath = new Map<string, BaselineEntry>();

  for (const entry of Object.values(oldBaseline.baseline)) {
    const key = `${entry.collection}:${entry.mode}:${entry.path}`;
    oldByPath.set(key, entry);
  }

  for (const entry of Object.values(newBaseline.baseline)) {
    const key = `${entry.collection}:${entry.mode}:${entry.path}`;
    newByPath.set(key, entry);
  }

  // Find changes and deletions
  for (const [key, oldEntry] of oldByPath) {
    const newEntry = newByPath.get(key);

    if (!newEntry) {
      result.deletedVariables.push({
        variableId: oldEntry.variableId || '',
        path: oldEntry.path,
        value: oldEntry.value,
        type: oldEntry.type,
        collection: oldEntry.collection,
        mode: oldEntry.mode,
      });
    } else if (!valuesEqual(oldEntry.value, newEntry.value)) {
      result.valueChanges.push({
        variableId: newEntry.variableId || '',
        path: newEntry.path,
        oldValue: oldEntry.value,
        newValue: newEntry.value,
        type: newEntry.type,
        collection: newEntry.collection,
        mode: newEntry.mode,
      });
    }
  }

  // Find new entries
  for (const [key, newEntry] of newByPath) {
    if (!oldByPath.has(key)) {
      result.newVariables.push({
        variableId: newEntry.variableId || '',
        path: newEntry.path,
        value: newEntry.value,
        type: newEntry.type,
        collection: newEntry.collection,
        mode: newEntry.mode,
      });
    }
  }

  return result;
}

// =============================================================================
// Summary Helpers
// =============================================================================

export function hasChanges(result: ComparisonResult): boolean {
  return (
    result.valueChanges.length > 0 ||
    result.pathChanges.length > 0 ||
    result.newVariables.length > 0 ||
    result.deletedVariables.length > 0 ||
    result.collectionRenames.length > 0 ||
    result.modeRenames.length > 0 ||
    result.newModes.length > 0 ||
    result.deletedModes.length > 0
  );
}

export function hasBreakingChanges(result: ComparisonResult): boolean {
  return (
    result.pathChanges.length > 0 ||
    result.deletedVariables.length > 0 ||
    result.deletedModes.length > 0
  );
}

export function countChanges(result: ComparisonResult): number {
  return (
    result.valueChanges.length +
    result.pathChanges.length +
    result.newVariables.length +
    result.deletedVariables.length
  );
}

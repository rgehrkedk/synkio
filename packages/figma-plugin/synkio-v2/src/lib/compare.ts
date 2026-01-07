// =============================================================================
// Compare - ID-based Diffing Engine
// Matches the CLI's comparison logic for consistency
// =============================================================================

import {
  BaselineData,
  BaselineEntry,
  StyleBaselineEntry,
  ComparisonResult,
  ValueChange,
  PathChange,
  NewVariable,
  DeletedVariable,
  ModeRename,
  ModeChange,
  CollectionRename,
  StyleValueChange,
  StylePathChange,
  NewStyle,
  DeletedStyle,
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
    styleValueChanges: [],
    stylePathChanges: [],
    newStyles: [],
    deletedStyles: [],
  };

  const oldEntries = oldBaseline.baseline ? Object.values(oldBaseline.baseline) : [];
  const newEntries = newBaseline.baseline ? Object.values(newBaseline.baseline) : [];

  // Build ID-based lookup maps
  const oldByVariableId = new Map<string, BaselineEntry[]>();
  const newByVariableId = new Map<string, BaselineEntry[]>();

  // Track entries WITHOUT variableId (code-created tokens)
  const oldWithoutId: BaselineEntry[] = [];
  const newWithoutId: BaselineEntry[] = [];

  for (const entry of oldEntries) {
    if (entry.variableId) {
      const existing = oldByVariableId.get(entry.variableId) || [];
      existing.push(entry);
      oldByVariableId.set(entry.variableId, existing);
    } else {
      oldWithoutId.push(entry);
    }
  }

  for (const entry of newEntries) {
    if (entry.variableId) {
      const existing = newByVariableId.get(entry.variableId) || [];
      existing.push(entry);
      newByVariableId.set(entry.variableId, existing);
    } else {
      newWithoutId.push(entry);
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

  // =============================================================================
  // Path-based comparison for entries WITHOUT variableId (code-created tokens)
  // =============================================================================

  // Build path-based lookup for old entries (to check if path exists in Figma)
  const oldByPath = new Map<string, BaselineEntry[]>();
  for (const entry of oldEntries) {
    const pathKey = `${entry.collection}:${entry.path}:${entry.mode}`;
    const existing = oldByPath.get(pathKey) || [];
    existing.push(entry);
    oldByPath.set(pathKey, existing);
  }

  // Check new entries without variableId - these are code-created tokens
  for (const newEntry of newWithoutId) {
    const pathKey = `${newEntry.collection}:${newEntry.path}:${newEntry.mode}`;
    const oldMatch = oldByPath.get(pathKey);

    if (!oldMatch || oldMatch.length === 0) {
      // No matching path in old baseline - this is a NEW variable from code
      result.newVariables.push({
        variableId: undefined, // Will be assigned when created in Figma
        path: newEntry.path,
        value: newEntry.value,
        type: newEntry.type,
        collection: newEntry.collection,
        mode: newEntry.mode,
      });
    } else {
      // Path exists - check for value changes
      const oldEntry = oldMatch[0];
      if (!valuesEqual(oldEntry.value, newEntry.value)) {
        result.valueChanges.push({
          variableId: oldEntry.variableId, // Use the ID from Figma if available
          path: newEntry.path,
          oldValue: oldEntry.value,
          newValue: newEntry.value,
          type: newEntry.type,
          collection: newEntry.collection,
          mode: newEntry.mode,
        });
      }
    }
  }

  // Check old entries without variableId that don't exist in new baseline
  const newByPath = new Map<string, BaselineEntry[]>();
  for (const entry of newEntries) {
    const pathKey = `${entry.collection}:${entry.path}:${entry.mode}`;
    const existing = newByPath.get(pathKey) || [];
    existing.push(entry);
    newByPath.set(pathKey, existing);
  }

  for (const oldEntry of oldWithoutId) {
    const pathKey = `${oldEntry.collection}:${oldEntry.path}:${oldEntry.mode}`;
    const newMatch = newByPath.get(pathKey);

    if (!newMatch || newMatch.length === 0) {
      // Path no longer exists in new baseline - deleted
      result.deletedVariables.push({
        variableId: undefined,
        path: oldEntry.path,
        value: oldEntry.value,
        type: oldEntry.type,
        collection: oldEntry.collection,
        mode: oldEntry.mode,
      });
    }
  }

  // Compare styles
  compareStyles(oldBaseline.styles, newBaseline.styles, result);

  return result;
}

// =============================================================================
// Style Comparison
// =============================================================================

function compareStyles(
  oldStyles: Record<string, StyleBaselineEntry> | undefined,
  newStyles: Record<string, StyleBaselineEntry> | undefined,
  result: ComparisonResult
): void {
  if (!oldStyles && !newStyles) return;

  const oldStyleEntries = oldStyles ? Object.values(oldStyles) : [];
  const newStyleEntries = newStyles ? Object.values(newStyles) : [];

  // Build ID-based lookup maps
  const oldByStyleId = new Map<string, StyleBaselineEntry>();
  const newByStyleId = new Map<string, StyleBaselineEntry>();

  for (const entry of oldStyleEntries) {
    oldByStyleId.set(entry.styleId, entry);
  }

  for (const entry of newStyleEntries) {
    newByStyleId.set(entry.styleId, entry);
  }

  // Compare by style ID
  for (const [styleId, oldStyle] of oldByStyleId) {
    const newStyle = newByStyleId.get(styleId);

    if (!newStyle) {
      // Style deleted
      result.deletedStyles.push({
        styleId,
        path: oldStyle.path,
        value: oldStyle.value,
        styleType: oldStyle.type,
      });
    } else {
      // Style exists in both - check for changes
      if (oldStyle.path !== newStyle.path) {
        // Path change (rename)
        result.stylePathChanges.push({
          styleId,
          oldPath: oldStyle.path,
          newPath: newStyle.path,
          value: newStyle.value,
          styleType: newStyle.type,
        });
      } else if (!valuesEqual(oldStyle.value, newStyle.value)) {
        // Value change
        result.styleValueChanges.push({
          styleId,
          path: newStyle.path,
          oldValue: oldStyle.value,
          newValue: newStyle.value,
          styleType: newStyle.type,
        });
      }
    }
  }

  // Find new styles
  for (const [styleId, newStyle] of newByStyleId) {
    if (!oldByStyleId.has(styleId)) {
      result.newStyles.push({
        styleId,
        path: newStyle.path,
        value: newStyle.value,
        styleType: newStyle.type,
      });
    }
  }
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
  // Check if entries have modeId - if either side doesn't have modeId,
  // we can't detect renames and should use name-based matching only
  const oldHasModeId = oldEntries.some(e => e.modeId);
  const newHasModeId = newEntries.some(e => e.modeId);

  // Collect unique modes by name from both sides
  const oldModesByName = new Map<string, { collection: string; mode: string; modeId?: string }>();
  const newModesByName = new Map<string, { collection: string; mode: string; modeId?: string }>();

  for (const entry of oldEntries) {
    const key = `${entry.collection}:${entry.mode}`;
    if (!oldModesByName.has(key)) {
      oldModesByName.set(key, { collection: entry.collection, mode: entry.mode, modeId: entry.modeId });
    }
  }

  for (const entry of newEntries) {
    const key = `${entry.collection}:${entry.mode}`;
    if (!newModesByName.has(key)) {
      newModesByName.set(key, { collection: entry.collection, mode: entry.mode, modeId: entry.modeId });
    }
  }

  // If both sides have modeId, we can detect renames by modeId
  if (oldHasModeId && newHasModeId) {
    const oldModesByModeId = new Map<string, { collection: string; mode: string }>();
    const newModesByModeId = new Map<string, { collection: string; mode: string }>();

    for (const entry of oldEntries) {
      if (entry.modeId) {
        oldModesByModeId.set(entry.modeId, { collection: entry.collection, mode: entry.mode });
      }
    }

    for (const entry of newEntries) {
      if (entry.modeId) {
        newModesByModeId.set(entry.modeId, { collection: entry.collection, mode: entry.mode });
      }
    }

    // Find renames by modeId
    for (const [modeId, old] of oldModesByModeId) {
      const newMode = newModesByModeId.get(modeId);
      if (newMode && newMode.mode !== old.mode) {
        result.modeRenames.push({
          collection: newMode.collection,
          oldMode: old.mode,
          newMode: newMode.mode,
        });
      }
    }
  }

  // Find new modes (exist in new but not in old, by name)
  for (const [key, newMode] of newModesByName) {
    if (!oldModesByName.has(key)) {
      // Check if this might be a renamed mode (if we have modeId info)
      const isRenamedMode = result.modeRenames.some(
        r => r.collection === newMode.collection && r.newMode === newMode.mode
      );
      if (!isRenamedMode) {
        result.newModes.push({
          collection: newMode.collection,
          mode: newMode.mode,
        });
      }
    }
  }

  // Find deleted modes (exist in old but not in new, by name)
  for (const [key, oldMode] of oldModesByName) {
    if (!newModesByName.has(key)) {
      // Check if this might be a renamed mode (if we have modeId info)
      const isRenamedMode = result.modeRenames.some(
        r => r.collection === oldMode.collection && r.oldMode === oldMode.mode
      );
      if (!isRenamedMode) {
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
  // If both values are aliases/references, consider them equal
  // Figma uses {$ref: "VariableID:123:456"} format
  // Code uses "{colors.blue.300}" string format
  // We can't compare these directly, but if both are aliases they reference the same variable
  if (isAlias(a) && isAlias(b)) {
    return true;
  }

  // If one is alias and one isn't, they're different
  if (isAlias(a) !== isAlias(b)) {
    return false;
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

/**
 * Check if a value is an alias/reference.
 * - Figma format: {$ref: "VariableID:123:456"}
 * - Code format: "{colors.blue.300}" (string wrapped in curly braces)
 */
function isAlias(value: unknown): boolean {
  // Figma reference object
  if (typeof value === 'object' && value !== null && '$ref' in value) {
    return true;
  }

  // Code alias string (wrapped in curly braces, not JSON)
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}') && !value.startsWith('{"')) {
    return true;
  }

  return false;
}

// =============================================================================
// Summary Helpers
// =============================================================================

export function countChanges(result: ComparisonResult): number {
  return (
    result.valueChanges.length +
    result.pathChanges.length +
    result.newVariables.length +
    result.deletedVariables.length +
    result.styleValueChanges.length +
    result.stylePathChanges.length +
    result.newStyles.length +
    result.deletedStyles.length
  );
}

export function countStyleChanges(result: ComparisonResult): number {
  return (
    result.styleValueChanges.length +
    result.stylePathChanges.length +
    result.newStyles.length +
    result.deletedStyles.length
  );
}

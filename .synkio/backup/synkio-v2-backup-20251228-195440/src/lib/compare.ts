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
    styleValueChanges: [],
    stylePathChanges: [],
    newStyles: [],
    deletedStyles: [],
  };

  const oldByPath = new Map<string, BaselineEntry>();
  const newByPath = new Map<string, BaselineEntry>();

  const oldEntries = oldBaseline.baseline ? Object.values(oldBaseline.baseline) : [];
  const newEntries = newBaseline.baseline ? Object.values(newBaseline.baseline) : [];

  for (const entry of oldEntries) {
    const key = `${entry.collection}:${entry.mode}:${entry.path}`;
    oldByPath.set(key, entry);
  }

  for (const entry of newEntries) {
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

  // Compare styles (using path-based approach)
  compareStylesByPath(oldBaseline.styles, newBaseline.styles, result);

  return result;
}

/**
 * Compare styles by path (for code baselines that may not have style IDs)
 */
function compareStylesByPath(
  oldStyles: Record<string, StyleBaselineEntry> | undefined,
  newStyles: Record<string, StyleBaselineEntry> | undefined,
  result: ComparisonResult
): void {
  if (!oldStyles && !newStyles) return;

  const oldStyleEntries = oldStyles ? Object.values(oldStyles) : [];
  const newStyleEntries = newStyles ? Object.values(newStyles) : [];

  // Build path-based lookup maps
  const oldByPath = new Map<string, StyleBaselineEntry>();
  const newByPath = new Map<string, StyleBaselineEntry>();

  for (const entry of oldStyleEntries) {
    oldByPath.set(entry.path, entry);
  }

  for (const entry of newStyleEntries) {
    newByPath.set(entry.path, entry);
  }

  // Compare by path
  for (const [path, oldStyle] of oldByPath) {
    const newStyle = newByPath.get(path);

    if (!newStyle) {
      // Style deleted
      result.deletedStyles.push({
        styleId: oldStyle.styleId,
        path: oldStyle.path,
        value: oldStyle.value,
        styleType: oldStyle.type,
      });
    } else if (!valuesEqual(oldStyle.value, newStyle.value)) {
      // Value change
      result.styleValueChanges.push({
        styleId: newStyle.styleId || oldStyle.styleId,
        path: newStyle.path,
        oldValue: oldStyle.value,
        newValue: newStyle.value,
        styleType: newStyle.type,
      });
    }
  }

  // Find new styles
  for (const [path, newStyle] of newByPath) {
    if (!oldByPath.has(path)) {
      result.newStyles.push({
        styleId: newStyle.styleId,
        path: newStyle.path,
        value: newStyle.value,
        styleType: newStyle.type,
      });
    }
  }
}

// =============================================================================
// Hybrid Comparison (handles mixed baselines with and without IDs)
// =============================================================================

/**
 * Types that indicate an entry is a style (merged from Figma styles into variables)
 * These correspond to Figma's paint, effect, and text styles
 */
const STYLE_TYPES = new Set(['gradient', 'shadow', 'blur', 'typography']);

/**
 * Common group prefixes that are added when styles are merged into collections
 * During export-baseline, styles may have these prefixes which need to be stripped
 * for comparison with Figma's style paths
 */
const STYLE_GROUP_PREFIXES = ['color.', 'colors.', 'effects.', 'font.', 'fonts.', 'typography.'];

/**
 * Check if a baseline entry is actually a style based on its type
 */
function isStyleEntry(entry: BaselineEntry): boolean {
  return STYLE_TYPES.has(entry.type);
}

/**
 * Strip known style group prefixes from a path
 * Handles double prefixes (e.g., "font.font.Body 1.Light" -> "Body 1.Light")
 * e.g., "color.components.button.bg" -> "components.button.bg"
 * e.g., "effects.effects.blur.xs" -> "effects.blur.xs"
 * e.g., "font.font.Body 1.Light" -> "Body 1.Light"
 */
function stripStyleGroupPrefix(path: string): string {
  let result = path;
  // First pass: strip the outer group prefix (from file name)
  for (const prefix of STYLE_GROUP_PREFIXES) {
    if (result.startsWith(prefix)) {
      result = result.slice(prefix.length);
      break;
    }
  }
  // Second pass: check if there's still a duplicate prefix and remove it
  // This handles cases like "font.font.X" -> "font.X" -> "X" (if font is a duplicate)
  // or "effects.effects.X" -> "effects.X" (keep one effects since that's the Figma path)
  for (const prefix of STYLE_GROUP_PREFIXES) {
    // Only strip if the result would still have meaningful content
    if (result.startsWith(prefix) && result.length > prefix.length) {
      const remainder = result.slice(prefix.length);
      // Don't strip if it would remove meaningful path parts
      // e.g., "effects.blur.xs" should stay as is, not become "blur.xs"
      // But "font.Body 1.Light" should become "Body 1.Light"
      const prefixWithoutDot = prefix.slice(0, -1); // "font" from "font."
      // Only strip if the next part is NOT the same as what Figma expects
      // Figma effect styles start with "effects." so keep it
      // Figma text styles don't have prefix, so strip "font."
      if (prefixWithoutDot === 'font' || prefixWithoutDot === 'fonts' || prefixWithoutDot === 'typography') {
        result = remainder;
      }
      break;
    }
  }
  return result;
}

/**
 * Map code baseline type to Figma style type
 */
function mapToFigmaStyleType(type: string): string {
  switch (type) {
    case 'gradient':
      return 'paint';
    case 'shadow':
    case 'blur':
      return 'effect';
    case 'typography':
      return 'text';
    default:
      return type;
  }
}

/**
 * Compare baselines using a hybrid approach:
 * - For entries with variableId: use ID-based comparison (detects renames)
 * - For entries without variableId: use path-based comparison
 * - Handles styles mixed into baseline (from code) vs separate styles section (from Figma)
 *
 * This handles the "code-first" scenario where some tokens were edited in code
 * and don't have variableIds, while others still have IDs from previous syncs.
 */
export function compareHybrid(
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

  // Separate entries into:
  // 1. Style entries (gradient, shadow, blur, typography) - these need cross-section comparison
  // 2. Variable entries with variableId - use ID-based comparison
  // 3. Variable entries without variableId - use path-based comparison
  const oldStyleEntries: BaselineEntry[] = [];
  const newStyleEntries: BaselineEntry[] = [];
  const oldWithId: BaselineEntry[] = [];
  const oldWithoutId: BaselineEntry[] = [];
  const newWithId: BaselineEntry[] = [];
  const newWithoutId: BaselineEntry[] = [];

  for (const entry of oldEntries) {
    if (isStyleEntry(entry)) {
      oldStyleEntries.push(entry);
    } else if (entry.variableId) {
      oldWithId.push(entry);
    } else {
      oldWithoutId.push(entry);
    }
  }

  for (const entry of newEntries) {
    if (isStyleEntry(entry)) {
      newStyleEntries.push(entry);
    } else if (entry.variableId) {
      newWithId.push(entry);
    } else {
      newWithoutId.push(entry);
    }
  }

  // Build ID-based lookup maps for entries with variableId
  const oldByVariableId = new Map<string, BaselineEntry[]>();
  const newByVariableId = new Map<string, BaselineEntry[]>();

  for (const entry of oldWithId) {
    const existing = oldByVariableId.get(entry.variableId!) || [];
    existing.push(entry);
    oldByVariableId.set(entry.variableId!, existing);
  }

  for (const entry of newWithId) {
    const existing = newByVariableId.get(entry.variableId!) || [];
    existing.push(entry);
    newByVariableId.set(entry.variableId!, existing);
  }

  // Track processed entries
  const processedNewIds = new Set<string>();

  // Detect collection and mode renames first (using entries with IDs)
  detectCollectionRenames(oldWithId, newWithId, result);
  detectModeRenames(oldWithId, newWithId, result);

  // Compare entries WITH variableId (ID-based comparison)
  for (const [variableId, oldVarEntries] of oldByVariableId) {
    const newVarEntries = newByVariableId.get(variableId);

    if (!newVarEntries || newVarEntries.length === 0) {
      // Variable deleted - but check if it might exist in newWithoutId by path
      // (this handles the case where a token was edited in code and lost its ID)
      for (const oldEntry of oldVarEntries) {
        const pathMatch = newWithoutId.find(
          e => e.path === oldEntry.path && e.collection === oldEntry.collection && e.mode === oldEntry.mode
        );

        if (pathMatch) {
          // Found by path - check for value change
          if (!valuesEqual(oldEntry.value, pathMatch.value)) {
            result.valueChanges.push({
              variableId,
              path: pathMatch.path,
              oldValue: oldEntry.value,
              newValue: pathMatch.value,
              type: pathMatch.type,
              collection: pathMatch.collection,
              mode: pathMatch.mode,
            });
          }
          // Mark as processed
          const pathKey = `${pathMatch.collection}:${pathMatch.mode}:${pathMatch.path}`;
          processedNewIds.add(pathKey);
        } else {
          // Truly deleted
          result.deletedVariables.push({
            variableId,
            path: oldEntry.path,
            value: oldEntry.value,
            type: oldEntry.type,
            collection: oldEntry.collection,
            mode: oldEntry.mode,
          });
        }
      }
    } else {
      // Variable exists in both - compare by mode
      for (const oldEntry of oldVarEntries) {
        // Find matching mode (considering mode renames)
        const matchingNew = findMatchingEntry(oldEntry, newVarEntries, result.modeRenames);

        if (!matchingNew) {
          // Mode was deleted for this variable - but check path-based match
          const pathMatch = newWithoutId.find(
            e => e.path === oldEntry.path && e.collection === oldEntry.collection && e.mode === oldEntry.mode
          );

          if (pathMatch) {
            // Found by path - check for value change
            if (!valuesEqual(oldEntry.value, pathMatch.value)) {
              result.valueChanges.push({
                variableId,
                path: pathMatch.path,
                oldValue: oldEntry.value,
                newValue: pathMatch.value,
                type: pathMatch.type,
                collection: pathMatch.collection,
                mode: pathMatch.mode,
              });
            }
            const pathKey = `${pathMatch.collection}:${pathMatch.mode}:${pathMatch.path}`;
            processedNewIds.add(pathKey);
          } else {
            result.deletedVariables.push({
              variableId,
              path: oldEntry.path,
              value: oldEntry.value,
              type: oldEntry.type,
              collection: oldEntry.collection,
              mode: oldEntry.mode,
            });
          }
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

  // Find completely new variables (with variableId)
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

  // Compare entries WITHOUT variableId (path-based comparison)
  // These are typically tokens edited in code that don't have Figma IDs
  const oldByPath = new Map<string, BaselineEntry>();
  const newByPath = new Map<string, BaselineEntry>();

  for (const entry of oldWithoutId) {
    const key = `${entry.collection}:${entry.mode}:${entry.path}`;
    oldByPath.set(key, entry);
  }

  for (const entry of newWithoutId) {
    const key = `${entry.collection}:${entry.mode}:${entry.path}`;
    // Skip if already processed via ID-based match
    if (!processedNewIds.has(key)) {
      newByPath.set(key, entry);
    }
  }

  // Find changes and deletions for path-only entries
  for (const [key, oldEntry] of oldByPath) {
    const newEntry = newByPath.get(key);

    if (!newEntry) {
      // Check if there's a matching entry with variableId
      // (This handles the case where an entry gained an ID)
      const hasIdMatch = newWithId.some(
        e => e.path === oldEntry.path && e.collection === oldEntry.collection && e.mode === oldEntry.mode
      );

      if (!hasIdMatch) {
        result.deletedVariables.push({
          variableId: '',
          path: oldEntry.path,
          value: oldEntry.value,
          type: oldEntry.type,
          collection: oldEntry.collection,
          mode: oldEntry.mode,
        });
      }
    } else if (!valuesEqual(oldEntry.value, newEntry.value)) {
      result.valueChanges.push({
        variableId: '',
        path: newEntry.path,
        oldValue: oldEntry.value,
        newValue: newEntry.value,
        type: newEntry.type,
        collection: newEntry.collection,
        mode: newEntry.mode,
      });
    }
  }

  // Find new path-only entries
  for (const [key, newEntry] of newByPath) {
    if (!oldByPath.has(key)) {
      // Check if this might be a renamed token (same value, different path)
      // For now, treat as new - rename detection requires ID
      result.newVariables.push({
        variableId: '',
        path: newEntry.path,
        value: newEntry.value,
        type: newEntry.type,
        collection: newEntry.collection,
        mode: newEntry.mode,
      });
    }
  }

  // Compare styles using cross-section comparison
  // This handles:
  // 1. Style entries from baseline (code) vs styles section (Figma)
  // 2. Styles section (Figma) vs style entries from baseline (code)
  compareCrossStyleEntries(
    oldStyleEntries,
    newStyleEntries,
    oldBaseline.styles,
    newBaseline.styles,
    result
  );

  return result;
}

/**
 * Compare styles across different sections:
 * - oldStyleEntries: Style-like entries from old baseline (code side - types like gradient, shadow, blur, typography)
 * - newStyleEntries: Style-like entries from new baseline (code side)
 * - oldStyles: Figma styles section from old baseline (types: paint, effect, text)
 * - newStyles: Figma styles section from new baseline
 *
 * The key challenge: code baseline has styles with group prefixes (e.g., "color.components.button.bg")
 * but Figma styles have paths without prefixes (e.g., "components.button.bg")
 */
function compareCrossStyleEntries(
  oldStyleEntries: BaselineEntry[],
  newStyleEntries: BaselineEntry[],
  oldStyles: Record<string, StyleBaselineEntry> | undefined,
  newStyles: Record<string, StyleBaselineEntry> | undefined,
  result: ComparisonResult
): void {
  // Build lookup maps for all style sources
  // Key format: normalized path (without group prefix)
  const oldFromBaseline = new Map<string, BaselineEntry>();
  const newFromBaseline = new Map<string, BaselineEntry>();
  const oldFromStyles = new Map<string, StyleBaselineEntry>();
  const newFromStyles = new Map<string, StyleBaselineEntry>();

  // Process style entries from baseline (code side)
  for (const entry of oldStyleEntries) {
    const normalizedPath = stripStyleGroupPrefix(entry.path);
    oldFromBaseline.set(normalizedPath, entry);
  }

  for (const entry of newStyleEntries) {
    const normalizedPath = stripStyleGroupPrefix(entry.path);
    newFromBaseline.set(normalizedPath, entry);
  }

  // Process Figma styles section
  if (oldStyles) {
    for (const style of Object.values(oldStyles)) {
      oldFromStyles.set(style.path, style);
    }
  }

  if (newStyles) {
    for (const style of Object.values(newStyles)) {
      newFromStyles.set(style.path, style);
    }
  }

  // Track processed paths to avoid double-reporting
  const processedPaths = new Set<string>();

  // Compare old baseline entries vs new (from both sources)
  for (const [normalizedPath, oldEntry] of oldFromBaseline) {
    // Try to find in new baseline first
    let newEntry = newFromBaseline.get(normalizedPath);
    let newStyle = newFromStyles.get(normalizedPath);

    if (newEntry) {
      // Found in new baseline - compare values
      if (!valuesEqual(oldEntry.value, newEntry.value)) {
        result.styleValueChanges.push({
          styleId: '',
          path: normalizedPath,
          oldValue: oldEntry.value,
          newValue: newEntry.value,
          styleType: mapToFigmaStyleType(oldEntry.type),
        });
      }
      processedPaths.add(normalizedPath);
    } else if (newStyle) {
      // Found in new styles section - compare values (different format)
      // For now, skip value comparison since formats differ significantly
      processedPaths.add(normalizedPath);
    } else {
      // Not found - deleted
      result.deletedStyles.push({
        styleId: '',
        path: normalizedPath,
        value: oldEntry.value,
        styleType: mapToFigmaStyleType(oldEntry.type),
      });
      processedPaths.add(normalizedPath);
    }
  }

  // Compare old Figma styles vs new (from both sources)
  for (const [path, oldStyle] of oldFromStyles) {
    if (processedPaths.has(path)) continue;

    // Try to find in new styles first
    let newStyle = newFromStyles.get(path);
    let newEntry = newFromBaseline.get(path);

    if (newStyle) {
      // Found in new styles - compare values
      if (!valuesEqual(oldStyle.value, newStyle.value)) {
        result.styleValueChanges.push({
          styleId: newStyle.styleId || oldStyle.styleId,
          path,
          oldValue: oldStyle.value,
          newValue: newStyle.value,
          styleType: newStyle.type || oldStyle.type,
        });
      }
      processedPaths.add(path);
    } else if (newEntry) {
      // Found in new baseline - style migrated to code format
      // For now, skip value comparison since formats differ
      processedPaths.add(path);
    } else {
      // Not found - deleted
      result.deletedStyles.push({
        styleId: oldStyle.styleId,
        path,
        value: oldStyle.value,
        styleType: oldStyle.type,
      });
      processedPaths.add(path);
    }
  }

  // Find new styles (not in old)
  for (const [normalizedPath, newEntry] of newFromBaseline) {
    if (processedPaths.has(normalizedPath)) continue;

    // Check if existed in old styles
    if (!oldFromStyles.has(normalizedPath)) {
      result.newStyles.push({
        styleId: '',
        path: normalizedPath,
        value: newEntry.value,
        styleType: mapToFigmaStyleType(newEntry.type),
      });
    }
    processedPaths.add(normalizedPath);
  }

  for (const [path, newStyle] of newFromStyles) {
    if (processedPaths.has(path)) continue;

    // Check if existed in old baseline
    if (!oldFromBaseline.has(path)) {
      result.newStyles.push({
        styleId: newStyle.styleId,
        path,
        value: newStyle.value,
        styleType: newStyle.type,
      });
    }
  }
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
    result.deletedModes.length > 0 ||
    result.styleValueChanges.length > 0 ||
    result.stylePathChanges.length > 0 ||
    result.newStyles.length > 0 ||
    result.deletedStyles.length > 0
  );
}

export function hasBreakingChanges(result: ComparisonResult): boolean {
  return (
    result.pathChanges.length > 0 ||
    result.deletedVariables.length > 0 ||
    result.deletedModes.length > 0 ||
    result.stylePathChanges.length > 0 ||
    result.deletedStyles.length > 0
  );
}

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

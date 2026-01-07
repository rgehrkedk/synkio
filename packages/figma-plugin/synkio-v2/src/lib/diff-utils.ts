// =============================================================================
// Diff Utilities - Shared functions for building diff displays
// Used by both sync.ts (Figma -> Code) and apply.ts (Code -> Figma)
// =============================================================================

import {
  ComparisonResult,
  ValueChange,
  PathChange,
  NewVariable,
  DeletedVariable,
  StyleValueChange,
  StylePathChange,
  NewStyle,
  DeletedStyle,
} from './types';
import { el, DiffItem } from '../ui/components/index';

// =============================================================================
// Types
// =============================================================================

export interface GroupedChanges {
  added: NewVariable[];
  modified: ValueChange[];
  deleted: DeletedVariable[];
  renamed: PathChange[];
}

export interface GroupedStyleChanges {
  added: NewStyle[];
  modified: StyleValueChange[];
  deleted: DeletedStyle[];
  renamed: StylePathChange[];
}

// =============================================================================
// Grouping Functions
// =============================================================================

/**
 * Group variable changes by collection for display
 */
export function groupByCollection(diff: ComparisonResult): Record<string, GroupedChanges> {
  const grouped: Record<string, GroupedChanges> = {};

  const getOrCreate = (collection: string): GroupedChanges => {
    if (!grouped[collection]) {
      grouped[collection] = { added: [], modified: [], deleted: [], renamed: [] };
    }
    return grouped[collection];
  };

  for (const item of diff.newVariables) {
    getOrCreate(item.collection).added.push(item);
  }

  for (const item of diff.valueChanges) {
    getOrCreate(item.collection).modified.push(item);
  }

  for (const item of diff.deletedVariables) {
    getOrCreate(item.collection).deleted.push(item);
  }

  for (const item of diff.pathChanges) {
    getOrCreate(item.collection).renamed.push(item);
  }

  return grouped;
}

/**
 * Group style changes by type (paint, text, effect) for display
 */
export function groupStylesByType(diff: ComparisonResult): Record<string, GroupedStyleChanges> {
  const grouped: Record<string, GroupedStyleChanges> = {};

  const getOrCreate = (styleType: string): GroupedStyleChanges => {
    const label = styleType === 'paint' ? 'Paint Styles' : styleType === 'text' ? 'Text Styles' : 'Effect Styles';
    if (!grouped[label]) {
      grouped[label] = { added: [], modified: [], deleted: [], renamed: [] };
    }
    return grouped[label];
  };

  for (const item of diff.newStyles) {
    getOrCreate(item.styleType).added.push(item);
  }

  for (const item of diff.styleValueChanges) {
    getOrCreate(item.styleType).modified.push(item);
  }

  for (const item of diff.deletedStyles) {
    getOrCreate(item.styleType).deleted.push(item);
  }

  for (const item of diff.stylePathChanges) {
    getOrCreate(item.styleType).renamed.push(item);
  }

  return grouped;
}

// =============================================================================
// UI Building Functions
// =============================================================================

/**
 * Build diff item elements for variable changes
 * @param changes - Grouped changes by type
 * @param variableIdLookup - Optional map from VariableID to path for resolving references
 */
export function buildDiffItems(
  changes: GroupedChanges,
  variableIdLookup?: Map<string, string>
): HTMLElement[] {
  const items: HTMLElement[] = [];

  // Added - new tokens that will be created
  for (const item of changes.added) {
    // Include mode in path to distinguish between modes
    const displayPath = `${item.path} (${item.mode})`;
    items.push(DiffItem({
      type: 'added',
      path: displayPath,
      value: formatValue(item.value, variableIdLookup),
      colorPreview: item.type === 'color' ? resolveColorValue(item.value) : undefined,
    }));
  }

  // Modified - value changes
  for (const item of changes.modified) {
    const displayPath = `${item.path} (${item.mode})`;
    items.push(DiffItem({
      type: 'modified',
      path: displayPath,
      // Show old -> new values
      value: formatValue(item.newValue, variableIdLookup),
      oldValue: formatValue(item.oldValue, variableIdLookup),
      colorPreview: item.type === 'color' ? resolveColorValue(item.newValue) : undefined,
    }));
  }

  // Renamed - path changed but same variable
  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value, variableIdLookup),
    }));
  }

  // Deleted - tokens that will be removed (just show path, value irrelevant)
  for (const item of changes.deleted) {
    const displayPath = `${item.path} (${item.mode})`;
    items.push(DiffItem({
      type: 'deleted',
      path: displayPath,
    }));
  }

  return items;
}

/**
 * Try to resolve a color value for preview (handles aliases)
 */
function resolveColorValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    // Direct hex/rgb color
    if (value.startsWith('#') || value.startsWith('rgb')) {
      return value;
    }
    // It's an alias reference - can't preview
    return undefined;
  }
  if (typeof value === 'object' && value !== null) {
    // $ref format - can't preview the alias
    return undefined;
  }
  return undefined;
}

/**
 * Build diff item elements for style changes
 * @param changes - Grouped style changes by type
 * @param variableIdLookup - Optional map from VariableID to path for resolving references
 */
export function buildStyleDiffItems(
  changes: GroupedStyleChanges,
  variableIdLookup?: Map<string, string>
): HTMLElement[] {
  const items: HTMLElement[] = [];

  // Added
  for (const item of changes.added) {
    items.push(DiffItem({
      type: 'added',
      path: item.path,
      value: formatValue(item.value, variableIdLookup),
    }));
  }

  // Modified
  for (const item of changes.modified) {
    items.push(DiffItem({
      type: 'modified',
      path: item.path,
      value: formatValue(item.newValue, variableIdLookup),
      oldValue: formatValue(item.oldValue, variableIdLookup),
    }));
  }

  // Renamed
  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value, variableIdLookup),
    }));
  }

  // Deleted - styles that will be removed (no value needed)
  for (const item of changes.deleted) {
    items.push(DiffItem({
      type: 'deleted',
      path: item.path,
    }));
  }

  return items;
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format a token value for display.
 * Handles variable references and makes them more readable.
 */
export function formatValue(value: unknown, variableIdToPath?: Map<string, string>): string {
  if (value === null || value === undefined) return '';
  
  if (typeof value === 'string') {
    // Check for variable alias reference pattern: {VariableID:xxxx:xxxx}
    const varIdMatch = value.match(/^\{(VariableID:[^}]+)\}$/);
    if (varIdMatch) {
      const varId = varIdMatch[1];
      // If we have a lookup, resolve to path
      if (variableIdToPath) {
        const path = variableIdToPath.get(varId);
        if (path) {
          return `{${path}}`;
        }
      }
      // Fallback: show as "variable alias" without the ugly ID
      return '{variable alias}';
    }
    return value;
  }
  
  if (typeof value === 'object') {
    // Handle $ref format: {$ref: 'VariableID:xxxx:xxxx'}
    if ('$ref' in (value as Record<string, unknown>)) {
      const ref = (value as { $ref: string }).$ref;
      // Check if it's a VariableID reference that we can resolve
      if (ref.startsWith('VariableID:') && variableIdToPath) {
        const path = variableIdToPath.get(ref);
        if (path) {
          return `{${path}}`;
        }
      }
      return `{${ref}}`;
    }
    return JSON.stringify(value);
  }
  
  return String(value);
}

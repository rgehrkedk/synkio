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
import { el, DiffItem } from '../ui/components';

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
 */
export function buildDiffItems(changes: GroupedChanges): HTMLElement[] {
  const items: HTMLElement[] = [];

  // Added
  for (const item of changes.added) {
    items.push(DiffItem({
      type: 'added',
      path: item.path,
      value: formatValue(item.value),
      colorPreview: item.type === 'color' ? String(item.value) : undefined,
    }));
  }

  // Modified
  for (const item of changes.modified) {
    items.push(DiffItem({
      type: 'modified',
      path: item.path,
      value: formatValue(item.newValue),
      oldValue: formatValue(item.oldValue),
      colorPreview: item.type === 'color' ? String(item.newValue) : undefined,
    }));
  }

  // Renamed
  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value),
    }));
  }

  // Deleted
  for (const item of changes.deleted) {
    items.push(DiffItem({
      type: 'deleted',
      path: item.path,
      value: `was ${formatValue(item.value)}`,
    }));
  }

  return items;
}

/**
 * Build diff item elements for style changes
 */
export function buildStyleDiffItems(changes: GroupedStyleChanges): HTMLElement[] {
  const items: HTMLElement[] = [];

  // Added
  for (const item of changes.added) {
    items.push(DiffItem({
      type: 'added',
      path: item.path,
      value: formatValue(item.value),
    }));
  }

  // Modified
  for (const item of changes.modified) {
    items.push(DiffItem({
      type: 'modified',
      path: item.path,
      value: formatValue(item.newValue),
      oldValue: formatValue(item.oldValue),
    }));
  }

  // Renamed
  for (const item of changes.renamed) {
    items.push(DiffItem({
      type: 'renamed',
      path: item.newPath,
      oldPath: item.oldPath,
      value: formatValue(item.value),
    }));
  }

  // Deleted
  for (const item of changes.deleted) {
    items.push(DiffItem({
      type: 'deleted',
      path: item.path,
      value: `was ${formatValue(item.value)}`,
    }));
  }

  return items;
}

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Format a token value for display
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('$ref' in (value as Record<string, unknown>)) {
      return `{${(value as { $ref: string }).$ref}}`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

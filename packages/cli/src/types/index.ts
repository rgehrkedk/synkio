// @synkio/cli - Type definitions

// Re-export schema types
export type { StyleType, StyleEntry, PaintStyleEntry, TextStyleEntry, EffectStyleEntry } from './schemas.js';

// =============================================================================
// Variable Types
// =============================================================================

export interface BaselineEntry {
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
  variableId?: string;
  collectionId?: string;
  modeId?: string;
  // Optional metadata from Figma
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

export type RawTokens = Record<string, BaselineEntry>;

// =============================================================================
// Style Types
// =============================================================================

/** Style baseline entry - parallel to BaselineEntry for variables */
export interface StyleBaselineEntry {
  styleId: string;
  type: 'paint' | 'text' | 'effect';
  path: string;
  value: any;  // DTCG-formatted value object
  description?: string;
}

export type RawStyles = Record<string, StyleBaselineEntry>;

// =============================================================================
// Baseline Data
// =============================================================================

export interface BaselineData {
  baseline: Record<string, BaselineEntry>;
  styles?: Record<string, StyleBaselineEntry>;  // Optional for backwards compatibility
  metadata: {
    syncedAt: string;
    figmaBaselineHash?: string;  // Hash for tracking code sync status
  };
}

export interface ValueChange {
  variableId: string;
  path: string;
  oldValue: any;
  newValue: any;
  type: string;
}

export interface PathChange {
  variableId: string;
  oldPath: string;
  newPath: string;
  value: any;
  type: string;
}

export interface NewVariable {
  variableId: string;
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
}

export interface DeletedVariable {
  variableId: string;
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
}

export interface ModeRename {
  collection: string;
  oldMode: string;
  newMode: string;
}

export interface ModeChange {
  collection: string;
  mode: string;
}

export interface CollectionRename {
  oldCollection: string;
  newCollection: string;
  modeMapping: { oldMode: string; newMode: string }[];
}

export interface ComparisonResult {
  valueChanges: ValueChange[];
  pathChanges: PathChange[];
  collectionRenames: CollectionRename[];
  modeRenames: ModeRename[];
  newModes: ModeChange[];
  deletedModes: ModeChange[];
  newVariables: NewVariable[];
  deletedVariables: DeletedVariable[];
  // Style changes (v3.0.0+)
  styleValueChanges?: StyleValueChange[];
  stylePathChanges?: StylePathChange[];
  newStyles?: NewStyle[];
  deletedStyles?: DeletedStyle[];
}

// =============================================================================
// Style Comparison Types
// =============================================================================

export interface StyleValueChange {
  styleId: string;
  path: string;
  oldValue: any;
  newValue: any;
  styleType: 'paint' | 'text' | 'effect';
}

export interface StylePathChange {
  styleId: string;
  oldPath: string;
  newPath: string;
  value: any;
  styleType: 'paint' | 'text' | 'effect';
}

export interface NewStyle {
  styleId: string;
  path: string;
  value: any;
  styleType: 'paint' | 'text' | 'effect';
}

export interface DeletedStyle {
  styleId: string;
  path: string;
  value: any;
  styleType: 'paint' | 'text' | 'effect';
}

export interface StyleComparisonResult {
  valueChanges: StyleValueChange[];
  pathChanges: StylePathChange[];
  newStyles: NewStyle[];
  deletedStyles: DeletedStyle[];
}

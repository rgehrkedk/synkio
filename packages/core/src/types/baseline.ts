/**
 * Baseline Types
 *
 * Types for the baseline export from Figma plugin.
 * Used by: fetchFigmaRegistry, compareFigmaTokens, splitTokens, generateMigrationList
 */

export interface BaselineEntry {
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
}

export interface BaselineMetadata {
  version: string;
  exportedAt: string;
  pluginVersion: string;
  fileKey: string;
  fileName: string;
}

export interface BaselineData {
  $metadata?: BaselineMetadata;
  baseline: Record<string, BaselineEntry>;
  [collectionName: string]: any; // Nested collection data (primitives, themes, brands)
}

/**
 * Token type definitions
 * Supports W3C Design Tokens format and common token types
 */

export type TokenType =
  | 'color'
  | 'dimension'
  | 'spacing'
  | 'fontSize'
  | 'fontFamily'
  | 'fontWeight'
  | 'number'
  | 'string'
  | 'boolean'
  | 'shadow'
  | 'gradient'
  | 'duration';

/**
 * Token value in internal format
 */
export interface TokenValue {
  value: any;
  type: string;
  description?: string;
}

/**
 * Normalized token with consistent format
 */
export interface NormalizedToken {
  value: any;
  type: TokenType;
  description?: string;
}

/**
 * Export token in W3C format with variable ID
 */
export interface ExportToken {
  $type: string;
  $value: any;
  $variableId: string;
}

/**
 * Baseline entry for flat baseline lookup
 */
export interface BaselineEntry {
  /** Full path: collection.mode.group.token */
  path: string;
  /** Resolved value */
  value: any;
  /** Token type (color, number, string, etc.) */
  type: string;
  /** Collection name */
  collection: string;
  /** Mode name */
  mode: string;
  /** Original Figma variable ID (for re-import matching) */
  variableId: string;
  /** Original Figma collection ID (for re-import matching) */
  collectionId: string;
  /** Original Figma mode ID (for re-import matching) */
  modeId: string;
  /** Variable description (if any) */
  description?: string;
}

/**
 * Collection metadata for re-import matching
 */
export interface CollectionMetadata {
  id: string;
  name: string;
  modeCount: number;
  variableCount: number;
  modes: { id: string; name: string }[];
}

/**
 * Complete baseline snapshot with metadata
 */
export interface BaselineSnapshot {
  $metadata: {
    /** Baseline format version */
    version: string;
    /** When this baseline was exported */
    exportedAt: string;
    /** Plugin version that created this export */
    pluginVersion: string;
    /** Figma file key (unique identifier) */
    fileKey: string;
    /** Figma file name */
    fileName: string;
    /** Registry node ID (if synced to node) */
    registryNodeId?: string;
    /** Total variable count */
    variableCount: number;
    /** Total collection count */
    collectionCount: number;
    /** Collection metadata for re-import matching */
    collections: CollectionMetadata[];
    /** Checksum of baseline content for integrity verification */
    checksum?: string;
  };
  baseline: Record<string, BaselineEntry>;
  [collectionName: string]: any; // Nested token structure
}

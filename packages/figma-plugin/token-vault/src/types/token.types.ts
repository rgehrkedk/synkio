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
  path: string;
  value: any;
  type: string;
  collection: string;
  mode: string;
}

/**
 * Complete baseline snapshot with metadata
 */
export interface BaselineSnapshot {
  $metadata: {
    version: string;
    exportedAt: string;
    pluginVersion: string;
    fileKey: string;
    fileName: string;
  };
  baseline: Record<string, BaselineEntry>;
  [collectionName: string]: any; // Nested token structure
}

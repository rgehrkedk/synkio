/**
 * Token Map Types
 *
 * Types for the token mapping system that enables precise migration
 * by tracking Variable ID → platform output name relationships.
 */

/**
 * Platform-specific output names for a single token
 */
export interface TokenOutputs {
  /** CSS custom property name, e.g., "--color-brand-primary" */
  css?: string;
  /** SCSS variable name, e.g., "$color-brand-primary" */
  scss?: string;
  /** JavaScript/TypeScript property path, e.g., "colorBrandPrimary" */
  js?: string;
  /** Swift property name, e.g., "ColorBrandPrimary" */
  swift?: string;
  /** Kotlin property name, e.g., "colorBrandPrimary" */
  kotlin?: string;
}

/**
 * Single entry in the token map
 */
export interface TokenMapEntry {
  /** Full token path, e.g., "color.brand.primary" */
  path: string;
  /** Token type, e.g., "color", "dimension" */
  type: string;
  /** Collection name, e.g., "base", "theme" */
  collection: string;
  /** Mode name, e.g., "light", "dark", "value" */
  mode: string;
  /** Platform-specific output names */
  outputs: TokenOutputs;
}

/**
 * Token map metadata
 */
export interface TokenMapMetadata {
  /** ISO timestamp when map was generated */
  generatedAt: string;
  /** Token map schema version */
  version: string;
  /** Synkio version that generated the map */
  synkioVersion?: string;
  /** Source Figma file name */
  fileName?: string;
}

/**
 * Complete token map structure
 *
 * Maps Figma Variable ID to token information and platform outputs.
 * Used for precise migration when tokens are renamed.
 *
 * @example
 * ```json
 * {
 *   "$metadata": { "generatedAt": "...", "version": "1.0.0" },
 *   "tokens": {
 *     "base:value:VariableID:4:75": {
 *       "path": "color.base.gray.50",
 *       "type": "color",
 *       "collection": "base",
 *       "mode": "value",
 *       "outputs": {
 *         "css": "--color-base-gray-50",
 *         "scss": "$color-base-gray-50",
 *         "js": "colorBaseGray50"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface TokenMap {
  /** Map metadata */
  $metadata: TokenMapMetadata;
  /** Token entries keyed by Variable ID */
  tokens: Record<string, TokenMapEntry>;
}

/**
 * Result of comparing two token maps
 */
export interface TokenMapDiff {
  /** Tokens that were renamed (path changed, same variableId) */
  renamed: Array<{
    variableId: string;
    oldPath: string;
    newPath: string;
    oldOutputs: TokenOutputs;
    newOutputs: TokenOutputs;
  }>;
  /** Tokens that were added */
  added: Array<{
    variableId: string;
    entry: TokenMapEntry;
  }>;
  /** Tokens that were removed */
  removed: Array<{
    variableId: string;
    entry: TokenMapEntry;
  }>;
}

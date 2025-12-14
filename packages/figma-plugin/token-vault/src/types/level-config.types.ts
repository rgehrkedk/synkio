/**
 * Level-based import configuration types
 * Defines how JSON structure levels map to Figma concepts
 */

/**
 * Type of role a level can play in the import structure
 */
export type LevelRole = 'collection' | 'mode' | 'token-path';

/**
 * Configuration for a single level in the JSON structure
 */
export interface LevelConfiguration {
  /**
   * Level depth (1-based index)
   */
  depth: number;

  /**
   * Role this level plays in the Figma structure
   */
  role: LevelRole;

  /**
   * Example keys found at this level (max 5)
   */
  exampleKeys?: string[];

  /**
   * Total count of unique keys at this level
   */
  keyCount?: number;
}

/**
 * File grouping configuration for multi-file imports
 */
export interface FileGroup {
  /**
   * Unique identifier for this group
   */
  id: string;

  /**
   * Name of the collection this group will create
   */
  collectionName: string;

  /**
   * File names included in this group
   */
  fileNames: string[];

  /**
   * How to handle multiple files
   * - 'per-file': Each file becomes a separate mode
   * - 'merged': Merge all files into one mode
   */
  modeStrategy: 'per-file' | 'merged';

  /**
   * Extracted mode names for each file (when modeStrategy is 'per-file')
   * Maps fileName -> modeName (as Record for JSON serialization)
   */
  modeNames?: Record<string, string>;
}

/**
 * Complete configuration for a collection import
 */
export interface CollectionConfiguration {
  /**
   * Collection name
   */
  name: string;

  /**
   * Level configurations for this collection
   */
  levels: LevelConfiguration[];

  /**
   * Source files for this collection
   */
  sourceFiles: string[];

  /**
   * Mode strategy (for multi-file imports)
   */
  modeStrategy?: 'per-file' | 'merged';
}

/**
 * Validation result for level configurations
 */
export interface LevelValidation {
  /**
   * Whether the configuration is valid
   */
  valid: boolean;

  /**
   * Error message if invalid
   */
  error?: string;

  /**
   * Warning messages
   */
  warnings?: string[];
}

/**
 * Validate that level configurations are correct
 * - At least one level must be 'collection'
 * - Depths must be sequential starting from 1
 */
export function validateLevelConfiguration(levels: LevelConfiguration[]): LevelValidation {
  if (levels.length === 0) {
    return {
      valid: false,
      error: 'No level configurations provided',
    };
  }

  // Check for at least one collection
  const hasCollection = levels.some((level) => level.role === 'collection');
  if (!hasCollection) {
    return {
      valid: false,
      error: 'At least one level must be mapped as Collection',
    };
  }

  // Check depths are sequential
  const depths = levels.map((level) => level.depth).sort((a, b) => a - b);
  for (let i = 0; i < depths.length; i++) {
    if (depths[i] !== i + 1) {
      return {
        valid: false,
        error: `Level depths must be sequential starting from 1. Found gap at depth ${i + 1}`,
      };
    }
  }

  // Warnings
  const warnings: string[] = [];
  const hasMode = levels.some((level) => level.role === 'mode');
  if (!hasMode) {
    warnings.push('No Mode level defined - a default mode will be created');
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Extract mode name from filename
 * Supports patterns like:
 * - "semantic-light.json" -> "light"
 * - "theme.dark.json" -> "dark"
 * - "mobile_theme.json" -> "mobile_theme"
 */
export function extractModeNameFromFilename(fileName: string): string {
  // Remove .json extension
  const nameWithoutExt = fileName.replace(/\.json$/i, '');

  // Try hyphen separator (semantic-light)
  if (nameWithoutExt.includes('-')) {
    const parts = nameWithoutExt.split('-');
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }

  // Try dot separator (theme.light)
  if (nameWithoutExt.includes('.')) {
    const parts = nameWithoutExt.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }

  // Try underscore separator (mobile_theme)
  if (nameWithoutExt.includes('_')) {
    const parts = nameWithoutExt.split('_');
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }

  // Fallback: return full name without extension
  return nameWithoutExt;
}

/**
 * Suggest collection name from grouped file names
 * Finds common prefix from filenames
 */
export function suggestCollectionName(fileNames: string[]): string {
  if (fileNames.length === 0) return 'Tokens';
  if (fileNames.length === 1) {
    // Remove mode suffix and extension
    return fileNames[0]
      .replace(/\.json$/i, '')
      .replace(/[-._](light|dark|mobile|desktop)$/i, '');
  }

  // Find common prefix
  const prefix = findCommonPrefix(fileNames.map((f) => f.replace(/\.json$/i, '')));

  return prefix || 'Tokens';
}

/**
 * Find common prefix among strings
 */
function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';

  let prefix = strings[0];

  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }

  // Remove trailing separators
  return prefix.replace(/[-._]+$/, '');
}

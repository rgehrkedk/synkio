/**
 * Unified Config Types
 *
 * Types for the unified configuration file (.tokensrc.json).
 * Replaces both .tokensplitrc.json and .migrationrc.json
 */

// Re-export ResolvedConfig from config-schema (Zod-inferred type)
export type { ResolvedConfig } from '../files/config-schema.js';

// ============================================================================
// Main Config
// ============================================================================

/**
 * Complete configuration schema for Synkio
 *
 * @example
 * ```json
 * {
 *   "version": "2.0.0",
 *   "figma": {
 *     "fileId": "abc123",
 *     "accessToken": "${FIGMA_ACCESS_TOKEN}"
 *   },
 *   "paths": {
 *     "root": ".",
 *     "data": ".figma",
 *     "baseline": ".figma/baseline.json",
 *     "baselinePrev": ".figma/baseline.prev.json",
 *     "reports": ".figma/reports",
 *     "tokens": "tokens",
 *     "styles": "styles/tokens"
 *   },
 *   "collections": {
 *     "core": {
 *       "strategy": "byMode",
 *       "output": "tokens/core",
 *       "files": {
 *         "light": "tokens/core/light.json",
 *         "dark": "tokens/core/dark.json"
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface TokensConfig {
  /** JSON Schema reference for IDE support */
  $schema?: string;

  /** Config version (e.g., "2.0.0") */
  version: string;

  /** Figma connection settings */
  figma: FigmaConfig;

  /** File and directory paths */
  paths: PathsConfig;

  /** Collection output configuration (Phase 1B - simplified) */
  collections?: CollectionsConfig;

  /** Optional build configuration */
  build?: BuildConfig;

  /** Optional migration configuration */
  migration?: MigrationConfig;

  /** Legacy: Split configuration (for backwards compatibility with old setup.ts) */
  split?: SplitConfig;
}

// ============================================================================
// Figma Config
// ============================================================================

/**
 * Figma API connection settings
 */
export interface FigmaConfig {
  /** Figma file ID (from URL: figma.com/file/{fileId}/...) */
  fileId: string;

  /** Optional: Registry node ID from Figma plugin */
  nodeId?: string;

  /** Figma access token. Supports env var interpolation: "${FIGMA_ACCESS_TOKEN}" */
  accessToken: string;
}

// ============================================================================
// Build Config
// ============================================================================

/**
 * Build command configuration
 */
export interface BuildConfig {
  /** Shell command to run after token sync (e.g., "npm run tokens:build") */
  command?: string;

  /** Style Dictionary integration settings */
  styleDictionary?: StyleDictionaryConfig;
}

/**
 * Style Dictionary configuration
 */
export interface StyleDictionaryConfig {
  /** Whether Style Dictionary integration is enabled */
  enabled?: boolean;

  /** Path to Style Dictionary config file (e.g., "scripts/build-tokens.js") */
  config?: string;

  /** Detected Style Dictionary version */
  version?: 'v3' | 'v4';
}

// ============================================================================
// Paths Config
// ============================================================================

/**
 * File and directory paths
 * All paths are relative to config file location unless absolute
 */
export interface PathsConfig {
  /** Project root directory (optional, defaults to config file location) */
  root?: string;

  /** Data directory for baselines and internal files (default: ".figma") */
  data: string;

  /** Baseline file path (default: ".figma/baseline.json") */
  baseline: string;

  /** Previous baseline file path for rollback (default: ".figma/baseline.prev.json") */
  baselinePrev: string;

  /** Reports directory (default: ".figma/reports") */
  reports: string;

  /** Token output directory (default: "tokens") */
  tokens: string;

  /** Styles output directory (default: "styles/tokens") */
  styles: string;

  /** Token map file path for precise migration (default: ".figma/data/token-map.json") */
  tokenMap?: string;
}

// ============================================================================
// Collections Config (Phase 1B - Simplified)
// ============================================================================

/**
 * Collection output configuration
 * Maps collection names to their output strategies
 */
export interface CollectionsConfig {
  [collectionName: string]: CollectionConfig;
}

/**
 * Single collection configuration
 */
export interface CollectionConfig {
  /** Output strategy: split by group, by mode, or flat */
  strategy: 'byGroup' | 'byMode' | 'flat';

  /** Base output directory */
  output: string;

  /** Explicit file mappings for modes/groups */
  files?: FileMapping;
}

/**
 * File mapping for modes or groups
 */
export interface FileMapping {
  [key: string]: string; // mode/group name -> file path
}

// ============================================================================
// Migration Config
// ============================================================================

/**
 * Code migration settings
 * Supports both simple (Phase 1B) and advanced (legacy) formats
 */
export interface MigrationConfig {
  /** Whether automatic migration is enabled (Phase 1B simple format) */
  enabled?: boolean;

  /** Target platforms for migration (Phase 1B simple format) */
  platforms?: string[] | { [platformName: string]: PlatformConfig };

  /** Glob patterns to exclude from migration (Phase 1B simple format) */
  exclude?: string[];

  /** Auto-apply flag (legacy format) */
  autoApply?: boolean;

  /** Segments to strip from token paths when generating migration patterns */
  stripSegments?: string[];
}

// ============================================================================
// Split Config (Legacy - for backwards compatibility)
// ============================================================================

export interface SplitConfig {
  [collectionName: string]: CollectionSplitConfig;
}

export interface CollectionSplitConfig {
  collection: string;
  strategy: 'byGroup' | 'byMode';
  output: string;             // Base output directory (for reference/defaults)
  files: FileMapping;         // Explicit file paths for each mode/group
}

// Legacy types for backwards compatibility
export interface GroupMapping {
  [groupName: string]: string; // group name -> filename
}

export interface ModeMapping {
  [modeName: string]: string; // mode name -> filename
}

// ============================================================================
// Migration Platform Config
// ============================================================================

export interface PlatformConfig {
  enabled?: boolean;
  include: string[];
  exclude: string[];
  transform: TransformConfig;
  patterns: string[];
}

export interface TransformConfig {
  prefix: string;
  separator: string;
  case: 'kebab' | 'camel' | 'snake' | 'pascal';
  stripSegments?: string[];
}

// ============================================================================
// Legacy Config Types (for migration from old config files)
// ============================================================================

export interface LegacyTokenSplitConfig {
  input: string;
  outputDir: string;
  transform?: {
    useDollarPrefix?: boolean;
    typeOverrides?: { [originalType: string]: string };
  };
  collections: {
    [collectionName: string]: LegacyCollectionConfig;
  };
}

export interface LegacyCollectionConfig {
  mode?: string;
  modes?: ModeMapping;
  strategy: 'split-by-group' | 'split-by-mode' | 'all-in-one' | 'custom';
  outputDir: string;
  fileNaming: string;
  groups?: GroupMapping;
}

export interface LegacyMigrationConfig {
  version: string;
  styleDictionary: {
    enabled?: boolean;
    configPath: string | null;
  };
  adapters: {
    [adapterName: string]: LegacyAdapter;
  };
  settings: {
    baselinePath: string;
    snapshotPath: string;
    outputPath: string;
    reportPath: string;
  };
}

export interface LegacyAdapter {
  enabled?: boolean;
  include: string[];
  exclude: string[];
  transform: {
    separator: string;
    case: string;
    prefix: string;
    stripSegments: string[];
  };
  patterns: string[];
}

// ============================================================================
// Token Entry Types (used during splitting)
// ============================================================================

export interface TokenEntry {
  $type?: string;
  type?: string;
  $value?: any;
  value?: any;
  $variableId?: string;
  [key: string]: any;
}

export interface LegacyTokenEntry {
  type: string;
  value: any;
  [key: string]: any;
}

// ============================================================================
// Transform Options (used for token transformation)
// ============================================================================

export interface TransformOptions {
  useDollarPrefix?: boolean;
  typeOverrides?: { [originalType: string]: string };
}

// ============================================================================
// Adapter Types (re-exported from migration for compatibility)
// ============================================================================

export interface Adapter {
  enabled?: boolean;
  include: string[];
  exclude: string[];
  transform: {
    separator: string;
    case: string;
    prefix: string;
    stripSegments: string[];
  };
  patterns: string[];
}

export interface NestedTokens {
  [key: string]: TokenEntry | NestedTokens;
}

export interface ModeData {
  [groupName: string]: NestedTokens;
}

export interface CollectionData {
  [modeName: string]: ModeData;
}

export interface CollectionInfo {
  name: string;
  modes: string[];
  groups: {
    [mode: string]: {
      [group: string]: number; // group -> token count
    };
  };
}

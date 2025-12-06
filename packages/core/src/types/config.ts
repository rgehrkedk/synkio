/**
 * Unified Config Types
 *
 * Types for the unified configuration file (.tokensrc.json).
 * Replaces both .tokensplitrc.json and .migrationrc.json
 */

// ============================================================================
// Main Config
// ============================================================================

export interface TokensConfig {
  $schema?: string;
  version: string;
  figma: FigmaConfig;
  paths: PathsConfig;
  build?: BuildConfig;
  split: SplitConfig;
  migration: MigrationConfig;
}

// ============================================================================
// Figma Config
// ============================================================================

export interface FigmaConfig {
  fileId: string;
  nodeId?: string; // Registry node ID from Figma plugin
  accessToken: string; // Can be "${FIGMA_ACCESS_TOKEN}" to use env var
}

// ============================================================================
// Build Config
// ============================================================================

export interface BuildConfig {
  command: string; // e.g., "npm run tokens:build"
  styleDictionary?: StyleDictionaryConfig;
}

export interface StyleDictionaryConfig {
  configPath: string; // Path to SD config file (e.g., "scripts/build-tokens.js")
  version?: 'v3' | 'v4'; // Detected SD version
}

// ============================================================================
// Paths Config
// ============================================================================

export interface PathsConfig {
  data: string;
  baseline: string;
  baselinePrev: string;
  reports: string;
  tokens: string;
  styles: string;
}

// ============================================================================
// Split Config
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

export interface FileMapping {
  [key: string]: string; // mode/group name -> full file path
}

// Legacy types for backwards compatibility
export interface GroupMapping {
  [groupName: string]: string; // group name -> filename
}

export interface ModeMapping {
  [modeName: string]: string; // mode name -> filename
}

// ============================================================================
// Migration Config
// ============================================================================

export interface MigrationConfig {
  autoApply: boolean;
  platforms: {
    [platformName: string]: PlatformConfig;
  };
}

export interface PlatformConfig {
  enabled: boolean;
  include: string[];
  exclude: string[];
  transform: TransformConfig;
  patterns: string[];
}

export interface TransformConfig {
  prefix: string;
  separator: string;
  case: 'kebab' | 'camel' | 'snake' | 'pascal';
  stripSegments: string[];
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
    enabled: boolean;
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
  enabled: boolean;
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
  enabled: boolean;
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

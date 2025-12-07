/**
 * Shared Types - Barrel Export
 *
 * Central export for all type definitions used across scripts and UI.
 */

// Baseline types
export type {
  BaselineEntry,
  BaselineMetadata,
  BaselineData,
} from './baseline.js';

// Figma API types
export type {
  FigmaNode,
  FigmaNodesResponse,
  FigmaFileResponse,
} from './figma.js';

// Migration types
export type {
  FileMatch,
  Migration,
  MigrationSummary,
  MigrationManifest,
  ValueChange,
  PathChange,
  NewVariable,
  DeletedVariable,
  ComparisonResult,
} from './migration.js';

// Config types (new unified config)
export type {
  TokensConfig,
  FigmaConfig,
  PathsConfig,
  BuildConfig,
  StyleDictionaryConfig,
  SplitConfig,
  CollectionSplitConfig,
  MigrationConfig,
  PlatformConfig,
  TransformConfig,
  GroupMapping,
  ModeMapping,
  // Legacy types for migration
  LegacyTokenSplitConfig,
  LegacyCollectionConfig,
  LegacyMigrationConfig,
  LegacyAdapter,
  // Token entry types
  TokenEntry,
  LegacyTokenEntry,
  NestedTokens,
  ModeData,
  CollectionData,
  CollectionInfo,
  // Transform types
  TransformOptions,
  Adapter,
} from './config.js';

// Token map types
export type {
  TokenOutputs,
  TokenMapEntry,
  TokenMapMetadata,
  TokenMap,
  TokenMapDiff,
} from './token-map.js';

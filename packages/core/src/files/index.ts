/**
 * File Utilities - Barrel Export
 */

// Path constants
export {
  // Directory paths
  FIGMA_DIR,
  FIGMA_CONFIG_DIR,
  FIGMA_DATA_DIR,
  FIGMA_REPORTS_DIR,
  TOKENS_DIR,
  STYLES_DIR,
  TYPES_DIR,
  // File paths
  CONFIG_FILE,
  BASELINE_FILE,
  BASELINE_PREV_FILE,
  DIFF_REPORT_FILE,
  MIGRATION_REPORT_FILE,
  // Legacy paths (for migration compatibility)
  LEGACY_BASELINE_FILE,
  LEGACY_BASELINE_PREV_FILE,
  LEGACY_SNAPSHOT_FILE,
  LEGACY_MIGRATION_FILE,
  LEGACY_DIFF_REPORT_FILE,
  LEGACY_MIGRATION_REPORT_FILE,
  LEGACY_MIGRATION_CONFIG_FILE,
  LEGACY_TOKEN_SPLIT_CONFIG_FILE,
  // Deprecated
  REPORTS_DIR,
} from './paths';

// File operations
export {
  // Config
  loadConfig,
  loadConfigOrThrow,
  saveConfig,
  // Baseline
  loadBaseline,
  loadBaselineOrThrow,
  loadBaselinePrev,
  backupBaseline,
  restoreBaseline,
  // Legacy config
  loadLegacyTokenSplitConfig,
  loadLegacyMigrationConfig,
  // Migration
  loadMigrationManifest,
  // Generic
  loadJsonFile,
  saveJsonFile,
  saveTextFile,
  fileExists,
  getAbsolutePath,
  ensureDir,
  ensureFigmaDir,
} from './loader';

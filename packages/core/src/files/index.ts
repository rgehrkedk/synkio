/**
 * File Utilities - Barrel Export
 */

// Path functions (new context-based API)
export {
  // Directory path functions
  getFigmaDir,
  getConfigDir,
  getDataDir,
  getReportsDir,
  getTokensDir,
  getStylesDir,
  getTypesDir,
  // File path functions
  getConfigPath,
  getBaselinePath,
  getBaselinePrevPath,
  getDiffReportPath,
  getMigrationReportPath,
  // Legacy paths (for migration compatibility)
  LEGACY_BASELINE_FILE,
  LEGACY_BASELINE_PREV_FILE,
  LEGACY_SNAPSHOT_FILE,
  LEGACY_MIGRATION_FILE,
  LEGACY_DIFF_REPORT_FILE,
  LEGACY_MIGRATION_REPORT_FILE,
  LEGACY_MIGRATION_CONFIG_FILE,
  LEGACY_TOKEN_SPLIT_CONFIG_FILE,
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

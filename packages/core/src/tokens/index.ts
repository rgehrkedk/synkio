/**
 * Token Utilities - Barrel Export
 */

// Parser utilities
export {
  parseVariableId,
  extractVariableId,
  pathToArray,
  arrayToPath,
  isToken,
  isLegacyToken,
  countTokens,
} from './parser';

// Transform utilities
export {
  transformCase,
  pathToTokenName,
  escapeRegex,
  getJsonFile,
  getJsonPath,
  transformToken,
  transformNestedTokens,
} from './transform';

// Apply utilities (for modifying token files)
export {
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  updateTokenInFile,
  deleteTokenFromFile,
  renameTokenInFile,
  bulkUpdateTokensInFile,
  toFileFormat,
  findTokenByVariableId,
} from './apply';

export type { TokenFileEntry } from './apply';

// Split utilities (for splitting baseline into token files)
export {
  extractCollections,
  analyzeCollections,
  splitTokens,
  previewSplit,
} from './split';

export type { SplitResult } from './split';

// Migration utilities - Scan only (no file modifications)
export {
  // Legacy CSS-specific
  pathChangeToReplacement,
  buildReplacements,
  findCssFiles,
  scanCssUsages,
  applyCssReplacements,
  printMigrationSummary,
  // Platform-agnostic scan
  buildPlatformTokenName,
  pathChangeToTokenReplacement,
  buildPlatformReplacements,
  findPlatformFiles,
  scanPlatformUsages,
  scanAllPlatforms,
} from './migrate';

// Report generation (isolated)
export {
  generateMigrationReport,
  generateMultiPlatformDiffReport,
} from './report-generator';

export type {
  CssReplacement,
  CssFileMatch,
  MigrationResult,
  TokenReplacement,
  // Note: FileMatch is exported from lib/types to avoid duplicate export
  PlatformScanResult,
} from './migrate';

// Apply migrations (isolated - modifies source files)
export {
  applyPlatformReplacements,
  applyAllPlatformReplacements,
} from './apply-migrations';

export type {
  PlatformMigrationResult,
  ApplyOptions,
} from './apply-migrations';

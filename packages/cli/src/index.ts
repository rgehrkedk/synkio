/**
 * Synkio CLI - Programmatic API
 *
 * This module exports the core functionality of Synkio for programmatic usage.
 * You can use these exports to integrate Synkio into your build tools or custom workflows.
 */

// Commands
export { pullCommand, pullWatchCommand } from './cli/commands/pull.js';
export type { PullOptions, PullResult } from './cli/commands/pull.js';

export { buildCommand } from './cli/commands/build.js';
export type { BuildOptions, BuildResult } from './cli/commands/build.js';

export { diffCommand } from './cli/commands/diff.js';
export type { DiffOptions } from './cli/commands/diff.js';

export { initCommand } from './cli/commands/init.js';
export type { InitOptions } from './cli/commands/init.js';

export { docsCommand } from './cli/commands/docs.js';
export type { DocsOptions } from './cli/commands/docs.js';

export { validateCommand } from './cli/commands/validate.js';

export { rollbackCommand } from './cli/commands/rollback.js';

export { importCommand } from './cli/commands/import.js';
export type { ImportOptions } from './cli/commands/import.js';

// Config
export {
  loadConfig,
  findConfigFile,
  updateConfigWithCollectionRenames,
  CONFIG_FILE,
  ConfigSchema,
} from './core/config.js';
export type { Config } from './core/config.js';

// Types
export type {
  BaselineData,
  BaselineEntry,
  ComparisonResult,
  ValueChange,
  PathChange,
  NewVariable,
  DeletedVariable,
  ModeRename,
  ModeChange,
  CollectionRename,
  RawTokens,
} from './types/index.js';

// Comparison utilities
export {
  compareBaselines,
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
  generateDiffReport,
  printDiffSummary,
} from './core/compare.js';

// Figma client
export { FigmaClient } from './core/figma.js';
export type { FigmaClientOptions } from './core/figma.js';

// Baseline management
export {
  readBaseline,
  writeBaseline,
  readPreviousBaseline,
} from './core/baseline.js';

// Token processing
export {
  splitTokens,
  normalizePluginData,
} from './core/tokens.js';
export type { SplitTokensOptions } from './core/tokens.js';

// Figma native import
export {
  parseFigmaNativeExport,
  parseFigmaNativeFiles,
  isFigmaNativeFormat,
} from './core/figma-native.js';
export type { ParseFigmaNativeOptions, ParsedFigmaNativeFile } from './core/figma-native.js';

// Output generation
export {
  generateIntermediateFromBaseline,
  generateDocsFromBaseline,
  generateCssFromBaseline,
  hasBuildConfig,
  getBuildStepsSummary,
} from './core/output.js';

// Documentation generation
export { generateDocs } from './core/docs/index.js';

// Logger
export { createLogger } from './utils/logger.js';
export type { Logger } from './utils/logger.js';

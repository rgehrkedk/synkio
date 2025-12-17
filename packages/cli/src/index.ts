/**
 * Synkio CLI - Programmatic API
 *
 * This module exports the core functionality of Synkio for programmatic usage.
 * You can use these exports to integrate Synkio into your build tools or custom workflows.
 */

// Commands
export { syncCommand, watchCommand } from './cli/commands/sync.js';
export type { SyncOptions } from './cli/commands/sync.js';

export { initCommand } from './cli/commands/init.js';
export type { InitOptions } from './cli/commands/init.js';

export { docsCommand } from './cli/commands/docs.js';
export type { DocsOptions } from './cli/commands/docs.js';

export { validateCommand } from './cli/commands/validate.js';

export { rollbackCommand } from './cli/commands/rollback.js';

// Config
export {
  loadConfig,
  findConfigFile,
  updateConfigWithCollectionRenames,
  DEFAULT_CONFIG_FILE,
  CONFIG_FILES,
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

// Output generation
export {
  generateAllFromBaseline,
  generateWithStyleDictionary,
  isStyleDictionaryAvailable,
} from './core/output.js';

// Documentation generation
export { generateDocs } from './core/docs/index.js';

// Logger
export { createLogger } from './utils/logger.js';
export type { Logger } from './utils/logger.js';

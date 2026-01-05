/**
 * Tokens Module
 *
 * Facade for token processing functionality.
 * Re-exports all public APIs for backward compatibility.
 */

// Main token functions (from parent tokens.ts)
export {
  splitTokens,
  splitStyles,
  normalizePluginData,
  normalizeStyleData,
  hasStyles,
  getStyleCount,
  parseVariableId,
  mapToDTCGType,
  type RawTokens,
  type SplitTokenFile,
  type SplitTokens,
  type CollectionSplitOptions,
  type SplitTokensOptions,
  type SplitStyleFile,
  type SplitStyles,
  type StyleTypeConfig,
  type StylesSplitOptions,
  type MergeInto,
  type StyleType,
} from '../tokens.js';

// Split strategies
export {
  determineSplitStrategy,
  getFileKey,
  getNestedPath,
  type SplitResult,
  type SplitStrategyOptions,
} from './split-strategies.js';

// Reference resolver
export {
  buildVariableIdLookup,
  resolveReference,
  isReference,
  type RefValue,
} from './reference-resolver.js';

// Token builder
export {
  buildTokenObject,
  buildFigmaExtensions,
  getDTCGKeys,
  type TokenBuildOptions,
  type DTCGKeys,
} from './token-builder.js';

// Filename generator
export {
  generateFilename,
  extractModeFromKey,
  extractCollectionFromKey,
  type FileData,
} from './filename-generator.js';

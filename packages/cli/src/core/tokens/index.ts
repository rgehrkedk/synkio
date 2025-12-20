/**
 * Tokens Module
 *
 * Facade for token processing functionality.
 * Re-exports all public APIs for backward compatibility.
 */

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

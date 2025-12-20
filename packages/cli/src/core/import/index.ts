/**
 * Import Module
 *
 * Facade for import functionality.
 * Re-exports all public APIs from the import sub-modules.
 */

// Source resolution
export {
  resolveImportSources,
  resolveFromPath,
  resolveFromConfig,
  type ImportFile,
  type ResolveSourcesOptions,
  type ResolveSourcesResult,
} from './source-resolver.js';

// Validation
export {
  validateImportFiles,
  isFigmaNativeFormat,
  formatInvalidFormatError,
  type ValidationResult,
} from './validator.js';

// Parsing
export {
  parseImportFiles,
  buildBaselineData,
  groupFilesByCollection,
  getBaselineSummary,
  type ParseOptions,
  type ParseResult,
} from './parser.js';

// File generation
export {
  generateOutputFiles,
  buildSplitOptions,
  buildFilesByDirectory,
  formatExtrasString,
  type GenerateFilesResult,
} from './file-generator.js';

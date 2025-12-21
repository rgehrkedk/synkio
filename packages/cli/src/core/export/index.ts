/**
 * Export Module
 *
 * Facade for export functionality.
 * Re-exports all public APIs from the export sub-modules.
 */

// File discovery
export {
  discoverTokenFiles,
  extractModeFromFile,
  extractGroupFromFile,
  type DiscoveredFile,
  type DiscoveryResult,
  type CollectionConfig,
} from './file-discoverer.js';

// Token parsing
export {
  parseTokenFile,
  parseMultiModeFile,
  type ParsedToken,
  type ParseResult,
} from './token-parser.js';

// Baseline building
export {
  buildBaselineKey,
  buildBaselineEntry,
  buildExportBaseline,
  type BaselineEntry,
  type ExportBaseline,
} from './baseline-builder.js';

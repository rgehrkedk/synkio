/**
 * Compare Module
 *
 * Facade for comparison functionality.
 * Re-exports all public APIs for backward compatibility.
 */

// Collection matching
export {
  matchCollectionsById,
  matchCollectionsByHeuristic,
  buildCollectionMaps,
  buildModesByCollection,
  hasIdBasedMatching,
  type CollectionInfo,
  type CollectionMatchResult,
} from './collection-matcher.js';

// Variable comparison
export {
  compareTokens,
  detectDeletedVariables,
  buildBaselineByVarId,
  type TokenComparisonResult,
} from './variable-comparator.js';

// Utility functions
export {
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
  type ChangeCounts,
} from './utils.js';

// Report generation
export {
  generateDiffReport,
  generateSummaryTable,
  generateValueChangesSection,
  generatePathChangesSection,
  generateCollectionRenamesSection,
  generateModeRenamesSection,
  generateNewModesSection,
  generateDeletedModesSection,
  generateNewVariablesSection,
  generateDeletedVariablesSection,
  type ReportMetadata,
} from './report-generator.js';

// Console display
export {
  printDiffSummary,
  printCountsSummary,
  printBreakingChangesDetails,
  printNewVariables,
  printValueChanges,
} from './console-display.js';

/**
 * Sync Module
 *
 * Facade for sync functionality.
 * Re-exports all public APIs from the sync sub-modules.
 */

// Regenerate flow
export {
  regenerateFromBaseline,
  buildFilesByDirectory,
  type RegenerateOptions,
  type RegenerateResult,
} from './regenerate.js';

// Style merging
export {
  mergeStylesIntoTokens,
  determineTargetFile,
  type MergeResult,
  type StandaloneStyleFile,
} from './style-merger.js';

// Breaking changes
export {
  shouldBlockSync,
  displayBreakingChanges,
  formatBreakingChangesSummary,
} from './breaking-changes.js';

// Display utilities
export {
  displaySyncSummary,
  displayValueChanges,
  displayNewVariables,
  displayNewModes,
  displayStyleChanges,
  displayDiscoveredCollections,
  displayDiscoveredStyles,
  displayCompletionMessage,
  displaySyncComplete,
  displayAdditionalOutputs,
  displayDocsLocation,
  formatExtrasString,
  type CompletionExtras,
  type ChangeCounts,
  type StyleChangeCounts,
} from './display.js';

// File writing
export {
  writeTokenFiles,
  cleanupStaleFiles,
  cleanupAllStaleFiles,
  writeStandaloneStyleFiles,
  ensureDirectories,
  type StandaloneStyleFile as FileWriterStyleFile,
} from './file-writer.js';

// Build runner
export {
  runBuildScript,
  shouldRunBuild,
  runBuildPipeline,
  type ScriptResult,
  type BuildResult,
  type Spinner,
} from './build-runner.js';

// Pipeline
export {
  executeSyncPipeline,
  type SyncOptions,
  type SyncPipelineResult,
} from './pipeline.js';

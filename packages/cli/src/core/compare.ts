/**
 * Baseline Comparison Logic
 *
 * Compares two baselines and categorizes changes.
 * This module serves as the main entry point and orchestrator,
 * delegating to specialized sub-modules for specific tasks.
 */

import type {
  BaselineData,
  BaselineEntry,
  ComparisonResult,
  StyleBaselineEntry,
  StyleComparisonResult,
  RawStyles,
} from '../types/index.js';

// Import from extracted modules
import {
  matchCollectionsById,
  matchCollectionsByHeuristic,
  hasIdBasedMatching,
} from './compare/collection-matcher.js';

import {
  compareTokens,
  detectDeletedVariables,
  buildBaselineByVarId,
} from './compare/variable-comparator.js';

// Re-export utility functions from extracted modules
export {
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
} from './compare/utils.js';

export {
  generateDiffReport,
} from './compare/report-generator.js';

export {
  printDiffSummary,
  displayPathComparisonResult,
} from './compare/console-display.js';

export {
  compareBaselinesByPath,
  baselineHasIds,
  hasPathChanges,
  type PathComparisonResult,
  type PathMatch,
  type PathValueChange,
} from './compare/path-comparison.js';

/**
 * Compare two baselines and return categorized changes
 *
 * Uses ID-based matching when both baselines have IDs, otherwise falls back to heuristic matching.
 *
 * @param baseline - Previous baseline data
 * @param fetched - Newly fetched baseline data
 * @returns ComparisonResult with all detected changes
 */
export function compareBaselines(baseline: BaselineData, fetched: BaselineData): ComparisonResult {
  // Handle nested baseline structure
  const rawBaseline = baseline.baseline || {};
  const rawFetched = fetched.baseline || {};

  const baselineEntries: Record<string, BaselineEntry> = (rawBaseline as any).baseline || rawBaseline;
  const fetchedEntries: Record<string, BaselineEntry> = (rawFetched as any).baseline || rawFetched;

  // Determine matching strategy
  const useIdBasedMatching = hasIdBasedMatching(baselineEntries) && hasIdBasedMatching(fetchedEntries);

  // Match collections and modes
  const matchResult = useIdBasedMatching
    ? matchCollectionsById(baselineEntries, fetchedEntries)
    : matchCollectionsByHeuristic(baselineEntries, fetchedEntries);

  // Build lookup map for baseline entries
  const baselineByVarId = buildBaselineByVarId(baselineEntries);

  // Compare tokens (values, paths, new variables)
  const tokenResult = compareTokens(baselineByVarId, fetchedEntries, matchResult.renamedModes);

  // Detect deleted variables
  const deletedModeSet = new Set(matchResult.deletedModes.map(m => `${m.collection}:${m.mode}`));
  const deletedVariables = detectDeletedVariables(
    baselineEntries,
    fetchedEntries,
    deletedModeSet,
    matchResult.renamedModes
  );

  // Combine results
  return {
    valueChanges: tokenResult.valueChanges,
    pathChanges: tokenResult.pathChanges,
    collectionRenames: matchResult.collectionRenames,
    modeRenames: matchResult.modeRenames,
    newModes: matchResult.newModes,
    deletedModes: matchResult.deletedModes,
    newVariables: tokenResult.newVariables,
    deletedVariables,
  };
}

/**
 * Compare two style baselines and return categorized changes
 * Uses styleId for ID-based matching to distinguish renames from deletions
 */
export function compareStyleBaselines(
  baseline: RawStyles | undefined,
  fetched: RawStyles | undefined
): StyleComparisonResult {
  const result: StyleComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    newStyles: [],
    deletedStyles: [],
  };

  // Handle undefined/empty cases
  if (!baseline && !fetched) return result;
  baseline ??= {};
  fetched ??= {};

  // Build lookup by styleId for ID-based matching
  const baselineByStyleId = new Map<string, StyleBaselineEntry>();
  const fetchedByStyleId = new Map<string, StyleBaselineEntry>();

  for (const entry of Object.values(baseline)) {
    baselineByStyleId.set(entry.styleId, entry);
  }

  for (const entry of Object.values(fetched)) {
    fetchedByStyleId.set(entry.styleId, entry);
  }

  // Compare fetched against baseline to find changes and new styles
  for (const [styleId, fetchedEntry] of fetchedByStyleId) {
    const baselineEntry = baselineByStyleId.get(styleId);

    if (!baselineEntry) {
      // New style
      result.newStyles.push({
        styleId,
        path: fetchedEntry.path,
        value: fetchedEntry.value,
        styleType: fetchedEntry.type,
      });
      continue;
    }

    // Compare path (rename detection)
    const pathChanged = baselineEntry.path !== fetchedEntry.path;
    if (pathChanged) {
      result.pathChanges.push({
        styleId,
        oldPath: baselineEntry.path,
        newPath: fetchedEntry.path,
        value: fetchedEntry.value,
        styleType: fetchedEntry.type,
      });
    }

    // Compare value (check even if path changed - both can happen simultaneously)
    if (JSON.stringify(baselineEntry.value) !== JSON.stringify(fetchedEntry.value)) {
      result.valueChanges.push({
        styleId,
        path: fetchedEntry.path,
        oldValue: baselineEntry.value,
        newValue: fetchedEntry.value,
        styleType: fetchedEntry.type,
      });
    }
  }

  // Check for deleted styles (in baseline but not in fetched)
  for (const [styleId, baselineEntry] of baselineByStyleId) {
    if (!fetchedByStyleId.has(styleId)) {
      result.deletedStyles.push({
        styleId,
        path: baselineEntry.path,
        value: baselineEntry.value,
        styleType: baselineEntry.type,
      });
    }
  }

  return result;
}

/**
 * Check if there are any style changes
 */
export function hasStyleChanges(result: StyleComparisonResult): boolean {
  return (
    result.valueChanges.length > 0 ||
    result.pathChanges.length > 0 ||
    result.newStyles.length > 0 ||
    result.deletedStyles.length > 0
  );
}

/**
 * Check if there are breaking style changes
 * Breaking = path changes (renames) and deletions
 */
export function hasBreakingStyleChanges(result: StyleComparisonResult): boolean {
  return (
    result.pathChanges.length > 0 ||
    result.deletedStyles.length > 0
  );
}

/**
 * Get style change counts summary
 */
export function getStyleChangeCounts(result: StyleComparisonResult) {
  return {
    valueChanges: result.valueChanges.length,
    pathChanges: result.pathChanges.length,
    newStyles: result.newStyles.length,
    deletedStyles: result.deletedStyles.length,
    total:
      result.valueChanges.length +
      result.pathChanges.length +
      result.newStyles.length +
      result.deletedStyles.length,
    breaking:
      result.pathChanges.length +
      result.deletedStyles.length,
  };
}

/**
 * Print style diff summary to console
 */
export function printStyleDiffSummary(result: StyleComparisonResult): void {
  const counts = getStyleChangeCounts(result);

  console.log('\n' + '-'.repeat(60));
  console.log('  Style Changes');
  console.log('-'.repeat(60) + '\n');

  if (!hasStyleChanges(result)) {
    console.log('  No style changes detected.\n');
    return;
  }

  console.log(`  Value changes:        ${counts.valueChanges}`);
  console.log(`  Path changes:         ${counts.pathChanges} ${counts.pathChanges > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New styles:           ${counts.newStyles}`);
  console.log(`  Deleted styles:       ${counts.deletedStyles} ${counts.deletedStyles > 0 ? '(BREAKING)' : ''}`);
  console.log('');
  console.log(`  Total style changes: ${counts.total}`);

  if (counts.breaking > 0) {
    console.log(`  Breaking style changes: ${counts.breaking}`);
  }

  console.log('');

  // Show detailed breaking changes
  if (counts.breaking > 0) {
    console.log('  BREAKING STYLE CHANGES:\n');

    // Path changes (renames)
    if (result.pathChanges.length > 0) {
      console.log(`  Path changes (${result.pathChanges.length}):`);
      result.pathChanges.forEach(change => {
        console.log(`    ${change.oldPath}`);
        console.log(`      -> ${change.newPath} (${change.styleType})`);
      });
      console.log('');
    }

    // Deleted styles
    if (result.deletedStyles.length > 0) {
      console.log(`  Deleted styles (${result.deletedStyles.length}):`);
      result.deletedStyles.forEach(style => {
        console.log(`    - ${style.path} (${style.styleType})`);
      });
      console.log('');
    }
  }

  // Show new styles
  if (result.newStyles.length > 0) {
    console.log('  New styles:\n');
    result.newStyles.forEach(style => {
      console.log(`    + ${style.path} (${style.styleType})`);
    });
    console.log('');
  }

  // Show value changes
  if (result.valueChanges.length > 0) {
    console.log('  Value changes:\n');
    result.valueChanges.forEach(change => {
      console.log(`    ${change.path} (${change.styleType})`);
    });
    console.log('');
  }
}

/**
 * Console Display Module
 *
 * Handles formatting and printing comparison results to the console.
 */

import type { ComparisonResult } from '../../types/index.js';
import { hasChanges, getChangeCounts } from './utils.js';

/**
 * Print the full diff summary to console
 *
 * @param result - Comparison result to display
 */
export function printDiffSummary(result: ComparisonResult): void {
  const counts = getChangeCounts(result);

  console.log('\n' + '='.repeat(60));
  console.log('  Comparison Summary');
  console.log('='.repeat(60) + '\n');

  if (!hasChanges(result)) {
    console.log('  No changes detected.\n');
    return;
  }

  printCountsSummary(counts);
  printBreakingChangesDetails(result, counts);
  printNewVariables(result.newVariables);
  printValueChanges(result.valueChanges);
}

/**
 * Print counts summary section
 *
 * @param counts - Change counts object
 */
export function printCountsSummary(counts: ReturnType<typeof getChangeCounts>): void {
  console.log(`  Value changes:        ${counts.valueChanges}`);
  console.log(`  Path changes:         ${counts.pathChanges} ${counts.pathChanges > 0 ? '(BREAKING)' : ''}`);
  console.log(`  Collection renames:   ${counts.collectionRenames} ${counts.collectionRenames > 0 ? '(BREAKING)' : ''}`);
  console.log(`  Mode renames:         ${counts.modeRenames} ${counts.modeRenames > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New modes:            ${counts.newModes} ${counts.newModes > 0 ? '(BREAKING)' : ''}`);
  console.log(`  Deleted modes:        ${counts.deletedModes} ${counts.deletedModes > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New variables:        ${counts.newVariables}`);
  console.log(`  Deleted variables:    ${counts.deletedVariables} ${counts.deletedVariables > 0 ? '(BREAKING)' : ''}`);
  console.log('');
  console.log(`  Total changes: ${counts.total}`);

  if (counts.breaking > 0) {
    console.log(`  Breaking changes: ${counts.breaking}`);
  }

  console.log('');
}

/**
 * Print breaking changes details section
 *
 * @param result - Comparison result
 * @param counts - Change counts object
 */
export function printBreakingChangesDetails(
  result: ComparisonResult,
  counts: ReturnType<typeof getChangeCounts>
): void {
  if (counts.breaking === 0) return;

  console.log('-'.repeat(60));
  console.log('  BREAKING CHANGES DETAILS');
  console.log('-'.repeat(60) + '\n');

  // Path changes
  if (result.pathChanges.length > 0) {
    console.log(`  Path changes (${result.pathChanges.length}):`);
    result.pathChanges.forEach((change) => {
      console.log(`    ${change.oldPath}`);
      console.log(`      -> ${change.newPath}`);
    });
    console.log('');
  }

  // Collection renames
  if (result.collectionRenames.length > 0) {
    console.log(`  Collection renames (${result.collectionRenames.length}):`);
    result.collectionRenames.forEach((rename) => {
      console.log(`    ${rename.oldCollection} -> ${rename.newCollection}`);
    });
    console.log('');
  }

  // Mode renames
  if (result.modeRenames.length > 0) {
    console.log(`  Mode renames (${result.modeRenames.length}):`);
    result.modeRenames.forEach((rename) => {
      console.log(`    ${rename.collection}: ${rename.oldMode} -> ${rename.newMode}`);
    });
    console.log('');
  }

  // New modes
  if (result.newModes.length > 0) {
    console.log(`  New modes (${result.newModes.length}):`);
    result.newModes.forEach((m) => {
      console.log(`    + ${m.collection}: ${m.mode}`);
    });
    console.log('');
  }

  // Deleted variables
  if (result.deletedVariables.length > 0) {
    console.log(`  Deleted variables (${result.deletedVariables.length}):`);
    result.deletedVariables.forEach((v) => {
      console.log(`    - ${v.path}`);
    });
    console.log('');
  }

  // Deleted modes
  if (result.deletedModes.length > 0) {
    console.log(`  Deleted modes (${result.deletedModes.length}):`);
    result.deletedModes.forEach((m) => {
      console.log(`    - ${m.collection}: ${m.mode}`);
    });
    console.log('');
  }
}

/**
 * Print new variables section
 *
 * @param newVariables - Array of new variables
 */
export function printNewVariables(
  newVariables: ComparisonResult['newVariables']
): void {
  if (newVariables.length === 0) return;

  console.log('-'.repeat(60));
  console.log('  New variables');
  console.log('-'.repeat(60) + '\n');
  newVariables.forEach((v) => {
    console.log(`    + ${v.path} (${v.type})`);
  });
  console.log('');
}

/**
 * Print value changes section
 *
 * @param valueChanges - Array of value changes
 */
export function printValueChanges(
  valueChanges: ComparisonResult['valueChanges']
): void {
  if (valueChanges.length === 0) return;

  console.log('-'.repeat(60));
  console.log('  Value changes');
  console.log('-'.repeat(60) + '\n');
  valueChanges.forEach((change) => {
    console.log(`    ${change.path}`);
    console.log(`      ${JSON.stringify(change.oldValue)} -> ${JSON.stringify(change.newValue)}`);
  });
  console.log('');
}

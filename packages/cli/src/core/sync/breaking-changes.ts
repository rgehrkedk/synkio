/**
 * Breaking Changes Module
 *
 * Handles detection and display of breaking changes during sync.
 * Breaking changes include: path renames, deletions, collection/mode renames.
 */

import chalk from 'chalk';
import type { ComparisonResult, StyleComparisonResult } from '../../types/index.js';
import { hasBreakingChanges, hasBreakingStyleChanges } from '../compare.js';

/**
 * Check if sync should be blocked due to breaking changes
 *
 * @param result - Variable comparison result
 * @param styleResult - Style comparison result
 * @param force - Whether --force flag was passed
 * @returns true if sync should be blocked
 */
export function shouldBlockSync(
  result: ComparisonResult,
  styleResult: StyleComparisonResult,
  force: boolean
): boolean {
  if (force) {
    return false;
  }

  return hasBreakingChanges(result) || hasBreakingStyleChanges(styleResult);
}

/**
 * Format a summary of breaking changes for display
 *
 * @param result - Variable comparison result
 * @param styleResult - Style comparison result
 * @returns Array of formatted summary lines
 */
export function formatBreakingChangesSummary(
  result: ComparisonResult,
  styleResult: StyleComparisonResult
): string[] {
  const summary: string[] = [];

  if (result.pathChanges.length > 0) {
    summary.push(`Path changes: ${result.pathChanges.length}`);
  }

  if (result.collectionRenames.length > 0) {
    summary.push(`Collection renames: ${result.collectionRenames.length}`);
  }

  if (result.modeRenames.length > 0) {
    summary.push(`Mode renames: ${result.modeRenames.length}`);
  }

  if (result.newModes.length > 0) {
    summary.push(`New modes: ${result.newModes.length}`);
  }

  if (result.deletedVariables.length > 0) {
    summary.push(`Deleted variables: ${result.deletedVariables.length}`);
  }

  if (result.deletedModes.length > 0) {
    summary.push(`Deleted modes: ${result.deletedModes.length}`);
  }

  // Style breaking changes
  if (styleResult.pathChanges.length > 0) {
    summary.push(`Style path changes: ${styleResult.pathChanges.length}`);
  }

  if (styleResult.deletedStyles.length > 0) {
    summary.push(`Deleted styles: ${styleResult.deletedStyles.length}`);
  }

  return summary;
}

/**
 * Display path changes with truncation
 */
function displayPathChanges(pathChanges: ComparisonResult['pathChanges']): void {
  console.log(chalk.red(`  Path changes: ${pathChanges.length}`));
  pathChanges.slice(0, 5).forEach(change => {
    console.log(chalk.dim(`    ${change.oldPath} -> ${change.newPath}`));
  });
  if (pathChanges.length > 5) {
    console.log(chalk.dim(`    ... and ${pathChanges.length - 5} more`));
  }
}

/**
 * Display collection renames
 */
function displayCollectionRenames(renames: ComparisonResult['collectionRenames']): void {
  console.log(chalk.red(`  Collection renames: ${renames.length}`));
  renames.forEach(rename => {
    console.log(chalk.dim(`    ${rename.oldCollection} -> ${rename.newCollection}`));
  });
}

/**
 * Display mode renames
 */
function displayModeRenames(renames: ComparisonResult['modeRenames']): void {
  console.log(chalk.red(`  Mode renames: ${renames.length}`));
  renames.forEach(rename => {
    console.log(chalk.dim(`    ${rename.collection}: ${rename.oldMode} -> ${rename.newMode}`));
  });
}

/**
 * Display new modes
 */
function displayNewModes(newModes: ComparisonResult['newModes']): void {
  const newModesStr = newModes.map(m => `${m.collection}:${m.mode}`).join(', ');
  console.log(chalk.red(`  New modes: ${newModesStr}`));
}

/**
 * Display deleted variables with truncation
 */
function displayDeletedVariables(deletedVariables: ComparisonResult['deletedVariables']): void {
  console.log(chalk.red(`  Deleted variables: ${deletedVariables.length}`));
  deletedVariables.slice(0, 5).forEach(v => {
    console.log(chalk.dim(`    - ${v.path}`));
  });
  if (deletedVariables.length > 5) {
    console.log(chalk.dim(`    ... and ${deletedVariables.length - 5} more`));
  }
}

/**
 * Display deleted modes
 */
function displayDeletedModes(deletedModes: ComparisonResult['deletedModes']): void {
  const deletedModesStr = deletedModes.map(m => `${m.collection}:${m.mode}`).join(', ');
  console.log(chalk.red(`  Deleted modes: ${deletedModesStr}`));
}

/**
 * Display style path changes with truncation
 */
function displayStylePathChanges(pathChanges: StyleComparisonResult['pathChanges']): void {
  console.log(chalk.red(`  Style path changes: ${pathChanges.length}`));
  pathChanges.slice(0, 5).forEach(change => {
    console.log(chalk.dim(`    ${change.oldPath} -> ${change.newPath} (${change.styleType})`));
  });
  if (pathChanges.length > 5) {
    console.log(chalk.dim(`    ... and ${pathChanges.length - 5} more`));
  }
}

/**
 * Display deleted styles with truncation
 */
function displayDeletedStyles(deletedStyles: StyleComparisonResult['deletedStyles']): void {
  console.log(chalk.red(`  Deleted styles: ${deletedStyles.length}`));
  deletedStyles.slice(0, 5).forEach(s => {
    console.log(chalk.dim(`    - ${s.path} (${s.styleType})`));
  });
  if (deletedStyles.length > 5) {
    console.log(chalk.dim(`    ... and ${deletedStyles.length - 5} more`));
  }
}

/**
 * Display all breaking changes to the console
 *
 * @param result - Variable comparison result
 * @param styleResult - Style comparison result
 */
export function displayBreakingChanges(
  result: ComparisonResult,
  styleResult: StyleComparisonResult
): void {
  console.log(chalk.yellow('\n  BREAKING CHANGES DETECTED\n'));

  // Variable breaking changes
  if (result.pathChanges.length > 0) {
    displayPathChanges(result.pathChanges);
  }

  if (result.collectionRenames.length > 0) {
    displayCollectionRenames(result.collectionRenames);
  }

  if (result.modeRenames.length > 0) {
    displayModeRenames(result.modeRenames);
  }

  if (result.newModes.length > 0) {
    displayNewModes(result.newModes);
  }

  if (result.deletedVariables.length > 0) {
    displayDeletedVariables(result.deletedVariables);
  }

  if (result.deletedModes.length > 0) {
    displayDeletedModes(result.deletedModes);
  }

  // Style breaking changes
  if (styleResult.pathChanges.length > 0) {
    displayStylePathChanges(styleResult.pathChanges);
  }

  if (styleResult.deletedStyles.length > 0) {
    displayDeletedStyles(styleResult.deletedStyles);
  }

  console.log(chalk.yellow('\n  These changes may break your code.\n'));
  console.log(`  Run ${chalk.cyan('synkio sync --force')} to apply anyway.`);
  console.log(`  Run ${chalk.cyan('synkio sync --preview')} to see full details.\n`);
}

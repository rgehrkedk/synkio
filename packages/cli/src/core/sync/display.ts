/**
 * Sync Display Module
 *
 * Handles console output formatting for sync operations.
 * Consolidates scattered console.log statements from sync.ts.
 */

import chalk from 'chalk';
import type {
  ValueChange,
  NewVariable,
  ModeChange,
  StyleComparisonResult,
} from '../../types/index.js';

/**
 * Extras for completion message formatting
 */
export interface CompletionExtras {
  styleFilesWritten?: number;
  buildScriptRan?: boolean;
  cssFilesWritten?: number;
  docsFilesWritten?: number;
}

/**
 * Change counts from comparison - accepts any object with total
 */
export interface ChangeCounts {
  total: number;
}

/**
 * Style change counts - accepts any object with total
 */
export interface StyleChangeCounts {
  total: number;
}

/**
 * Format extras string for completion messages
 *
 * @param extras - Extra files/operations to include
 * @returns Formatted string like " (+ 2 style, 3 CSS)"
 */
export function formatExtrasString(extras: CompletionExtras): string {
  const parts: string[] = [];

  if (extras.styleFilesWritten && extras.styleFilesWritten > 0) {
    parts.push(`${extras.styleFilesWritten} style`);
  }

  if (extras.buildScriptRan) {
    parts.push('build script');
  }

  if (extras.cssFilesWritten && extras.cssFilesWritten > 0) {
    parts.push(`${extras.cssFilesWritten} CSS`);
  }

  if (extras.docsFilesWritten && extras.docsFilesWritten > 0) {
    parts.push(`${extras.docsFilesWritten} docs`);
  }

  return parts.length > 0 ? ` (+ ${parts.join(', ')})` : '';
}

/**
 * Display sync summary with change counts
 *
 * @param counts - Variable change counts
 * @param styleCounts - Style change counts
 */
export function displaySyncSummary(counts: ChangeCounts, styleCounts: StyleChangeCounts): void {
  const totalChanges = counts.total + styleCounts.total;
  console.log(chalk.cyan(`\n  Syncing ${totalChanges} change(s)...\n`));
}

/**
 * Display value changes with truncation
 *
 * @param changes - Array of value changes
 * @param limit - Maximum items to display before truncation
 */
export function displayValueChanges(changes: ValueChange[], limit: number = 5): void {
  if (changes.length === 0) return;

  console.log(chalk.dim(`  Value changes (${changes.length}):`));
  changes.slice(0, limit).forEach(change => {
    console.log(chalk.dim(`    ${change.path}: ${JSON.stringify(change.oldValue)} -> ${JSON.stringify(change.newValue)}`));
  });
  if (changes.length > limit) {
    console.log(chalk.dim(`    ... and ${changes.length - limit} more`));
  }
}

/**
 * Display new variables with truncation
 *
 * @param variables - Array of new variables
 * @param limit - Maximum items to display before truncation
 */
export function displayNewVariables(variables: NewVariable[], limit: number = 5): void {
  if (variables.length === 0) return;

  console.log(chalk.green(`  New variables (${variables.length}):`));
  variables.slice(0, limit).forEach(v => {
    console.log(chalk.green(`    + ${v.path}`));
  });
  if (variables.length > limit) {
    console.log(chalk.dim(`    ... and ${variables.length - limit} more`));
  }
}

/**
 * Display new modes
 *
 * @param newModes - Array of new modes
 */
export function displayNewModes(newModes: ModeChange[]): void {
  if (newModes.length === 0) return;

  const newModesStr = newModes.map(m => `${m.collection}:${m.mode}`).join(', ');
  console.log(chalk.green(`  New modes: ${newModesStr}`));
}

/**
 * Display style changes
 *
 * @param styleResult - Style comparison result
 */
export function displayStyleChanges(styleResult: StyleComparisonResult): void {
  // Style value changes
  if (styleResult.valueChanges.length > 0) {
    console.log(chalk.dim(`  Style value changes (${styleResult.valueChanges.length}):`));
    styleResult.valueChanges.slice(0, 3).forEach(change => {
      console.log(chalk.dim(`    ${change.path} (${change.styleType})`));
    });
    if (styleResult.valueChanges.length > 3) {
      console.log(chalk.dim(`    ... and ${styleResult.valueChanges.length - 3} more`));
    }
  }

  // New styles
  if (styleResult.newStyles.length > 0) {
    console.log(chalk.green(`  New styles (${styleResult.newStyles.length}):`));
    styleResult.newStyles.slice(0, 5).forEach(s => {
      console.log(chalk.green(`    + ${s.path} (${s.styleType})`));
    });
    if (styleResult.newStyles.length > 5) {
      console.log(chalk.dim(`    ... and ${styleResult.newStyles.length - 5} more`));
    }
  }
}

/**
 * Display discovered collections during first sync
 *
 * @param collections - Array of discovered collections with modes
 */
export function displayDiscoveredCollections(
  collections: Array<{ name: string; modes: string[] }>
): void {
  console.log(chalk.cyan('\n  Collections from Figma:'));
  for (const col of collections) {
    const modeStr = col.modes.length === 1
      ? `1 mode: ${col.modes[0]}`
      : `${col.modes.length} modes: ${col.modes.join(', ')}`;
    console.log(chalk.dim(`    - ${col.name} (${modeStr})`));
  }
}

/**
 * Display discovered styles during first sync
 *
 * @param styleCounts - Counts of each style type
 */
export function displayDiscoveredStyles(
  styleCounts: { paint: number; text: number; effect: number }
): void {
  console.log(chalk.cyan('\n  Styles from Figma:'));
  if (styleCounts.paint > 0) console.log(chalk.dim(`    - Paint styles: ${styleCounts.paint}`));
  if (styleCounts.text > 0) console.log(chalk.dim(`    - Text styles: ${styleCounts.text}`));
  if (styleCounts.effect > 0) console.log(chalk.dim(`    - Effect styles: ${styleCounts.effect}`));
}

/**
 * Display completion message
 *
 * @param filesWritten - Number of token files written
 * @param extras - Additional files/operations
 */
export function displayCompletionMessage(
  filesWritten: number,
  extras: CompletionExtras
): void {
  const extrasStr = formatExtrasString(extras);
  console.log(chalk.green(`  Wrote ${filesWritten} token files.${extrasStr}`));
}

/**
 * Display sync complete message (with optional report path)
 *
 * @param filesWritten - Number of token files written
 * @param styleFilesWritten - Number of style files written
 * @param reportPath - Optional path to generated report
 */
export function displaySyncComplete(
  filesWritten: number,
  styleFilesWritten: number,
  reportPath?: string
): void {
  const filesSummary = styleFilesWritten > 0
    ? `${filesWritten} token + ${styleFilesWritten} style files`
    : `${filesWritten} token files`;

  if (reportPath) {
    console.log(chalk.green(`Sync complete. Wrote ${filesSummary}. Report: ${reportPath}`));
  } else {
    console.log(chalk.green(`Sync complete. Wrote ${filesSummary}.`));
  }
}

/**
 * Display additional outputs summary
 *
 * @param buildScriptRan - Whether build script ran
 * @param cssFilesWritten - Number of CSS files generated
 * @param tokensDir - Directory where files were written
 */
export function displayAdditionalOutputs(
  buildScriptRan: boolean,
  cssFilesWritten: number,
  tokensDir: string
): void {
  const allOutputs = [
    buildScriptRan ? 'build script' : null,
    cssFilesWritten > 0 ? `${cssFilesWritten} CSS` : null,
  ].filter(Boolean);

  if (allOutputs.length > 0) {
    console.log(chalk.dim(`  + ${allOutputs.join(', ')} file(s) in ${tokensDir}`));
  }
}

/**
 * Display docs location
 *
 * @param docsDir - Directory where docs were generated
 */
export function displayDocsLocation(docsDir: string): void {
  console.log(chalk.dim(`  Documentation: ${docsDir}`));
}

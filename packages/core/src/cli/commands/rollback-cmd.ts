/**
 * Rollback Command (Modern)
 *
 * Restore previous baseline with confirmation prompt.
 * Uses modern CLI UX with spinners and colored output.
 */

import chalk from 'chalk';
import { initContext } from '../../context.js';
import type { TokensConfig } from '../../types/index.js';
import {
  loadConfigOrThrow,
  loadBaseline,
  restoreBaseline,
  getBaselinePath,
} from '../../files/index.js';
import {
  compareBaselines,
  hasChanges,
  getChangeCounts,
} from '../../compare/index.js';
import {
  formatSuccess,
  formatWarning,
  formatInfo,
  createSpinner,
  createTable,
} from '../utils.js';
import { askYesNo, createPrompt } from '../prompt.js';

// ============================================================================
// Types
// ============================================================================

interface RollbackOptions {
  force?: boolean;
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Rollback command handler
 */
export async function rollbackCommand(options: RollbackOptions = {}): Promise<void> {
  // Initialize context
  initContext({ rootDir: process.cwd() });

  // Load config
  let config: TokensConfig;
  try {
    config = loadConfigOrThrow();
  } catch (error) {
    throw new Error(
      `Configuration not found.\n\nRun 'synkio init' to create a configuration file.`
    );
  }

  // Check if previous baseline exists
  const previousBaseline = loadBaseline(config.paths.baselinePrev);
  if (!previousBaseline) {
    throw new Error(
      'No previous baseline found.\n\nA previous baseline is created automatically when you run \'synkio sync\'.'
    );
  }

  // Load current baseline
  const currentBaseline = loadBaseline(getBaselinePath());
  if (!currentBaseline) {
    console.log(formatWarning('No current baseline found. Nothing to rollback.'));
    return;
  }

  // Compare to show what will change
  const spinner = createSpinner('Analyzing changes...');
  spinner.start();

  const result = compareBaselines(currentBaseline, previousBaseline);
  spinner.succeed('Analysis complete');

  // Show changes
  if (!hasChanges(result)) {
    console.log(formatInfo('Current and previous baselines are identical. No rollback needed.'));
    return;
  }

  const counts = getChangeCounts(result);
  console.log('\nRolling back will:');
  if (result.newVariables.length > 0) {
    console.log(chalk.red(`  - Remove ${result.newVariables.length} token(s)`));
  }
  if (result.deletedVariables.length > 0) {
    console.log(chalk.green(`  + Restore ${result.deletedVariables.length} token(s)`));
  }
  if (result.valueChanges.length > 0) {
    console.log(chalk.yellow(`  ~ Revert ${result.valueChanges.length} modification(s)`));
  }
  if (result.pathChanges.length > 0) {
    console.log(chalk.cyan(`  → Reverse ${result.pathChanges.length} rename(s)`));
  }
  console.log(chalk.bold(`  = ${counts.total} total changes\n`));

  // Show details in table
  const changes: Array<{ path: string; currentValue: any; previousValue: any; type: string }> = [];

  // Collect all changes
  changes.push(...result.valueChanges.map(c => ({
    path: c.path,
    currentValue: c.newValue,
    previousValue: c.oldValue,
    type: 'modified',
  })));

  changes.push(...result.pathChanges.map(c => ({
    path: c.newPath,
    currentValue: c.newPath,
    previousValue: c.oldPath,
    type: 'renamed',
  })));

  changes.push(...result.newVariables.map(c => ({
    path: c.path,
    currentValue: c.value,
    previousValue: null,
    type: 'added',
  })));

  changes.push(...result.deletedVariables.map(c => ({
    path: c.path,
    currentValue: null,
    previousValue: c.value,
    type: 'removed',
  })));

  const displayCount = Math.min(changes.length, 10);
  const rows = changes.slice(0, displayCount).map(change => {
    const currentValue = String(change.currentValue || '-');
    const previousValue = String(change.previousValue || '-');
    const type = change.type;

    return [
      change.path,
      currentValue.substring(0, 30),
      previousValue.substring(0, 30),
      type,
    ];
  });

  const table = createTable(
    ['Token Path', 'Current Value', 'Previous Value', 'Type'],
    rows
  );

  console.log(table.toString());

  if (changes.length > displayCount) {
    console.log(chalk.gray(`\n... and ${changes.length - displayCount} more changes`));
  }

  // Confirm unless --force
  if (!options.force) {
    const rl = createPrompt();
    try {
      const proceed = await askYesNo(rl, '\nProceed with rollback?', false);
      if (!proceed) {
        console.log(formatWarning('Rollback cancelled. No changes made.'));
        return;
      }
    } finally {
      rl.close();
    }
  }

  // Perform rollback
  const rollbackSpinner = createSpinner('Rolling back...');
  rollbackSpinner.start();

  try {
    restoreBaseline();
    rollbackSpinner.succeed('Rollback complete');
  } catch (error) {
    rollbackSpinner.fail('Rollback failed');
    throw new Error(
      `Failed to rollback: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  console.log(formatSuccess(`Rollback successful!\n\nRestored previous baseline with ${counts.total} change(s).\n\nRun 'synkio sync' to rebuild token files from the restored baseline.`));
}

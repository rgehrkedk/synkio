/**
 * Figma Rollback
 *
 * Restore tokens to previous state (before last sync).
 * Note: CSS file replacements cannot be rolled back - use git for that.
 *
 * Usage:
 *   npm run figma:rollback
 */

import { execSync } from 'child_process';

import {
  loadConfigOrThrow,
  loadBaseline,
  loadBaselinePrev,
  restoreBaseline,
  fileExists,
  BASELINE_FILE,
  BASELINE_PREV_FILE,
} from '../lib/files';

import { splitTokens } from '../lib/tokens';
import { compareBaselines, getChangeCounts, printDiffSummary } from '../lib/compare';
import { createPrompt, askYesNo } from '../lib/cli';

/**
 * Build CSS from token files
 */
function buildCss(): boolean {
  try {
    console.log('\nBuilding CSS...');
    execSync('npm run tokens:build', { stdio: 'inherit' });
    return true;
  } catch {
    console.log('\nWarning: CSS build failed. Run "npm run tokens:build" manually.');
    return false;
  }
}

/**
 * Main rollback function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  Figma Token Rollback');
  console.log('='.repeat(60) + '\n');

  // Check for previous baseline
  if (!fileExists(BASELINE_PREV_FILE)) {
    console.log('No previous baseline found.');
    console.log(`Expected: ${BASELINE_PREV_FILE}\n`);
    console.log('Nothing to rollback. Run "npm run figma:sync" first.\n');
    process.exit(0);
  }

  // Load config
  const config = loadConfigOrThrow();

  // Load baselines
  const currentBaseline = loadBaseline();
  const previousBaseline = loadBaselinePrev();

  if (!currentBaseline || !previousBaseline) {
    console.log('Failed to load baseline files.\n');
    process.exit(1);
  }

  // Show what will be restored
  console.log('Current baseline:');
  if (currentBaseline.$metadata) {
    console.log(`  File: ${currentBaseline.$metadata.fileName}`);
    console.log(`  Date: ${currentBaseline.$metadata.exportedAt}`);
  }
  console.log();

  console.log('Previous baseline (will be restored):');
  if (previousBaseline.$metadata) {
    console.log(`  File: ${previousBaseline.$metadata.fileName}`);
    console.log(`  Date: ${previousBaseline.$metadata.exportedAt}`);
  }
  console.log();

  // Compare to show what will change
  const result = compareBaselines(currentBaseline, previousBaseline);
  const counts = getChangeCounts(result);

  if (counts.total === 0) {
    console.log('Baselines are identical. Nothing to rollback.\n');
    process.exit(0);
  }

  console.log('Rolling back will:');
  printDiffSummary(result);

  // Warn about CSS
  console.log('Note: CSS file replacements (if any were made) cannot be');
  console.log('      automatically rolled back. Use "git restore" if needed.\n');

  // Confirm
  const rl = createPrompt();

  try {
    const proceed = await askYesNo(
      rl,
      `Rollback to previous baseline from ${previousBaseline.$metadata?.exportedAt || 'unknown date'}?`,
      false
    );

    if (!proceed) {
      console.log('\nRollback cancelled.\n');
      process.exit(0);
    }

    // Restore baseline
    console.log('\nRestoring baseline...');
    const restored = restoreBaseline();

    if (!restored) {
      console.log('Failed to restore baseline.\n');
      process.exit(1);
    }

    console.log(`  ${BASELINE_PREV_FILE} → ${BASELINE_FILE}`);

    // Re-split tokens
    console.log('\nRe-splitting tokens...');
    const splitResult = splitTokens(previousBaseline, config);
    console.log(`  ${splitResult.filesWritten} files written`);

    // Build CSS
    buildCss();

    console.log('\n' + '='.repeat(60));
    console.log('  Rollback Complete!');
    console.log('='.repeat(60) + '\n');

    console.log(`Restored to baseline from: ${previousBaseline.$metadata?.exportedAt || 'unknown'}`);
    console.log('\nIf CSS replacements were made during sync, use:');
    console.log('  git restore <file>  # restore specific files');
    console.log('  git checkout -- .   # restore all changes\n');

  } finally {
    rl.close();
  }
}

main();

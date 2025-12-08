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

import { initContext, getContext } from '../../context.js';
import {
  loadConfigOrThrow,
  loadBaseline,
  loadBaselinePrev,
  restoreBaseline,
  fileExists,
  getBaselinePath,
  getBaselinePrevPath,
} from '../../files/index.js';

import { splitTokens } from '../../tokens/index.js';
import { compareBaselines, getChangeCounts, printDiffSummary } from '../../compare/index.js';
import { createPrompt, askYesNo } from '../prompt.js';

/**
 * Build CSS from token files
 */
function buildCss(): boolean {
  const ctx = getContext();
  try {
    ctx.logger.info('\nBuilding CSS...');
    execSync('npm run tokens:build', { stdio: 'inherit' });
    return true;
  } catch {
    ctx.logger.warn('\nWarning: CSS build failed. Run "npm run tokens:build" manually.');
    return false;
  }
}

/**
 * Main rollback function
 */
async function main() {
  // Initialize context
  initContext({ rootDir: process.cwd() });
  const ctx = getContext();

  ctx.logger.info('\n' + '='.repeat(60));
  ctx.logger.info('  Figma Token Rollback');
  ctx.logger.info('='.repeat(60) + '\n');

  // Check for previous baseline
  if (!fileExists(getBaselinePrevPath())) {
    ctx.logger.info('No previous baseline found.');
    ctx.logger.info(`Expected: ${getBaselinePrevPath()}\n`);
    ctx.logger.info('Nothing to rollback. Run "npm run figma:sync" first.\n');
    process.exit(0);
  }

  // Load config
  const config = loadConfigOrThrow();

  // Load baselines
  const currentBaseline = loadBaseline();
  const previousBaseline = loadBaselinePrev();

  if (!currentBaseline || !previousBaseline) {
    ctx.logger.error('Failed to load baseline files.\n');
    process.exit(1);
  }

  // Show what will be restored
  ctx.logger.info('Current baseline:');
  if (currentBaseline.$metadata) {
    ctx.logger.info(`  File: ${currentBaseline.$metadata.fileName}`);
    ctx.logger.info(`  Date: ${currentBaseline.$metadata.exportedAt}`);
  }
  ctx.logger.info('');

  ctx.logger.info('Previous baseline (will be restored):');
  if (previousBaseline.$metadata) {
    ctx.logger.info(`  File: ${previousBaseline.$metadata.fileName}`);
    ctx.logger.info(`  Date: ${previousBaseline.$metadata.exportedAt}`);
  }
  ctx.logger.info('');

  // Compare to show what will change
  const result = compareBaselines(currentBaseline, previousBaseline);
  const counts = getChangeCounts(result);

  if (counts.total === 0) {
    ctx.logger.info('Baselines are identical. Nothing to rollback.\n');
    process.exit(0);
  }

  ctx.logger.info('Rolling back will:');
  printDiffSummary(result);

  // Warn about CSS
  ctx.logger.info('Note: CSS file replacements (if any were made) cannot be');
  ctx.logger.info('      automatically rolled back. Use "git restore" if needed.\n');

  // Confirm
  const rl = createPrompt();

  try {
    const proceed = await askYesNo(
      rl,
      `Rollback to previous baseline from ${previousBaseline.$metadata?.exportedAt || 'unknown date'}?`,
      false
    );

    if (!proceed) {
      ctx.logger.info('\nRollback cancelled.\n');
      process.exit(0);
    }

    // Restore baseline
    ctx.logger.info('\nRestoring baseline...');
    const restored = restoreBaseline();

    if (!restored) {
      ctx.logger.error('Failed to restore baseline.\n');
      process.exit(1);
    }

    ctx.logger.info(`  ${getBaselinePrevPath()} → ${getBaselinePath()}`);

    // Re-split tokens
    ctx.logger.info('\nRe-splitting tokens...');
    const splitResult = splitTokens(previousBaseline, config);
    ctx.logger.info(`  ${splitResult.filesWritten} files written`);

    // Build CSS
    buildCss();

    ctx.logger.info('\n' + '='.repeat(60));
    ctx.logger.info('  Rollback Complete!');
    ctx.logger.info('='.repeat(60) + '\n');

    ctx.logger.info(`Restored to baseline from: ${previousBaseline.$metadata?.exportedAt || 'unknown'}`);
    ctx.logger.info('\nIf CSS replacements were made during sync, use:');
    ctx.logger.info('  git restore <file>  # restore specific files');
    ctx.logger.info('  git checkout -- .   # restore all changes\n');

  } finally {
    rl.close();
  }
}

main();

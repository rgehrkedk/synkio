/**
 * Sync Command
 *
 * Thin orchestrator for sync operations.
 * Delegates business logic to core/sync modules.
 */

import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../../core/config.js';
import { FigmaClient } from '../../core/figma.js';
import { normalizePluginData } from '../../core/tokens.js';
import { createLogger } from '../../utils/logger.js';
import { filterPhantomModes } from '../../utils/figma.js';
import { readBaseline } from '../../core/baseline.js';
import { compareBaselines, hasChanges, hasBreakingChanges, printDiffSummary } from '../../core/compare.js';
import type { BaselineData } from '../../types/index.js';
import {
  executeSyncPipeline,
  formatExtrasString,
  type SyncOptions,
} from '../../core/sync/index.js';
import { openFolder } from '../utils.js';

// Re-export SyncOptions for backward compatibility
export type { SyncOptions };

/**
 * Main sync command - thin orchestrator
 *
 * Responsibilities:
 * - CLI argument handling
 * - Spinner management
 * - Error handling and exit codes
 *
 * Business logic delegated to executeSyncPipeline()
 */
export async function syncCommand(options: SyncOptions = {}) {
  const spinner = ora('Syncing design tokens...').start();

  try {
    const result = await executeSyncPipeline(options, spinner);

    // Handle preview mode (no files written)
    if (options.preview) {
      return;
    }

    // Build success message
    const extras = formatExtrasString({
      styleFilesWritten: result.styleFilesWritten,
      buildScriptRan: result.buildScriptRan,
      cssFilesWritten: result.cssFilesWritten,
      docsFilesWritten: result.docsFilesWritten,
    });

    // Show appropriate message
    if (options.regenerate) {
      spinner.succeed(chalk.green(`Regenerated ${result.filesWritten} token files from baseline.${extras}`));
    } else if (result.reportPath) {
      const filesSummary = result.styleFilesWritten > 0
        ? `${result.filesWritten} token + ${result.styleFilesWritten} style files`
        : `${result.filesWritten} token files`;
      spinner.succeed(chalk.green(`Sync complete. Wrote ${filesSummary}. Report: ${result.reportPath}`));
    } else if (result.hasChanges) {
      spinner.succeed(chalk.green(`Sync complete. Wrote ${result.filesWritten} token files.${extras}`));
    } else if (result.filesWritten > 0) {
      spinner.succeed(chalk.green(`No changes from Figma. Regenerated ${result.filesWritten} token files.${extras}`));
    } else {
      spinner.succeed(chalk.green(`Initial sync complete. Wrote ${result.filesWritten} token files.${extras}`));
    }

    // Open docs folder if --open flag was passed and docs were generated
    if (options.open && result.docsDir) {
      try {
        await openFolder(result.docsDir);
        console.log(chalk.dim(`  Opened ${result.docsDir}`));
      } catch {
        console.log(chalk.yellow(`  Could not open folder: ${result.docsDir}`));
      }
    }

  } catch (error: any) {
    // Check for blocking breaking changes
    if (error.message?.includes('breaking changes')) {
      // Breaking changes already displayed by pipeline
      process.exit(1);
    }

    spinner.fail(chalk.red(`Sync failed: ${error.message}`));
    const logger = createLogger();
    logger.error('Sync failed', { error });
    process.exit(1);
  }
}

/**
 * Watch mode - poll Figma for changes at regular intervals
 */
export async function watchCommand(options: SyncOptions = {}) {
  const interval = (options.interval || 30) * 1000;
  const logger = createLogger();

  console.log(chalk.cyan(`\n  Watching for changes (every ${options.interval || 30}s)\n`));
  console.log(chalk.dim('  Press Ctrl+C to stop\n'));

  let lastBaseline: BaselineData | undefined = undefined;
  let isRunning = true;

  process.on('SIGINT', () => {
    isRunning = false;
    console.log(chalk.dim('\n\n  Watch stopped.\n'));
    process.exit(0);
  });

  try {
    const config = loadConfig(options.config);
    const timeout = options.timeout ? options.timeout * 1000 : undefined;
    const figmaClient = new FigmaClient({ ...config.figma, logger, timeout });

    lastBaseline = await readBaseline();

    if (lastBaseline) {
      console.log(chalk.dim(`  Baseline loaded. Last sync: ${lastBaseline.metadata.syncedAt}\n`));
    } else {
      console.log(chalk.yellow('  No baseline found. Running initial sync...\n'));
      await syncCommand({ ...options, watch: false });
      lastBaseline = await readBaseline();
    }

    while (isRunning) {
      const checkTime = new Date().toLocaleTimeString();
      process.stdout.write(chalk.dim(`  [${checkTime}] Checking Figma... `));

      try {
        const rawData = await figmaClient.fetchData();
        let normalizedTokens = normalizePluginData(rawData);
        normalizedTokens = filterPhantomModes(normalizedTokens);

        const newBaseline: BaselineData = {
          baseline: normalizedTokens,
          metadata: { syncedAt: new Date().toISOString() },
        };

        if (lastBaseline) {
          const result = compareBaselines(lastBaseline, newBaseline);

          if (hasChanges(result)) {
            process.stdout.write(chalk.green('Changes detected!\n\n'));

            if (hasBreakingChanges(result) && !options.force) {
              console.log(chalk.yellow('  Breaking changes detected. Use --force to apply.\n'));
              printDiffSummary(result);
              console.log('');
            } else {
              await syncCommand({ ...options, watch: false });
              lastBaseline = await readBaseline();
              console.log('');
            }
          } else {
            process.stdout.write(chalk.dim('No changes\n'));
          }
        }
      } catch (err: any) {
        process.stdout.write(chalk.red(`Error: ${err.message}\n`));
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  } catch (error: any) {
    console.error(chalk.red(`\n  Watch failed: ${error.message}\n`));
    logger.error('Watch failed', { error });
    process.exit(1);
  }
}

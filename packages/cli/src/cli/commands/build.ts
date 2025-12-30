/**
 * Build Command
 *
 * Builds token files from a baseline file (default or custom).
 * Used for the GitHub PR workflow where export-baseline.json is committed.
 *
 * Unlike sync --regenerate:
 * - Can read from custom baseline path (--from option)
 * - Shows diff comparison if current baseline exists
 * - Warns on breaking changes but doesn't block (assumes PR already reviewed)
 * - Updates baseline.json after building
 */

import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { readFile, access } from 'node:fs/promises';
import { loadConfig } from '../../core/config.js';
import { readBaseline, writeBaseline } from '../../core/baseline.js';
import { compareBaselines, hasChanges, hasBreakingChanges, printDiffSummary } from '../../core/compare.js';
import type { BaselineData } from '../../types/index.js';
import {
  regenerateFromBaseline,
  shouldRunBuild,
  runBuildPipeline,
  formatExtrasString,
  type Spinner,
} from '../../core/sync/index.js';
import { createLogger } from '../../utils/logger.js';
import { openFolder } from '../utils.js';

/**
 * Options for the build command
 */
export interface BuildOptions {
  from?: string;        // Custom baseline path (default: .synkio/baseline.json)
  config?: string;      // Config file path
  verbose?: boolean;    // Show detailed output
  preview?: boolean;    // Show what would change without applying
  open?: boolean;       // Open docs folder after build (if docs enabled)
}

/**
 * Build command - build token files from baseline
 *
 * Workflow:
 * 1. Load baseline from --from path or default .synkio/baseline.json
 * 2. Compare with current baseline (if exists)
 * 3. Show diff and warn on breaking changes (don't block)
 * 4. Regenerate token files using config
 * 5. Update baseline.json
 * 6. Run build pipeline (if configured)
 *
 * @param options - Build command options
 */
export async function buildCommand(options: BuildOptions = {}) {
  const spinner = ora('Building tokens...').start();
  const logger = createLogger();

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    const config = loadConfig(options.config);
    logger.debug('Config loaded', config);

    // 2. Determine baseline path
    const defaultBaselinePath = resolve(process.cwd(), '.synkio', 'baseline.json');
    const baselinePath = options.from
      ? resolve(process.cwd(), options.from)
      : defaultBaselinePath;

    // Validate baseline file exists
    try {
      await access(baselinePath);
    } catch {
      spinner.fail(chalk.red(`Baseline file not found: ${baselinePath}`));
      console.log(chalk.dim('\nRun one of:'));
      console.log(chalk.dim('  synkio sync                           - Fetch from Figma'));
      console.log(chalk.dim('  synkio export-baseline                - Export from token files'));
      process.exit(1);
    }

    // 3. Read source baseline
    spinner.text = `Reading baseline from ${baselinePath.replace(process.cwd() + '/', '')}...`;
    const sourceBaselineContent = await readFile(baselinePath, 'utf-8');
    const sourceBaseline: BaselineData = JSON.parse(sourceBaselineContent);
    logger.debug(`Loaded baseline with ${Object.keys(sourceBaseline.baseline || {}).length} tokens`);

    // 4. Read current baseline (if exists)
    const currentBaseline = await readBaseline();

    // 5. Compare and show diff if current baseline exists
    let hasBaselineChanges = false;
    if (currentBaseline && !options.preview) {
      spinner.text = 'Comparing with current baseline...';
      const result = compareBaselines(currentBaseline, sourceBaseline);
      hasBaselineChanges = hasChanges(result);

      if (hasBaselineChanges) {
        spinner.stop();
        console.log(chalk.cyan('\nChanges from current baseline:\n'));
        printDiffSummary(result);

        // Warn on breaking changes (but don't block)
        if (hasBreakingChanges(result)) {
          console.log(chalk.yellow('\n⚠️  Breaking changes detected:'));

          if (result.deletedVariables.length > 0) {
            console.log(chalk.yellow(`  - ${result.deletedVariables.length} deleted token(s)`));
            result.deletedVariables.slice(0, 3).forEach(v => {
              console.log(chalk.dim(`    • ${v.path}`));
            });
            if (result.deletedVariables.length > 3) {
              console.log(chalk.dim(`    ... and ${result.deletedVariables.length - 3} more`));
            }
          }

          if (result.pathChanges.length > 0) {
            console.log(chalk.yellow(`  - ${result.pathChanges.length} renamed token(s)`));
            result.pathChanges.slice(0, 3).forEach(c => {
              console.log(chalk.dim(`    • ${c.oldPath} → ${c.newPath}`));
            });
            if (result.pathChanges.length > 3) {
              console.log(chalk.dim(`    ... and ${result.pathChanges.length - 3} more`));
            }
          }

          if (result.deletedModes.length > 0) {
            console.log(chalk.yellow(`  - ${result.deletedModes.length} deleted mode(s)`));
          }

          // Check if SYNC_REPORT.md exists and reference it
          const syncReportPath = resolve(process.cwd(), '.synkio', 'SYNC_REPORT.md');
          try {
            await access(syncReportPath);
            console.log(chalk.dim('\n  Review .synkio/SYNC_REPORT.md for details.'));
          } catch {
            // SYNC_REPORT.md doesn't exist, that's ok
          }
        }

        console.log('');
        spinner.start('Building tokens...');
      }
    }

    // 6. Preview mode - show what would be built and exit
    if (options.preview) {
      spinner.stop();
      console.log(chalk.cyan('\nPreview Mode - No changes will be applied\n'));

      if (currentBaseline) {
        const result = compareBaselines(currentBaseline, sourceBaseline);
        printDiffSummary(result);
      } else {
        console.log(chalk.dim('No current baseline exists. This would be an initial build.\n'));
        console.log(chalk.dim(`Baseline contains ${Object.keys(sourceBaseline.baseline || {}).length} tokens`));
      }

      return;
    }

    // 7. Regenerate token files from baseline
    spinner.text = 'Generating token files...';
    const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
    const regenerateResult = await regenerateFromBaseline(sourceBaseline, config, { defaultOutDir });
    logger.debug(`Wrote ${regenerateResult.filesWritten} token files`);

    // 8. Update baseline.json (this is the key difference from sync --regenerate)
    if (options.from && options.from !== defaultBaselinePath) {
      spinner.text = 'Updating baseline.json...';
      await writeBaseline(sourceBaseline);
      logger.debug('Updated baseline.json');
    }

    // 9. Run build pipeline if configured
    spinner.stop();
    const runBuild = await shouldRunBuild(config, options);

    let buildScriptRan = false;
    let cssFilesWritten = 0;

    if (runBuild) {
      spinner.start('Running build pipeline...');
      const buildResult = await runBuildPipeline(sourceBaseline, config, spinner);
      buildScriptRan = buildResult.scriptRan;
      cssFilesWritten = buildResult.cssFilesWritten;
    }

    // 10. Build success message
    const extras = formatExtrasString({
      styleFilesWritten: regenerateResult.styleFilesWritten,
      buildScriptRan,
      cssFilesWritten,
      docsFilesWritten: regenerateResult.docsFilesWritten,
    });

    const sourceName = options.from
      ? baselinePath.replace(process.cwd() + '/', '')
      : 'baseline.json';

    if (currentBaseline && hasBaselineChanges) {
      spinner.succeed(chalk.green(`Built ${regenerateResult.filesWritten} token files from ${sourceName}.${extras}`));
      if (options.from && options.from !== defaultBaselinePath) {
        console.log(chalk.dim(`  Updated .synkio/baseline.json`));
      }
    } else if (currentBaseline) {
      spinner.succeed(chalk.green(`No changes. Rebuilt ${regenerateResult.filesWritten} token files from ${sourceName}.${extras}`));
    } else {
      spinner.succeed(chalk.green(`Built ${regenerateResult.filesWritten} token files from ${sourceName}.${extras}`));
    }

    // 11. Open docs folder if --open flag was passed and docs were generated
    if (options.open && config.docsPages?.enabled) {
      const docsDir = resolve(process.cwd(), config.docsPages.dir || '.synkio/docs');
      try {
        await openFolder(docsDir);
        console.log(chalk.dim(`  Opened ${docsDir.replace(process.cwd() + '/', '')}`));
      } catch {
        console.log(chalk.yellow(`  Could not open folder: ${docsDir.replace(process.cwd() + '/', '')}`));
      }
    }

  } catch (error: any) {
    spinner.fail(chalk.red(`Build failed: ${error.message}`));
    logger.error('Build failed', { error });
    process.exit(1);
  }
}

import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { loadConfig } from '../../core/config.js';
import { FigmaClient } from '../../core/figma.js';
import { splitTokens, CollectionSplitOptions } from '../../core/tokens.js';
import { createLogger } from '../../utils/logger.js';
import { readBaseline, writeBaseline } from '../../core/baseline.js';
import { compareBaselines, hasChanges, hasBreakingChanges, getChangeCounts, generateDiffReport, printDiffSummary } from '../../core/compare.js';
import { BaselineData } from '../../types/index.js';
import chalk from 'chalk';
import ora from 'ora';

export interface SyncOptions {
  force?: boolean;      // Bypass breaking change protection
  preview?: boolean;    // Show what would change, don't sync
  report?: boolean;     // Force generate markdown report
  noReport?: boolean;   // Force skip report generation
}

export async function syncCommand(options: SyncOptions = {}) {
  const logger = createLogger();
  const spinner = ora('Syncing design tokens...').start();

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    const config = loadConfig();
    logger.debug('Config loaded', config);

    // 2. Fetch data from Figma
    spinner.text = 'Fetching data from Figma...';
    const figmaClient = new FigmaClient({ ...config.figma, logger });
    const rawTokens = await figmaClient.fetchData();
    logger.debug('Figma data fetched');

    // 3. Read existing baseline for comparison
    const localBaseline = await readBaseline();
    
    // Build the new baseline object
    const newBaseline: BaselineData = {
      baseline: rawTokens,
      metadata: {
        syncedAt: new Date().toISOString(),
      },
    };

    // 4. Compare if we have a local baseline
    if (localBaseline) {
      spinner.text = 'Comparing with local tokens...';
      const result = compareBaselines(localBaseline, newBaseline);
      const counts = getChangeCounts(result);
      
      // No changes - nothing to do
      if (!hasChanges(result)) {
        spinner.succeed(chalk.green('✓ Already up to date. No changes detected.'));
        return;
      }

      // Preview mode - show changes and exit
      if (options.preview) {
        spinner.stop();
        console.log(chalk.cyan('\n  Preview Mode - No changes will be applied\n'));
        printDiffSummary(result);
        return;
      }

      // Breaking changes detected - block unless --force
      if (hasBreakingChanges(result) && !options.force) {
        spinner.stop();
        
        console.log(chalk.yellow('\n  ⚠️  BREAKING CHANGES DETECTED\n'));
        
        // Show breaking changes summary
        if (result.pathChanges.length > 0) {
          console.log(chalk.red(`  Path changes: ${result.pathChanges.length}`));
          result.pathChanges.slice(0, 5).forEach(change => {
            console.log(chalk.dim(`    ${change.oldPath} → ${change.newPath}`));
          });
          if (result.pathChanges.length > 5) {
            console.log(chalk.dim(`    ... and ${result.pathChanges.length - 5} more`));
          }
        }
        
        if (result.deletedVariables.length > 0) {
          console.log(chalk.red(`  Deleted variables: ${result.deletedVariables.length}`));
          result.deletedVariables.slice(0, 5).forEach(v => {
            console.log(chalk.dim(`    - ${v.path}`));
          });
          if (result.deletedVariables.length > 5) {
            console.log(chalk.dim(`    ... and ${result.deletedVariables.length - 5} more`));
          }
        }
        
        if (result.deletedModeNames.length > 0) {
          console.log(chalk.red(`  Deleted modes: ${result.deletedModeNames.join(', ')}`));
        }

        console.log(chalk.yellow('\n  These changes may break your code.\n'));
        console.log(`  Run ${chalk.cyan('synkio sync --force')} to apply anyway.`);
        console.log(`  Run ${chalk.cyan('synkio sync --preview')} to see full details.\n`);
        
        process.exit(1);
      }

      // Show summary of what will be synced
      spinner.stop();
      console.log(chalk.cyan(`\n  Syncing ${counts.total} change(s)...\n`));
      
      // Show value changes
      if (result.valueChanges.length > 0) {
        console.log(chalk.dim(`  Value changes (${result.valueChanges.length}):`));
        result.valueChanges.slice(0, 5).forEach(change => {
          console.log(chalk.dim(`    ${change.path}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`));
        });
        if (result.valueChanges.length > 5) {
          console.log(chalk.dim(`    ... and ${result.valueChanges.length - 5} more`));
        }
      }
      
      // Show new variables
      if (result.newVariables.length > 0) {
        console.log(chalk.green(`  New variables (${result.newVariables.length}):`));
        result.newVariables.slice(0, 5).forEach(v => {
          console.log(chalk.green(`    + ${v.path}`));
        });
        if (result.newVariables.length > 5) {
          console.log(chalk.dim(`    ... and ${result.newVariables.length - 5} more`));
        }
      }
      
      // Show new modes
      if (result.newModeNames.length > 0) {
        console.log(chalk.green(`  New modes: ${result.newModeNames.join(', ')}`));
      }
      
      console.log('');
    } else {
      spinner.info('No local baseline found. Performing initial sync.');
    }

    // 5. Write baseline
    spinner.start('Writing baseline...');
    await writeBaseline(newBaseline);

    // 6. Split tokens
    spinner.text = 'Processing tokens...';
    const splitOptions: CollectionSplitOptions = config.collections || {};
    const processedTokens = splitTokens(rawTokens.baseline, splitOptions);
    logger.debug(`${processedTokens.size} token sets processed`);

    // 7. Write files
    spinner.text = 'Writing token files...';
    const outDir = resolve(process.cwd(), config.output.dir);
    await mkdir(outDir, { recursive: true });

    let filesWritten = 0;
    for (const [fileName, content] of processedTokens) {
      const filePath = resolve(outDir, fileName);
      await writeFile(filePath, JSON.stringify(content, null, 2));
      filesWritten++;
    }

    // 8. Generate report based on config and flags
    // CLI flags override config: --report forces, --no-report skips
    const syncConfig = config.sync || { report: true, reportHistory: false };
    const shouldGenerateReport = options.noReport ? false : (options.report || syncConfig.report !== false);
    
    if (shouldGenerateReport && localBaseline) {
      const result = compareBaselines(localBaseline, newBaseline);
      
      // Only generate if there were actual changes
      if (hasChanges(result)) {
        const report = generateDiffReport(result, {
          fileName: config.figma.fileId,
          exportedAt: newBaseline.metadata.syncedAt,
        });
        
        const synkioDir = resolve(process.cwd(), '.synkio');
        await mkdir(synkioDir, { recursive: true });
        
        let reportPath: string;
        if (syncConfig.reportHistory) {
          // Timestamped reports for changelog history
          const reportsDir = resolve(synkioDir, 'reports');
          await mkdir(reportsDir, { recursive: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          reportPath = resolve(reportsDir, `${timestamp}.md`);
        } else {
          // Single report file, overwritten each sync
          reportPath = resolve(synkioDir, 'sync-report.md');
        }
        
        await writeFile(reportPath, report);
        const relativePath = reportPath.replace(process.cwd() + '/', '');
        spinner.succeed(chalk.green(`✓ Sync complete. Wrote ${filesWritten} token files. Report: ${relativePath}`));
        return;
      }
    }
    
    spinner.succeed(chalk.green(`✓ Sync complete. Wrote ${filesWritten} token files to ${config.output.dir}.`));

  } catch (error: any) {
    spinner.fail(chalk.red(`Sync failed: ${error.message}`));
    logger.error('Sync failed', { error });
    process.exit(1);
  }
}

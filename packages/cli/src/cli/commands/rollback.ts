import { mkdir, writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import { readPreviousBaseline, writeBaseline, readBaseline } from '../../core/baseline.js';
import { splitTokens } from '../../core/tokens.js';
import { compareBaselines, printDiffSummary, hasChanges } from '../../core/compare.js';
import { createLogger } from '../../utils/logger.js';
import { loadConfig } from '../../core/config.js';
import chalk from 'chalk';
import ora from 'ora';

interface RollbackOptions {
  preview?: boolean;
}

export async function rollbackCommand(options: RollbackOptions = {}) {
  const logger = createLogger();
  const spinner = ora('Checking rollback availability...').start();

  try {
    // 1. Read the previous baseline
    spinner.text = 'Reading previous baseline...';
    const prevBaseline = await readPreviousBaseline();

    if (!prevBaseline) {
      spinner.fail('No previous baseline found. Cannot rollback.');
      return;
    }

    // 2. If preview mode, show what would change
    if (options.preview) {
      spinner.stop();
      console.log(chalk.cyan('\n  Rollback Preview - No changes will be applied\n'));

      // Compare current vs previous to show what would change
      const currentBaseline = await readBaseline();
      if (currentBaseline) {
        const result = compareBaselines(currentBaseline, prevBaseline);

        if (!hasChanges(result)) {
          console.log(chalk.dim('  No differences between current and previous baseline.\n'));
        } else {
          console.log(chalk.dim('  Rolling back would restore these changes:\n'));
          printDiffSummary(result);
        }
      } else {
        console.log(chalk.dim('  No current baseline found. Rollback would restore the previous version.\n'));
      }

      // Show file count
      const processedTokens = splitTokens(prevBaseline.baseline);
      console.log(chalk.dim(`\n  Would restore ${processedTokens.size} token file(s).\n`));
      console.log(`  Run ${chalk.cyan('synkio rollback')} to apply.\n`);
      return;
    }

    // 3. Restore the previous baseline as the current one
    spinner.text = 'Restoring baseline...';
    await writeBaseline(prevBaseline);

    // 4. Re-write the token files from the restored baseline
    spinner.text = 'Writing token files...';
    const config = loadConfig();
    const rawTokens = prevBaseline.baseline;

    // Use new config structure: tokens.dir, tokens.collections, etc.
    const processedTokens = splitTokens(rawTokens, {
      collections: config.tokens.collections || {},
      dtcg: config.tokens.dtcg !== false,
      includeVariableId: config.tokens.includeVariableId === true,
      extensions: config.tokens.extensions || {},
    });

    const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
    await mkdir(defaultOutDir, { recursive: true });

    let filesWritten = 0;
    for (const [fileName, fileData] of processedTokens) {
      const outDir = fileData.dir
        ? resolve(process.cwd(), fileData.dir)
        : defaultOutDir;
      await mkdir(outDir, { recursive: true });
      const filePath = resolve(outDir, fileName);
      await writeFile(filePath, JSON.stringify(fileData.content, null, 2));
      filesWritten++;
    }

    spinner.succeed(chalk.green(`Rollback complete. Restored ${filesWritten} token files.`));

  } catch (error: any) {
    spinner.fail(chalk.red(`Rollback failed: ${error.message}`));
    logger.error('Rollback failed', { error });
    process.exit(1);
  }
}

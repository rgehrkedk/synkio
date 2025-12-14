import { mkdir, writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import { readPreviousBaseline, writeBaseline } from '../../core/baseline.js';
import { splitTokens } from '../../core/tokens.js';
import { createLogger } from '../../utils/logger.js';
import { loadConfig } from '../../core/config.js';
import chalk from 'chalk';
import ora from 'ora';

export async function rollbackCommand() {
  const logger = createLogger();
  const spinner = ora('Rolling back to the previous token version...').start();

  try {
    // 1. Read the previous baseline
    spinner.text = 'Reading previous baseline...';
    const prevBaseline = await readPreviousBaseline();

    if (!prevBaseline) {
      spinner.fail('No previous baseline found. Cannot rollback.');
      return;
    }

    // 2. Restore the previous baseline as the current one
    // The writeBaseline function handles moving the (now old) current to .prev,
    // so we are effectively swapping them.
    spinner.text = 'Restoring baseline...';
    await writeBaseline(prevBaseline);

    // 3. Re-write the token files from the restored baseline
    spinner.text = 'Writing token files...';
    const config = loadConfig(); // Need to load config to know the output dir
    const rawTokens = prevBaseline.baseline;
    const processedTokens = splitTokens(rawTokens);
    
    const outDir = resolve(process.cwd(), config.output.dir);
    await mkdir(outDir, { recursive: true });

    let filesWritten = 0;
    for (const [fileName, content] of processedTokens) {
      const filePath = resolve(outDir, fileName);
      await writeFile(filePath, JSON.stringify(content, null, 2));
      filesWritten++;
    }

    spinner.succeed(chalk.green(`✓ Rollback complete. Restored ${filesWritten} token files.`));

  } catch (error: any) {
    spinner.fail(chalk.red(`Rollback failed: ${error.message}`));
    logger.error('Rollback failed', { error });
    process.exit(1);
  }
}

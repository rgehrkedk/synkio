/**
 * Export Baseline Command
 *
 * Exports token files to baseline format for Figma plugin import.
 * Supports both code-first (no IDs) and roundtrip (with IDs) workflows.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../../core/config.js';
import { discoverTokenFiles, extractModeFromFile } from '../../core/export/file-discoverer.js';
import { parseTokenFile, parseMultiModeFile } from '../../core/export/token-parser.js';
import { buildExportBaseline } from '../../core/export/baseline-builder.js';
import { createLogger } from '../../utils/logger.js';

export interface ExportBaselineOptions {
  output?: string;
  config?: string;
  preview?: boolean;
  verbose?: boolean;
}

const DEFAULT_OUTPUT = '.synkio/export-baseline.json';

/**
 * Export baseline command - exports token files to baseline format
 */
export async function exportBaselineCommand(options: ExportBaselineOptions = {}): Promise<void> {
  const logger = createLogger();
  const spinner = ora('Exporting baseline...').start();
  const outputPath = options.output || DEFAULT_OUTPUT;

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    const config = loadConfig(options.config);

    if (!config.tokens?.collections || Object.keys(config.tokens.collections).length === 0) {
      spinner.fail(chalk.red('No collections configured'));
      console.error(chalk.dim('\nAdd collections to tokens.collections in synkio.config.json\n'));
      process.exit(1);
    }

    // 2. Discover token files
    spinner.text = 'Discovering token files...';
    const baseDir = process.cwd();
    const { files, errors: discoveryErrors } = await discoverTokenFiles(
      config.tokens.collections,
      baseDir
    );

    if (discoveryErrors.length > 0) {
      for (const err of discoveryErrors) {
        logger.warn(err);
      }
    }

    if (files.length === 0) {
      spinner.fail(chalk.red('No token files found'));
      console.error(chalk.dim('\nCheck that your token files exist in the configured directories\n'));
      process.exit(1);
    }

    if (options.verbose) {
      spinner.info(`Found ${files.length} token files`);
      spinner.start('Parsing token files...');
    } else {
      spinner.text = 'Parsing token files...';
    }

    // 3. Parse all files
    const parsedFiles: Array<{
      file: typeof files[0];
      tokens: Awaited<ReturnType<typeof parseTokenFile>>['tokens'];
      mode: string;
    }> = [];

    for (const file of files) {
      const { tokens, errors: parseErrors } = await parseTokenFile(file.path);

      if (parseErrors.length > 0) {
        for (const err of parseErrors) {
          logger.warn(`${file.filename}: ${err}`);
        }
      }

      // Check for multi-mode structure (includeMode: true)
      if (tokens.length === 0) {
        const content = JSON.parse(await readFile(file.path, 'utf-8'));
        const multiMode = parseMultiModeFile(content);

        if (multiMode.size > 0) {
          for (const [mode, modeTokens] of multiMode) {
            parsedFiles.push({ file, tokens: modeTokens, mode });
          }
          continue;
        }
      }

      const mode = extractModeFromFile(file, 'value');
      parsedFiles.push({ file, tokens, mode });

      if (options.verbose) {
        logger.info(`  ${file.filename}: ${tokens.length} tokens (mode: ${mode})`);
      }
    }

    // 4. Build baseline
    spinner.text = 'Building baseline...';
    const exportData = buildExportBaseline(parsedFiles);

    const tokenCount = Object.keys(exportData.baseline).length;
    const collections = new Set(
      Object.values(exportData.baseline).map(t => t.collection)
    );

    // 5. Output
    if (options.preview) {
      spinner.stop();
      console.log(JSON.stringify(exportData, null, 2));
      console.log('');
      console.log(chalk.cyan(`Preview: ${tokenCount} tokens from ${collections.size} collection(s)`));
    } else {
      spinner.text = 'Writing baseline...';
      await mkdir(dirname(resolve(outputPath)), { recursive: true });
      await writeFile(resolve(outputPath), JSON.stringify(exportData, null, 2));
      
      spinner.succeed(chalk.green('Baseline exported successfully!'));
      console.log('');
      console.log(chalk.dim('  Output:'), outputPath);
      console.log(chalk.dim('  Tokens:'), tokenCount);
      console.log(chalk.dim('  Collections:'), Array.from(collections).join(', '));
      console.log('');
      console.log(chalk.cyan('  Next steps:'));
      console.log(chalk.dim('    1. Open the Synkio plugin in Figma'));
      console.log(chalk.dim('    2. Import this baseline file'));
      console.log(chalk.dim('    3. Review the diff and click "Apply to Figma"'));
      console.log('');
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Export failed'));
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    logger.debug('Full error:', error);
    process.exit(1);
  }
}

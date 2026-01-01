/**
 * Diff Command
 *
 * Compares baseline.json with current token files on disk.
 * This is a read-only command that shows what would change if you ran `synkio build`.
 *
 * Use cases:
 * - CI/CD: Check if token files are in sync with baseline (exit code 1 if drift)
 * - Local: Preview what build would do without modifying files
 */

import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'node:fs/promises';
import { loadConfig } from '../../core/config.js';
import { readBaseline } from '../../core/baseline.js';
import { compareBaselines, hasChanges, hasBreakingChanges, printDiffSummary } from '../../core/compare.js';
import { discoverTokenFiles, extractModeFromFile, extractGroupFromFile } from '../../core/export/file-discoverer.js';
import { parseTokenFile, parseMultiModeFile, type ParsedToken } from '../../core/export/token-parser.js';
import { buildExportBaseline } from '../../core/export/baseline-builder.js';
import { createLogger } from '../../utils/logger.js';

/**
 * Options for the diff command
 */
export interface DiffOptions {
  config?: string;  // Config file path
}

/**
 * Add group prefix to token paths when splitBy is "group".
 *
 * When syncing Figma -> code with splitBy: "group", a token like `colors.yellow.50`
 * gets written to file `colors.json` with path `yellow.50` (the group becomes the filename).
 * When reading back, we need to add the group back as a prefix.
 */
function addGroupPrefixToTokens(tokens: ParsedToken[], groupPrefix: string): void {
  for (const token of tokens) {
    token.path = `${groupPrefix}.${token.path}`;
  }
}

/**
 * Diff command - compare baseline with current token files
 *
 * Read-only operation that:
 * 1. Loads baseline.json (what was synced from Figma)
 * 2. Reads current token files from disk
 * 3. Compares and reports differences
 * 4. Exits with code 1 if differences found (for CI)
 *
 * @param options - Diff command options
 */
export async function diffCommand(options: DiffOptions = {}): Promise<void> {
  const spinner = ora('Comparing baseline with token files...').start();
  const logger = createLogger();

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    const config = loadConfig(options.config);
    logger.debug('Config loaded');

    // 2. Read baseline.json
    spinner.text = 'Reading baseline.json...';
    const baseline = await readBaseline();

    if (!baseline) {
      spinner.fail(chalk.red('No baseline found'));
      console.log(chalk.dim('\nRun one of:'));
      console.log(chalk.dim('  synkio pull                           - Fetch from Figma'));
      console.log(chalk.dim('  synkio export-baseline                - Export from token files'));
      process.exit(2);
    }

    const baselineTokenCount = Object.keys(baseline.baseline || {}).length;
    logger.debug(`Baseline contains ${baselineTokenCount} tokens`);

    // 3. Check for collections config
    if (!config.tokens?.collections || Object.keys(config.tokens.collections).length === 0) {
      spinner.fail(chalk.red('No collections configured'));
      console.error(chalk.dim('\nAdd collections to tokens.collections in synkio.config.json'));
      process.exit(2);
    }

    // 4. Discover and parse token files
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
      console.error(chalk.dim('\nCheck that your token files exist in the configured directories'));
      process.exit(2);
    }

    logger.debug(`Found ${files.length} token files`);

    // 5. Parse all files into a baseline-like structure
    spinner.text = 'Parsing token files...';
    const parsedFiles: Array<{
      file: typeof files[0];
      tokens: ParsedToken[];
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
            // Add group prefix for splitBy: "group" collections
            const groupPrefix = extractGroupFromFile(file);
            if (groupPrefix) {
              addGroupPrefixToTokens(modeTokens, groupPrefix);
            }
            parsedFiles.push({ file, tokens: modeTokens, mode });
          }
          continue;
        }
      }

      // Add group prefix for splitBy: "group" collections
      const groupPrefix = extractGroupFromFile(file);
      if (groupPrefix) {
        addGroupPrefixToTokens(tokens, groupPrefix);
      }

      const mode = extractModeFromFile(file, 'value');
      parsedFiles.push({ file, tokens, mode });
    }

    // 6. Build baseline structure from parsed files
    spinner.text = 'Building comparison baseline...';
    const filesBaseline = buildExportBaseline(parsedFiles, {});

    const filesTokenCount = Object.keys(filesBaseline.baseline).length;
    logger.debug(`Token files contain ${filesTokenCount} tokens`);

    // 7. Compare baseline with files baseline
    spinner.text = 'Comparing...';

    // We compare baseline (source of truth from Figma) against files (what's on disk)
    // This shows: what's different between what Figma says and what files contain
    const result = compareBaselines(baseline, filesBaseline);

    // 8. Display results
    spinner.stop();

    if (!hasChanges(result)) {
      console.log(chalk.green('\nNo differences detected.'));
      console.log(chalk.dim(`Baseline and token files are in sync (${baselineTokenCount} tokens).`));
      console.log('');
      process.exit(0);
    }

    // There are differences
    console.log(chalk.yellow('\nDifferences detected between baseline and token files:\n'));
    printDiffSummary(result);

    // Summary message
    if (hasBreakingChanges(result)) {
      console.log(chalk.red('Breaking changes detected.'));
      console.log(chalk.dim('Run `synkio build` to apply baseline to token files.'));
    } else {
      console.log(chalk.yellow('Non-breaking changes detected.'));
      console.log(chalk.dim('Run `synkio build` to apply baseline to token files.'));
    }
    console.log('');

    // Exit with code 1 to indicate differences were found
    process.exit(1);

  } catch (error: any) {
    spinner.fail(chalk.red(`Diff failed: ${error.message}`));
    logger.error('Diff failed', { error });
    process.exit(2);
  }
}

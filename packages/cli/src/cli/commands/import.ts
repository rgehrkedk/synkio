import chalk from 'chalk';
import ora from 'ora';
import { readBaseline, writeBaseline } from '../../core/baseline.js';
import { compareBaselines, hasChanges, hasBreakingChanges, getChangeCounts, printDiffSummary } from '../../core/compare.js';
import { loadConfig } from '../../core/config.js';
import {
  resolveImportSources,
  validateImportFiles,
  parseImportFiles,
  buildBaselineData,
  generateOutputFiles,
  formatExtrasString,
} from '../../core/import/index.js';
import { createLogger } from '../../utils/logger.js';

export interface ImportOptions {
  /** Path to JSON file or directory containing JSON files (optional if using config) */
  path?: string;
  /** Collection name (required if not inferrable from file) */
  collection?: string;
  /** Mode name override */
  mode?: string;
  /** Preview changes without applying */
  preview?: boolean;
  /** Force import even with breaking changes */
  force?: boolean;
  /** Path to config file */
  config?: string;
}

/**
 * Import design tokens from Figma native JSON export files.
 *
 * Supports:
 * - Config-based: synkio import (uses import.sources from config)
 * - Single file: synkio import ./theme.light.json --collection=theme
 * - Directory: synkio import ./figma-exports/ --collection=theme
 * - Multiple modes: Automatically detects mode from file's $extensions
 */
export async function importCommand(options: ImportOptions): Promise<void> {
  const logger = createLogger();
  const spinner = ora('Importing design tokens...').start();

  try {
    // 1. Load config if available
    const config = loadConfigSafe(options.config);

    // 2. Resolve import sources
    spinner.text = 'Finding JSON files...';
    const sourceResult = await resolveImportSources(
      { path: options.path, collection: options.collection },
      config
    );

    if (sourceResult.error) {
      spinner.fail(chalk.red(sourceResult.error));
      process.exit(1);
    }

    const filesToImport = sourceResult.files;
    spinner.text = `Found ${filesToImport.length} JSON file(s)`;

    // 3. Validate files are Figma native format
    spinner.text = 'Validating file format...';
    const validation = validateImportFiles(filesToImport);

    if (!validation.valid) {
      spinner.fail(chalk.red(validation.errors[0]));
      process.exit(1);
    }

    // 4. Parse files to baseline
    spinner.text = 'Parsing tokens...';
    const parseResult = parseImportFiles(filesToImport, { mode: options.mode });
    logger.debug(`Parsed ${parseResult.tokenCount} token entries`);
    spinner.text = `Parsed ${parseResult.tokenCount} tokens (${parseResult.collections.size} collection(s), ${parseResult.modes.size} mode(s))`;

    // 5. Build new baseline
    const newBaseline = buildBaselineData(parseResult.baseline);

    // 6. Compare with existing baseline and handle preview/breaking changes
    const shouldContinue = await handleComparison(newBaseline, options, spinner);
    if (!shouldContinue) return;

    // 7. Write baseline (source: figma - importing from Figma's native JSON)
    spinner.start('Writing baseline...');
    await writeBaseline(newBaseline, 'figma');

    // 8. Generate output files if config exists
    if (config) {
      spinner.text = 'Generating output files...';
      const genResult = await generateOutputFiles(parseResult.baseline, newBaseline, config);
      const extrasStr = formatExtrasString(genResult.cssFilesWritten, genResult.docsFilesWritten);
      spinner.succeed(chalk.green(
        `Imported ${parseResult.tokenCount} tokens. Wrote ${genResult.filesWritten} files to ${genResult.outDir}.${extrasStr}`
      ));
    } else {
      spinner.succeed(chalk.green(
        `Imported ${parseResult.tokenCount} tokens from ${filesToImport.length} file(s).\n` +
        chalk.dim('  Run synkio build to generate output files.')
      ));
    }

    // Show summary
    console.log(chalk.dim(`\n  Collections: ${Array.from(parseResult.collections).join(', ')}`));
    console.log(chalk.dim(`  Modes: ${Array.from(parseResult.modes).join(', ')}\n`));

  } catch (error: any) {
    spinner.fail(chalk.red(`Import failed: ${error.message}`));
    logger.error('Import failed', { error });
    process.exit(1);
  }
}

/**
 * Load config safely, returning null if not found
 */
function loadConfigSafe(configPath?: string) {
  try {
    return loadConfig(configPath);
  } catch {
    return null;
  }
}

/**
 * Handle comparison with existing baseline, preview mode, and breaking changes
 * Returns true if import should continue, false if it should stop
 */
async function handleComparison(
  newBaseline: ReturnType<typeof buildBaselineData>,
  options: ImportOptions,
  spinner: ReturnType<typeof ora>
): Promise<boolean> {
  const localBaseline = await readBaseline();

  if (!localBaseline) {
    spinner.info('No existing baseline. Creating initial import.');
    return true;
  }

  spinner.text = 'Comparing with existing tokens...';
  const result = compareBaselines(localBaseline, newBaseline);
  const counts = getChangeCounts(result);

  // Preview mode
  if (options.preview) {
    spinner.stop();
    console.log(chalk.cyan('\n  Preview Mode - No changes will be applied\n'));
    if (hasChanges(result)) {
      printDiffSummary(result);
    } else {
      console.log(chalk.dim('  No changes detected.\n'));
    }
    return false;
  }

  // Breaking changes check
  if (hasBreakingChanges(result) && !options.force) {
    spinner.stop();
    console.log(chalk.yellow('\n  BREAKING CHANGES DETECTED\n'));
    printDiffSummary(result);
    console.log(chalk.yellow('\n  These changes may break your code.\n'));
    console.log(`  Run with ${chalk.cyan('--force')} to apply anyway.`);
    console.log(`  Run with ${chalk.cyan('--preview')} to see full details.\n`);
    process.exit(1);
  }

  if (hasChanges(result)) {
    spinner.stop();
    console.log(chalk.cyan(`\n  Importing ${counts.total} change(s)...\n`));
  }

  return true;
}

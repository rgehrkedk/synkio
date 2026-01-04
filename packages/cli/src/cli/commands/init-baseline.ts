/**
 * init-baseline Command
 *
 * Creates a baseline.json from existing token files WITHOUT Figma IDs.
 * This is a stripped-down version of export-baseline for bootstrap scenarios.
 *
 * Use case: Teams with existing token files who want meaningful diff detection
 * on their first Figma pull.
 */

import { readFile } from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, findConfigFile } from '../../core/config.js';
import { discoverTokenFiles, extractModeFromFile, extractGroupFromFile } from '../../core/export/file-discoverer.js';
import { parseTokenFile, parseMultiModeFile } from '../../core/export/token-parser.js';
import { buildExportBaseline } from '../../core/export/baseline-builder.js';
import { readBaseline, writeBaseline } from '../../core/baseline.js';

export interface InitBaselineOptions {
  config?: string;
  dryRun?: boolean;
  force?: boolean;
}

export async function initBaselineCommand(options: InitBaselineOptions = {}): Promise<void> {
  const spinner = ora('Initializing baseline...').start();

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';

    const configPath = findConfigFile(options.config);
    if (!configPath) {
      spinner.fail(chalk.red('No synkio.config.json found'));
      console.error(chalk.dim("\nRun 'synkio init' first to create a config file.\n"));
      process.exit(1);
    }

    const config = loadConfig(options.config);

    if (!config.tokens?.collections || Object.keys(config.tokens.collections).length === 0) {
      spinner.fail(chalk.red('No collections configured'));
      console.error(chalk.dim('\nAdd collections to tokens.collections in synkio.config.json\n'));
      process.exit(1);
    }

    // 2. Check for existing baseline
    const existingBaseline = await readBaseline();
    if (existingBaseline && !options.force) {
      spinner.fail(chalk.red('baseline.json already exists'));
      console.error(chalk.dim('\nUse --force to overwrite\n'));
      process.exit(1);
    }

    // 3. Discover token files
    spinner.text = 'Discovering token files...';
    const baseDir = process.cwd();
    const { files, errors } = await discoverTokenFiles(config.tokens.collections, baseDir);

    if (errors.length > 0) {
      spinner.stop();
      for (const err of errors) {
        console.warn(chalk.yellow(`  Warning: ${err}`));
      }
      spinner.start();
    }

    if (files.length === 0) {
      spinner.warn(chalk.yellow('No token files found'));
      console.log(chalk.dim('\nCreating empty baseline\n'));
    }

    // 4. Parse all files
    spinner.text = 'Parsing token files...';
    const parsedFiles: Array<{
      file: typeof files[0];
      tokens: Awaited<ReturnType<typeof parseTokenFile>>['tokens'];
      mode: string;
    }> = [];

    for (const file of files) {
      const { tokens } = await parseTokenFile(file.path);

      // Handle multi-mode files (includeMode: true structure)
      if (tokens.length === 0) {
        const content = JSON.parse(await readFile(file.path, 'utf-8'));
        const multiMode = parseMultiModeFile(content);

        if (multiMode.size > 0) {
          for (const [mode, modeTokens] of multiMode) {
            // Add group prefix for splitBy: "group"
            const groupPrefix = extractGroupFromFile(file);
            if (groupPrefix) {
              for (const token of modeTokens) {
                token.path = `${groupPrefix}.${token.path}`;
              }
            }
            parsedFiles.push({ file, tokens: modeTokens, mode });
          }
          continue;
        }
      }

      // Add group prefix for splitBy: "group"
      const groupPrefix = extractGroupFromFile(file);
      if (groupPrefix) {
        for (const token of tokens) {
          token.path = `${groupPrefix}.${token.path}`;
        }
      }

      const mode = extractModeFromFile(file, 'value');
      parsedFiles.push({ file, tokens, mode });
    }

    // 5. Build baseline WITHOUT enrichment (key difference from export-baseline)
    spinner.text = 'Building baseline...';
    const baselineData = buildExportBaseline(parsedFiles, {
      // No stylesConfig, no getStyleId, no getVariableMetadata
      // This means no ID enrichment happens - exactly what we want for init
    });

    const tokenCount = Object.keys(baselineData.baseline).length;
    const styleCount = Object.keys(baselineData.styles).length;
    const collections = new Set(
      Object.values(baselineData.baseline).map(t => t.collection)
    );

    // 6. Output
    if (options.dryRun) {
      spinner.stop();
      console.log(chalk.cyan('\n  Dry run - would create baseline with:\n'));
      console.log(`  Tokens: ${tokenCount}`);
      if (styleCount > 0) {
        console.log(`  Styles: ${styleCount}`);
      }
      console.log(`  Collections: ${Array.from(collections).join(', ') || '(none)'}`);
      console.log(chalk.dim('\n  No variableIds (will be added on first pull)\n'));
      return;
    }

    await writeBaseline(baselineData, 'init');

    spinner.succeed(chalk.green('Baseline initialized!'));
    console.log('');
    console.log(chalk.dim('  Tokens:'), tokenCount);
    if (styleCount > 0) {
      console.log(chalk.dim('  Styles:'), styleCount);
    }
    console.log(chalk.dim('  Collections:'), Array.from(collections).join(', ') || '(none)');
    console.log(chalk.dim('  Source:'), 'init (no Figma IDs)');
    console.log('');
    console.log(chalk.cyan('  Next step:'));
    console.log(chalk.dim('    Run "synkio pull" to sync with Figma'));
    console.log(chalk.dim('    The first pull will show a path-based comparison'));
    console.log('');

  } catch (error: unknown) {
    spinner.fail(chalk.red('Init failed'));
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n  Error: ${message}\n`));
    process.exit(1);
  }
}

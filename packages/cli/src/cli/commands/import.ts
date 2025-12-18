import { readFile, readdir, stat } from 'fs/promises';
import { resolve, basename, extname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { parseFigmaNativeExport, parseFigmaNativeFiles, isFigmaNativeFormat } from '../../core/figma-native.js';
import { readBaseline, writeBaseline } from '../../core/baseline.js';
import { compareBaselines, hasChanges, hasBreakingChanges, getChangeCounts, printDiffSummary } from '../../core/compare.js';
import { splitTokens, SplitTokensOptions } from '../../core/tokens.js';
import { loadConfig } from '../../core/config.js';
import {
  generateIntermediateFromBaseline,
  generateDocsFromBaseline,
  generateCssFromBaseline,
} from '../../core/output.js';
import { BaselineData, BaselineEntry } from '../../types/index.js';
import { createLogger } from '../../utils/logger.js';
import { mkdir, writeFile } from 'fs/promises';

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
 *
 * @example
 * ```bash
 * # Import using config (recommended)
 * synkio import
 *
 * # Import a single mode
 * synkio import ./light.tokens.json --collection=theme
 *
 * # Import all modes from a directory
 * synkio import ./figma-exports/ --collection=theme
 *
 * # Preview what would change
 * synkio import --preview
 * ```
 */
export async function importCommand(options: ImportOptions): Promise<void> {
  const logger = createLogger();
  const spinner = ora('Importing design tokens...').start();

  try {
    // 1. Load config if available
    let config;
    try {
      config = loadConfig(options.config);
    } catch {
      // Config is optional for import
      config = null;
    }

    // 2. Determine import sources
    spinner.text = 'Finding JSON files...';

    // Structure to hold files with their collection assignment
    const filesToImport: Array<{ content: unknown; filename: string; collection: string }> = [];

    if (options.path) {
      // CLI path provided - use it directly
      const inputPath = resolve(process.cwd(), options.path);
      const inputStat = await stat(inputPath).catch(() => null);

      if (!inputStat) {
        spinner.fail(chalk.red(`Path not found: ${options.path}`));
        process.exit(1);
      }

      if (inputStat.isDirectory()) {
        // Read all JSON files in directory
        const dirEntries = await readdir(inputPath);
        const jsonFiles = dirEntries.filter(f => extname(f).toLowerCase() === '.json');

        if (jsonFiles.length === 0) {
          spinner.fail(chalk.red(`No JSON files found in: ${options.path}`));
          process.exit(1);
        }

        for (const filename of jsonFiles) {
          const content = JSON.parse(await readFile(resolve(inputPath, filename), 'utf-8'));
          filesToImport.push({
            content,
            filename,
            collection: options.collection || 'default'
          });
        }
      } else {
        // Single file
        const content = JSON.parse(await readFile(inputPath, 'utf-8'));
        filesToImport.push({
          content,
          filename: basename(inputPath),
          collection: options.collection || 'default'
        });
      }
    } else if (config?.import?.sources && Object.keys(config.import.sources).length > 0) {
      // Use config-based import sources
      const importConfig = config.import;
      const defaultDir = importConfig.dir || 'figma-exports';
      const sources = importConfig.sources!; // Non-null asserted - checked above

      for (const [collectionName, source] of Object.entries(sources)) {
        const sourceDir = source.dir || defaultDir;
        const sourceDirPath = resolve(process.cwd(), sourceDir);

        // Check if source directory exists
        const dirStat = await stat(sourceDirPath).catch(() => null);
        if (!dirStat || !dirStat.isDirectory()) {
          spinner.fail(chalk.red(`Import source directory not found: ${sourceDir}`));
          process.exit(1);
        }

        // Get files to import for this collection
        let filenames: string[];
        if (source.files && source.files.length > 0) {
          // Explicit file list
          filenames = source.files;
        } else {
          // All JSON files in directory
          const dirEntries = await readdir(sourceDirPath);
          filenames = dirEntries.filter(f => extname(f).toLowerCase() === '.json');
        }

        if (filenames.length === 0) {
          spinner.warn(chalk.yellow(`No JSON files found for collection "${collectionName}" in ${sourceDir}`));
          continue;
        }

        for (const filename of filenames) {
          const filePath = resolve(sourceDirPath, filename);
          const fileStat = await stat(filePath).catch(() => null);

          if (!fileStat) {
            spinner.fail(chalk.red(`File not found: ${filename} (in ${sourceDir})`));
            process.exit(1);
          }

          const content = JSON.parse(await readFile(filePath, 'utf-8'));
          filesToImport.push({ content, filename, collection: collectionName });
        }
      }

      if (filesToImport.length === 0) {
        spinner.fail(chalk.red('No files to import. Check your import.sources config.'));
        process.exit(1);
      }
    } else {
      // No path and no config - show usage
      spinner.fail(chalk.red(
        'No import source specified.\n\n' +
        '  Usage:\n' +
        '    synkio import <path> --collection=<name>   Import from path\n' +
        '    synkio import                              Import using config\n\n' +
        '  To use config-based import, add to synkio.config.json:\n' +
        '    "import": {\n' +
        '      "dir": "figma-exports",\n' +
        '      "sources": {\n' +
        '        "theme": { "files": ["light.tokens.json", "dark.tokens.json"] }\n' +
        '      }\n' +
        '    }'
      ));
      process.exit(1);
    }

    spinner.text = `Found ${filesToImport.length} JSON file(s)`;

    // 3. Validate files are Figma native format
    spinner.text = 'Validating file format...';
    for (const { content, filename } of filesToImport) {
      if (!isFigmaNativeFormat(content)) {
        spinner.fail(chalk.red(
          `File "${filename}" is not in Figma native export format.\n\n` +
          '  Expected format with $type, $value, and $extensions.com.figma.variableId\n' +
          '  Export from Figma: File -> Export -> Variables -> JSON'
        ));
        process.exit(1);
      }
    }

    // 4. Parse files to baseline entries (group by collection)
    spinner.text = 'Parsing tokens...';
    let baseline: Record<string, BaselineEntry> = {};

    // Group files by collection for parsing
    const filesByCollection = new Map<string, Array<{ content: unknown; filename: string }>>();
    for (const { content, filename, collection } of filesToImport) {
      if (!filesByCollection.has(collection)) {
        filesByCollection.set(collection, []);
      }
      filesByCollection.get(collection)!.push({ content, filename });
    }

    try {
      for (const [collectionName, files] of filesByCollection) {
        const collectionBaseline = parseFigmaNativeFiles(files, {
          collection: collectionName,
          mode: options.mode,
        });
        baseline = { ...baseline, ...collectionBaseline };
      }
    } catch (error: any) {
      spinner.fail(chalk.red(error.message));
      process.exit(1);
    }

    const tokenCount = Object.keys(baseline).length;
    logger.debug(`Parsed ${tokenCount} token entries`);

    // Get unique collections and modes
    const collections = new Set<string>();
    const modes = new Set<string>();
    for (const entry of Object.values(baseline)) {
      collections.add(entry.collection);
      modes.add(entry.mode);
    }

    spinner.text = `Parsed ${tokenCount} tokens (${collections.size} collection(s), ${modes.size} mode(s))`;

    // 5. Build new baseline
    const newBaseline: BaselineData = {
      baseline,
      metadata: {
        syncedAt: new Date().toISOString(),
      },
    };

    // 6. Compare with existing baseline
    const localBaseline = await readBaseline();

    if (localBaseline) {
      spinner.text = 'Comparing with existing tokens...';
      const result = compareBaselines(localBaseline, newBaseline);
      const counts = getChangeCounts(result);

      // Preview mode
      if (options.preview) {
        spinner.stop();
        console.log(chalk.cyan('\n  Preview Mode - No changes will be applied\n'));

        if (!hasChanges(result)) {
          console.log(chalk.dim('  No changes detected.\n'));
        } else {
          printDiffSummary(result);
        }
        return;
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
    } else {
      spinner.info('No existing baseline. Creating initial import.');
    }

    // 7. Write baseline
    spinner.start('Writing baseline...');
    await writeBaseline(newBaseline);

    // 8. Generate output files if config exists
    if (config) {
      spinner.text = 'Generating output files...';

      // Split tokens using new config structure
      const splitOptions: SplitTokensOptions = {
        collections: config.tokens.collections || {},
        dtcg: config.tokens.dtcg !== false,
        includeVariableId: config.tokens.includeVariableId === true,
        splitModes: config.tokens.splitModes,
        includeMode: config.tokens.includeMode,
        extensions: config.tokens.extensions || {},
      };
      const processedTokens = splitTokens(baseline, splitOptions);

      // Write token files using tokens.dir
      const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
      await mkdir(defaultOutDir, { recursive: true });

      const filesByDir = new Map<string, Map<string, unknown>>();
      for (const [fileName, fileData] of processedTokens) {
        const outDir = fileData.dir
          ? resolve(process.cwd(), fileData.dir)
          : defaultOutDir;

        if (!filesByDir.has(outDir)) {
          filesByDir.set(outDir, new Map());
        }
        filesByDir.get(outDir)!.set(fileName, fileData.content);
      }

      let filesWritten = 0;
      for (const [outDir, filesInDir] of filesByDir) {
        await mkdir(outDir, { recursive: true });
        for (const [fileName, content] of filesInDir) {
          const filePath = resolve(outDir, fileName);
          await writeFile(filePath, JSON.stringify(content, null, 2));
          filesWritten++;
        }
      }

      // Always generate intermediate format (used by docs and other tools)
      await generateIntermediateFromBaseline(newBaseline, config);

      // Generate additional outputs
      let cssFilesWritten = 0;
      let docsFilesWritten = 0;

      // CSS output if enabled
      if (config.build?.css?.enabled) {
        const cssResult = await generateCssFromBaseline(newBaseline, config);
        cssFilesWritten = cssResult.files.length;
      }

      // Docs if enabled
      if (config.docsPages?.enabled) {
        const docsResult = await generateDocsFromBaseline(newBaseline, config);
        docsFilesWritten = docsResult.files.length;
      }

      // Build summary
      const extras: string[] = [];
      if (cssFilesWritten > 0) extras.push(`${cssFilesWritten} CSS`);
      if (docsFilesWritten > 0) extras.push('docs');
      const extrasStr = extras.length > 0 ? ` (+ ${extras.join(', ')})` : '';

      spinner.succeed(chalk.green(
        `Imported ${tokenCount} tokens. Wrote ${filesWritten} files to ${config.tokens.dir}.${extrasStr}`
      ));
    } else {
      spinner.succeed(chalk.green(
        `Imported ${tokenCount} tokens from ${filesToImport.length} file(s).\n` +
        chalk.dim('  Run synkio sync --regenerate to generate output files.')
      ));
    }

    // Show summary
    console.log(chalk.dim(`\n  Collections: ${Array.from(collections).join(', ')}`));
    console.log(chalk.dim(`  Modes: ${Array.from(modes).join(', ')}\n`));

  } catch (error: any) {
    spinner.fail(chalk.red(`Import failed: ${error.message}`));
    logger.error('Import failed', { error });
    process.exit(1);
  }
}

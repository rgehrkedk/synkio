import { mkdir, writeFile, readdir, unlink } from 'fs/promises';
import { resolve, join } from 'path';
import { loadConfig, updateConfigWithCollectionRenames, updateConfigWithCollections } from '../../core/config.js';
import { FigmaClient } from '../../core/figma.js';
import { splitTokens, SplitTokensOptions, normalizePluginData, RawTokens } from '../../core/tokens.js';
import { createLogger } from '../../utils/logger.js';
import { readBaseline, writeBaseline } from '../../core/baseline.js';
import { compareBaselines, hasChanges, hasBreakingChanges, getChangeCounts, generateDiffReport, printDiffSummary } from '../../core/compare.js';
import { generateAllFromBaseline, generateWithStyleDictionary, isStyleDictionaryAvailable } from '../../core/output.js';
import { StyleDictionaryNotInstalledError } from '../../core/style-dictionary/index.js';
import { BaselineData } from '../../types/index.js';
import chalk from 'chalk';
import ora from 'ora';

export interface SyncOptions {
  force?: boolean;      // Bypass breaking change protection
  preview?: boolean;    // Show what would change, don't sync
  report?: boolean;     // Force generate markdown report
  noReport?: boolean;   // Force skip report generation
  watch?: boolean;      // Watch for changes
  interval?: number;    // Watch interval in seconds (default 30)
  collection?: string;  // Sync only specific collection(s), comma-separated
  regenerate?: boolean; // Regenerate files from existing baseline (no Figma fetch)
  config?: string;      // Path to config file (auto-discovered if not specified)
}

/**
 * Extract unique collections and their modes from normalized tokens.
 * Used during first sync to auto-populate tokens.collections.
 */
function discoverCollectionsFromTokens(
  normalizedTokens: RawTokens
): { name: string; modes: string[]; splitModes: boolean }[] {
  // Build map of collections to their unique modes
  const collectionModes = new Map<string, Set<string>>();

  for (const entry of Object.values(normalizedTokens)) {
    const collection = entry.collection || entry.path.split('.')[0];
    const mode = entry.mode || 'default';

    if (!collectionModes.has(collection)) {
      collectionModes.set(collection, new Set());
    }
    collectionModes.get(collection)!.add(mode);
  }

  // Convert to array with splitModes determination
  const result: { name: string; modes: string[]; splitModes: boolean }[] = [];
  for (const [name, modesSet] of collectionModes) {
    const modes = Array.from(modesSet).sort();
    result.push({
      name,
      modes,
      splitModes: modes.length > 1,  // false if 1 mode, true if 2+ modes
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Check if Style Dictionary mode is enabled based on new config structure
 */
function isStyleDictionaryMode(config: ReturnType<typeof loadConfig>): boolean {
  return !!config.build?.styleDictionary?.configFile;
}

export async function syncCommand(options: SyncOptions = {}) {
  const logger = createLogger();
  const spinner = ora('Syncing design tokens...').start();

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    let config = loadConfig(options.config);
    logger.debug('Config loaded', config);

    // Early check: If Style Dictionary mode is enabled, verify it's installed
    if (isStyleDictionaryMode(config)) {
      const sdAvailable = await isStyleDictionaryAvailable();
      if (!sdAvailable) {
        spinner.fail(chalk.red(
          'Style Dictionary mode is configured but style-dictionary is not installed.\n\n' +
          '  To fix this, either:\n' +
          '  1. Install Style Dictionary: npm install -D style-dictionary\n' +
          '  2. Remove build.styleDictionary from synkio.config.json\n'
        ));
        process.exit(1);
      }
    }

    // Handle --regenerate: skip Figma fetch, use existing baseline
    if (options.regenerate) {
      spinner.text = 'Regenerating files from existing baseline...';
      const localBaseline = await readBaseline();

      if (!localBaseline) {
        spinner.fail(chalk.red('No baseline found. Run synkio sync first to fetch tokens from Figma.'));
        process.exit(1);
      }

      // Use the existing baseline tokens
      const normalizedTokens = localBaseline.baseline;

      // Split and write token files using new config structure
      const splitOptions: SplitTokensOptions = {
        collections: config.tokens.collections || {},
        dtcg: config.tokens.dtcg !== false,
        includeVariableId: config.tokens.includeVariableId === true,
        extensions: config.tokens.extensions || {},
      };
      const processedTokens = splitTokens(normalizedTokens, splitOptions);

      const defaultOutDir = resolve(process.cwd(), config.tokens.dir);

      // Build map of files per directory
      const filesByDir = new Map<string, Map<string, any>>();
      for (const [fileName, fileData] of processedTokens) {
        const outDir = fileData.dir
          ? resolve(process.cwd(), fileData.dir)
          : defaultOutDir;

        if (!filesByDir.has(outDir)) {
          filesByDir.set(outDir, new Map());
        }
        filesByDir.get(outDir)!.set(fileName, fileData.content);
      }

      // Ensure all output directories exist and write files
      let filesWritten = 0;
      for (const [outDir, filesInDir] of filesByDir) {
        await mkdir(outDir, { recursive: true });
        for (const [fileName, content] of filesInDir) {
          const filePath = resolve(outDir, fileName);
          await writeFile(filePath, JSON.stringify(content, null, 2));
          filesWritten++;
        }
      }

      // Generate all enabled output formats
      spinner.text = 'Generating output files...';

      // Check if using Style Dictionary mode
      let outputs;
      let sdFilesWritten = 0;

      if (isStyleDictionaryMode(config)) {
        try {
          const sdResult = await generateWithStyleDictionary(localBaseline, config);
          sdFilesWritten = sdResult.files.length;
          // Still generate docs and CSS if enabled (independent of SD mode)
          outputs = await generateAllFromBaseline(localBaseline, config);
        } catch (error) {
          if (error instanceof StyleDictionaryNotInstalledError) {
            spinner.fail(chalk.red(error.message));
            process.exit(1);
          }
          throw error;
        }
      } else {
        outputs = await generateAllFromBaseline(localBaseline, config);
      }

      const cssFilesWritten = outputs.css.files.length;
      const docsFilesWritten = outputs.docs.files.length;

      const extras: string[] = [];
      if (sdFilesWritten > 0) extras.push(`${sdFilesWritten} Style Dictionary`);
      if (cssFilesWritten > 0) extras.push(`${cssFilesWritten} CSS`);
      if (docsFilesWritten > 0) extras.push(`${docsFilesWritten} docs`);
      const extrasStr = extras.length > 0 ? ` (+ ${extras.join(', ')} files)` : '';

      spinner.succeed(chalk.green(`Regenerated ${filesWritten} token files from baseline.${extrasStr}`));
      return;
    }

    // 2. Fetch data from Figma
    spinner.text = 'Fetching data from Figma...';
    const figmaClient = new FigmaClient({ ...config.figma, logger });
    const rawData = await figmaClient.fetchData();
    logger.debug('Figma data fetched');

    // 3. Normalize plugin data to baseline format
    spinner.text = 'Processing tokens...';
    let normalizedTokens = normalizePluginData(rawData);
    logger.debug(`Normalized ${Object.keys(normalizedTokens).length} token entries`);

    // 3b. Filter by collection if specified
    if (options.collection) {
      const collectionsToSync = options.collection.split(',').map(c => c.trim().toLowerCase());
      const originalCount = Object.keys(normalizedTokens).length;
      normalizedTokens = Object.fromEntries(
        Object.entries(normalizedTokens).filter(([_, entry]) => {
          const entryCollection = (entry.collection || entry.path.split('.')[0]).toLowerCase();
          return collectionsToSync.includes(entryCollection);
        })
      );
      const filteredCount = Object.keys(normalizedTokens).length;
      spinner.text = `Filtered to ${filteredCount} tokens from collection(s): ${options.collection}`;
      logger.debug(`Filtered from ${originalCount} to ${filteredCount} tokens`);

      if (filteredCount === 0) {
        spinner.fail(chalk.red(`No tokens found for collection(s): ${options.collection}`));
        console.log(chalk.dim('\n  Available collections can be seen with: synkio tokens\n'));
        process.exit(1);
      }
    }

    // 4. Read existing baseline for comparison
    const localBaseline = await readBaseline();

    // Build the new baseline object
    const newBaseline: BaselineData = {
      baseline: normalizedTokens,
      metadata: {
        syncedAt: new Date().toISOString(),
      },
    };

    // 4b. First sync: discover collections and update config
    const isFirstSync = !localBaseline;
    if (isFirstSync) {
      const discoveredCollections = discoverCollectionsFromTokens(normalizedTokens);

      // Display discovered collections
      spinner.stop();
      console.log(chalk.cyan('\n  Collections from Figma:'));
      for (const col of discoveredCollections) {
        const modeStr = col.modes.length === 1
          ? `1 mode: ${col.modes[0]}`
          : `${col.modes.length} modes: ${col.modes.join(', ')}`;
        console.log(chalk.dim(`    - ${col.name} (${modeStr})`));
      }
      console.log('');

      // Update config with discovered collections
      spinner.start('Updating synkio.config.json with discovered collections...');
      const configUpdateResult = updateConfigWithCollections(discoveredCollections, options.config);
      if (configUpdateResult.updated) {
        // Reload config with updated collections
        config = loadConfig(options.config);
        spinner.text = 'Config updated with collections';
      }
    }

    // 5. Compare if we have a local baseline
    let hasBaselineChanges = false;
    let collectionRenames: { oldCollection: string; newCollection: string; modeMapping: { oldMode: string; newMode: string }[] }[] = [];
    if (localBaseline) {
      spinner.text = 'Comparing with local tokens...';
      const result = compareBaselines(localBaseline, newBaseline);
      collectionRenames = result.collectionRenames;
      const counts = getChangeCounts(result);

      // No changes from Figma - but still regenerate files (config may have changed)
      if (!hasChanges(result)) {
        spinner.text = 'Regenerating token files...';
        hasBaselineChanges = false;
      } else {
        hasBaselineChanges = true;
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

        console.log(chalk.yellow('\n  BREAKING CHANGES DETECTED\n'));

        // Show breaking changes summary
        if (result.pathChanges.length > 0) {
          console.log(chalk.red(`  Path changes: ${result.pathChanges.length}`));
          result.pathChanges.slice(0, 5).forEach(change => {
            console.log(chalk.dim(`    ${change.oldPath} -> ${change.newPath}`));
          });
          if (result.pathChanges.length > 5) {
            console.log(chalk.dim(`    ... and ${result.pathChanges.length - 5} more`));
          }
        }

        if (result.collectionRenames.length > 0) {
          console.log(chalk.red(`  Collection renames: ${result.collectionRenames.length}`));
          result.collectionRenames.forEach(rename => {
            console.log(chalk.dim(`    ${rename.oldCollection} -> ${rename.newCollection}`));
          });
        }

        if (result.modeRenames.length > 0) {
          console.log(chalk.red(`  Mode renames: ${result.modeRenames.length}`));
          result.modeRenames.forEach(rename => {
            console.log(chalk.dim(`    ${rename.collection}: ${rename.oldMode} -> ${rename.newMode}`));
          });
        }

        if (result.newModes.length > 0) {
          console.log(chalk.red(`  New modes: ${result.newModes.map(m => `${m.collection}:${m.mode}`).join(', ')}`));
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

        if (result.deletedModes.length > 0) {
          console.log(chalk.red(`  Deleted modes: ${result.deletedModes.map(m => `${m.collection}:${m.mode}`).join(', ')}`));
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
          console.log(chalk.dim(`    ${change.path}: ${JSON.stringify(change.oldValue)} -> ${JSON.stringify(change.newValue)}`));
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
      if (result.newModes.length > 0) {
        console.log(chalk.green(`  New modes: ${result.newModes.map(m => `${m.collection}:${m.mode}`).join(', ')}`));
      }

      console.log('');
    } else {
      spinner.info('No local baseline found. Performing initial sync.');
    }

    // 6. Write baseline
    spinner.start('Writing baseline...');
    await writeBaseline(newBaseline);

    // 6.5. Update config with collection renames (if any)
    if (collectionRenames.length > 0) {
      spinner.text = 'Updating config with collection renames...';
      const configUpdateResult = updateConfigWithCollectionRenames(collectionRenames, options.config);
      if (configUpdateResult.updated && configUpdateResult.configPath) {
        // Reload config with updated collection names
        config = loadConfig(options.config);
        const configFileName = configUpdateResult.configPath.split('/').pop();
        console.log(chalk.cyan(`\n  Updated ${configFileName} with collection renames:`));
        configUpdateResult.renames.forEach(r => {
          console.log(chalk.dim(`    ${r.old} -> ${r.new}`));
        });
        console.log('');
      }
    }

    // 7. Split tokens into files using new config structure
    spinner.text = 'Processing tokens...';
    const splitOptions: SplitTokensOptions = {
      collections: config.tokens.collections || {},
      dtcg: config.tokens.dtcg !== false,                    // default true
      includeVariableId: config.tokens.includeVariableId === true, // default false
      extensions: config.tokens.extensions || {},            // optional metadata
    };
    const processedTokens = splitTokens(normalizedTokens, splitOptions);
    logger.debug(`${processedTokens.size} token sets processed`);

    // 7. Write files
    spinner.text = 'Writing token files...';
    const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
    await mkdir(defaultOutDir, { recursive: true });

    // Track all output directories for cleanup
    const outputDirs = new Set<string>([defaultOutDir]);

    // Build map of files per directory
    const filesByDir = new Map<string, Map<string, any>>();
    for (const [fileName, fileData] of processedTokens) {
      const outDir = fileData.dir
        ? resolve(process.cwd(), fileData.dir)
        : defaultOutDir;

      outputDirs.add(outDir);

      if (!filesByDir.has(outDir)) {
        filesByDir.set(outDir, new Map());
      }
      filesByDir.get(outDir)!.set(fileName, fileData.content);
    }

    // Ensure all output directories exist
    for (const dir of outputDirs) {
      await mkdir(dir, { recursive: true });
    }

    // Clean up old .json files that are no longer needed (in each output dir)
    for (const [outDir, filesInDir] of filesByDir) {
      try {
        const existingFiles = await readdir(outDir);
        const newFileNames = new Set(filesInDir.keys());
        for (const file of existingFiles) {
          if (file.endsWith('.json') && !newFileNames.has(file)) {
            await unlink(resolve(outDir, file));
            logger.debug(`Removed stale file: ${file}`);
          }
        }
      } catch (err) {
        // Ignore errors if directory doesn't exist yet
      }
    }

    let filesWritten = 0;
    for (const [outDir, filesInDir] of filesByDir) {
      for (const [fileName, content] of filesInDir) {
        const filePath = resolve(outDir, fileName);
        await writeFile(filePath, JSON.stringify(content, null, 2));
        filesWritten++;
      }
    }

    // 8. Generate CSS if enabled in config
    // 8. Generate all enabled output formats (CSS, SCSS, JS, Tailwind, docs)
    spinner.text = 'Generating output files...';

    // Check if using Style Dictionary mode
    let outputs;
    let sdFilesWritten = 0;

    if (isStyleDictionaryMode(config)) {
      try {
        const sdResult = await generateWithStyleDictionary(newBaseline, config);
        sdFilesWritten = sdResult.files.length;
        // Still generate docs and CSS if enabled (independent of SD mode)
        outputs = await generateAllFromBaseline(newBaseline, config);
      } catch (error) {
        if (error instanceof StyleDictionaryNotInstalledError) {
          spinner.fail(chalk.red(error.message));
          process.exit(1);
        }
        throw error;
      }
    } else {
      outputs = await generateAllFromBaseline(newBaseline, config);
    }

    const cssFilesWritten = outputs.css.files.length;
    const docsFilesWritten = outputs.docs.files.length;
    const docsDir = outputs.docs.outputDir;

    // 9. Generate report based on config and flags
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
        spinner.succeed(chalk.green(`Sync complete. Wrote ${filesWritten} token files. Report: ${relativePath}`));

        // Show additional outputs
        const allOutputs = [
          sdFilesWritten > 0 ? `${sdFilesWritten} Style Dictionary` : null,
          cssFilesWritten > 0 ? `${cssFilesWritten} CSS` : null,
        ].filter(Boolean);

        if (allOutputs.length > 0) {
          console.log(chalk.dim(`  + ${allOutputs.join(', ')} file(s) in ${config.tokens.dir}`));
        }
        if (docsFilesWritten > 0) {
          console.log(chalk.dim(`  + Documentation: ${docsDir}`));
        }
        return;
      }
    }

    // Build output summary
    const extras: string[] = [];
    if (sdFilesWritten > 0) extras.push(`${sdFilesWritten} Style Dictionary`);
    if (cssFilesWritten > 0) extras.push(`${cssFilesWritten} CSS`);
    if (docsFilesWritten > 0) extras.push('docs');
    const extrasStr = extras.length > 0 ? ` (+ ${extras.join(', ')})` : '';

    // Show appropriate message based on whether there were changes
    if (hasBaselineChanges) {
      spinner.succeed(chalk.green(`Sync complete. Wrote ${filesWritten} token files to ${config.tokens.dir}.${extrasStr}`));
    } else if (localBaseline) {
      spinner.succeed(chalk.green(`No changes from Figma. Regenerated ${filesWritten} token files.${extrasStr}`));
    } else {
      spinner.succeed(chalk.green(`Initial sync complete. Wrote ${filesWritten} token files to ${config.tokens.dir}.${extrasStr}`));
    }

    // Show docs location if generated
    if (docsFilesWritten > 0) {
      console.log(chalk.dim(`  Documentation: ${docsDir}`));
    }

  } catch (error: any) {
    spinner.fail(chalk.red(`Sync failed: ${error.message}`));
    logger.error('Sync failed', { error });
    process.exit(1);
  }
}

/**
 * Watch mode - poll Figma for changes at regular intervals
 */
export async function watchCommand(options: SyncOptions = {}) {
  const interval = (options.interval || 30) * 1000; // Convert to ms
  const logger = createLogger();

  console.log(chalk.cyan(`\n  Watching for changes (every ${options.interval || 30}s)\n`));
  console.log(chalk.dim('  Press Ctrl+C to stop\n'));

  let lastBaseline: BaselineData | undefined = undefined;
  let isRunning = true;

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    isRunning = false;
    console.log(chalk.dim('\n\n  Watch stopped.\n'));
    process.exit(0);
  });

  // Initial sync
  try {
    const config = loadConfig(options.config);
    const figmaClient = new FigmaClient({ ...config.figma, logger });

    // Read current baseline
    lastBaseline = await readBaseline();

    if (!lastBaseline) {
      console.log(chalk.yellow('  No baseline found. Running initial sync...\n'));
      await syncCommand({ ...options, watch: false });
      lastBaseline = await readBaseline();
    } else {
      console.log(chalk.dim(`  Baseline loaded. Last sync: ${lastBaseline.metadata.syncedAt}\n`));
    }

    // Watch loop
    while (isRunning) {
      const checkTime = new Date().toLocaleTimeString();
      process.stdout.write(chalk.dim(`  [${checkTime}] Checking Figma... `));

      try {
        const rawData = await figmaClient.fetchData();
        const normalizedTokens = normalizePluginData(rawData);

        const newBaseline: BaselineData = {
          baseline: normalizedTokens,
          metadata: {
            syncedAt: new Date().toISOString(),
          },
        };

        if (lastBaseline) {
          const result = compareBaselines(lastBaseline, newBaseline);

          if (hasChanges(result)) {
            process.stdout.write(chalk.green('Changes detected!\n\n'));

            // Check for breaking changes
            if (hasBreakingChanges(result) && !options.force) {
              console.log(chalk.yellow('  Breaking changes detected. Use --force to apply.\n'));
              printDiffSummary(result);
              console.log('');
            } else {
              // Apply the sync
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

      // Wait for next interval
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  } catch (error: any) {
    console.error(chalk.red(`\n  Watch failed: ${error.message}\n`));
    logger.error('Watch failed', { error });
    process.exit(1);
  }
}

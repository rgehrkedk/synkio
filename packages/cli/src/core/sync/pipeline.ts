/**
 * Sync Pipeline Module
 *
 * Orchestrates the main sync flow from Figma fetch to file writing.
 * This module coordinates all the extracted modules to perform a sync.
 */

import { resolve, relative, dirname, join } from 'node:path';
import { mkdir, writeFile, readFile, copyFile, access } from 'node:fs/promises';
import chalk from 'chalk';
import type { BaselineData, ComparisonResult, StyleComparisonResult } from '../../types/index.js';
import { loadConfig, updateConfigWithCollectionRenames, updateConfigWithCollections } from '../config.js';
import { FigmaClient } from '../figma.js';
import { splitTokens, splitStyles, normalizePluginData, normalizeStyleData, hasStyles, getStyleCount } from '../tokens.js';
import type { SplitTokensOptions, StylesSplitOptions } from '../tokens.js';
import { readBaseline, writeBaseline } from '../baseline.js';
import { compareBaselines, hasChanges, getChangeCounts, generateDiffReport, printDiffSummary, compareStyleBaselines, hasStyleChanges, getStyleChangeCounts, printStyleDiffSummary } from '../compare.js';
import { generateIntermediateFromBaseline, generateDocsFromBaseline } from '../output.js';
import { discoverCollectionsFromTokens } from '../utils/index.js';
import { filterPhantomModes } from '../../utils/figma.js';
import { createLogger } from '../../utils/logger.js';

import { buildFilesByDirectory, regenerateFromBaseline } from './regenerate.js';
import { mergeStylesIntoTokens } from './style-merger.js';
import { shouldBlockSync, displayBreakingChanges } from './breaking-changes.js';
import { discoverTokenFiles, parseTokenFile, parseMultiModeFile, buildExportBaseline } from '../export/index.js';
import {
  displaySyncSummary,
  displayValueChanges,
  displayNewVariables,
  displayNewModes,
  displayStyleChanges,
  displayDiscoveredCollections,
  displayDiscoveredStyles,
} from './display.js';
import { writeTokenFiles, cleanupAllStaleFiles, writeStandaloneStyleFiles, ensureDirectories } from './file-writer.js';
import { shouldRunBuild, runBuildPipeline } from './build-runner.js';

/**
 * Sync command options
 */
export interface SyncOptions {
  force?: boolean;
  preview?: boolean;
  report?: boolean;
  noReport?: boolean;
  watch?: boolean;
  interval?: number;
  collection?: string;
  regenerate?: boolean;
  config?: string;
  timeout?: number;
  build?: boolean;
  noBuild?: boolean;
  open?: boolean;
  backup?: boolean;
}

/**
 * Result of sync pipeline execution
 */
export interface SyncPipelineResult {
  filesWritten: number;
  styleFilesWritten: number;
  docsFilesWritten: number;
  cssFilesWritten: number;
  buildScriptRan: boolean;
  hasChanges: boolean;
  reportPath?: string;
  docsDir?: string;
  backupDir?: string;
}

/**
 * Spinner interface (ora-compatible)
 */
export interface Spinner {
  text: string;
  start: (text?: string) => Spinner;
  stop: () => Spinner;
  succeed: (text: string) => Spinner;
  fail: (text: string) => Spinner;
  info: (text: string) => Spinner;
}

/**
 * Process styles and merge into token files
 */
async function processStyles(
  normalizedStyles: any,
  config: any,
  filesByDir: Map<string, Map<string, any>>,
  defaultOutDir: string,
  spinner: Spinner
): Promise<{ standaloneStyleFiles: any[]; }> {
  const standaloneStyleFiles: any[] = [];

  if (!normalizedStyles || Object.keys(normalizedStyles).length === 0) {
    return { standaloneStyleFiles };
  }

  const stylesConfig = config.tokens.styles;

  // Check if styles are enabled (default: true)
  if (stylesConfig?.enabled === false) {
    return { standaloneStyleFiles };
  }

  spinner.text = 'Processing style files...';

  const styleSplitOptions: StylesSplitOptions = {
    enabled: stylesConfig?.enabled,
    paint: stylesConfig?.paint,
    text: stylesConfig?.text,
    effect: stylesConfig?.effect,
  };

  const processedStyles = splitStyles(normalizedStyles, styleSplitOptions);

  // Use the consolidated style merger
  const mergeResult = mergeStylesIntoTokens(processedStyles, filesByDir, config, defaultOutDir);

  return { standaloneStyleFiles: mergeResult.standaloneStyleFiles };
}

/**
 * Backup existing token files before overwriting
 * Creates a timestamped backup directory in synkio/backups/
 *
 * @returns The backup directory path, or null if no files existed to backup
 */
async function backupExistingFiles(filesByDir: Map<string, Map<string, string>>): Promise<string | null> {
  const logger = createLogger();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = resolve(process.cwd(), 'synkio', 'backups', timestamp);

  let filesBackedUp = 0;

  for (const [dir, files] of filesByDir) {
    for (const [filename, _] of files) {
      const sourcePath = resolve(dir, filename);

      try {
        // Check if file exists
        await access(sourcePath);

        // Create backup directory structure
        const relativeDir = relative(process.cwd(), dir);
        const backupFilePath = join(backupDir, relativeDir, filename);
        await mkdir(dirname(backupFilePath), { recursive: true });

        // Copy file to backup
        await copyFile(sourcePath, backupFilePath);
        filesBackedUp++;
        logger.debug(`Backed up: ${sourcePath} → ${backupFilePath}`);

      } catch (error) {
        // File doesn't exist, nothing to backup
        logger.debug(`File doesn't exist, skipping backup: ${sourcePath}`);
      }
    }
  }

  if (filesBackedUp === 0) {
    logger.debug('No existing files to backup');
    return null;
  }

  logger.debug(`Backed up ${filesBackedUp} files to ${backupDir}`);
  return backupDir;
}

/**
 * Try to build a baseline from existing token files on disk
 * Used in preview mode to show what will change during first sync
 *
 * @returns BaselineData if files exist and can be parsed, null otherwise
 */
async function tryBuildBaselineFromDisk(config: any): Promise<BaselineData | null> {
  const logger = createLogger();

  try {
    // Discover token files using the same logic as export-baseline
    const baseDir = process.cwd();
    const { files, errors } = await discoverTokenFiles(
      config.tokens.collections || {},
      baseDir
    );

    if (errors.length > 0) {
      logger.debug('Errors discovering files:', errors);
    }

    if (files.length === 0) {
      logger.debug('No existing token files found on disk');
      return null;
    }

    logger.debug(`Found ${files.length} existing token files on disk`);

    // Parse all files (same logic as export-baseline command)
    const parsedFiles: Array<{
      file: typeof files[0];
      tokens: Awaited<ReturnType<typeof parseTokenFile>>['tokens'];
      mode: string;
    }> = [];

    for (const file of files) {
      const { tokens, errors: parseErrors } = await parseTokenFile(file.path);

      if (parseErrors.length > 0) {
        logger.debug(`Parse errors in ${file.filename}:`, parseErrors);
      }

      // Check for multi-mode structure
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

      const { extractModeFromFile } = await import('../export/file-discoverer.js');
      const mode = extractModeFromFile(file, 'value');
      parsedFiles.push({ file, tokens, mode });
    }

    // Build baseline using export-baseline logic
    const exportData = buildExportBaseline(parsedFiles);

    // Convert to BaselineData format expected by compareBaselines
    const baselineData: BaselineData = {
      baseline: exportData.baseline,
      styles: {},
      metadata: {
        syncedAt: new Date().toISOString(),
      },
    };

    logger.debug(`Built baseline from disk: ${Object.keys(exportData.baseline).length} tokens`);
    return baselineData;

  } catch (error: any) {
    logger.debug('Failed to build baseline from disk:', error.message || error);
    return null;
  }
}

/**
 * Handle first sync - discover collections and update config
 */
async function handleFirstSync(
  normalizedTokens: any,
  normalizedStyles: any,
  rawData: any,
  config: any,
  options: SyncOptions,
  spinner: Spinner
): Promise<any> {
  const discoveredCollections = discoverCollectionsFromTokens(normalizedTokens);

  // Display discovered collections
  spinner.stop();
  displayDiscoveredCollections(discoveredCollections);

  // Display discovered styles if present
  if (normalizedStyles && Object.keys(normalizedStyles).length > 0) {
    const styleCounts = getStyleCount(rawData);
    displayDiscoveredStyles(styleCounts);
  }
  console.log('');

  // Update config with discovered collections
  spinner.start('Updating synkio.config.json with discovered collections...');
  const configUpdateResult = updateConfigWithCollections(discoveredCollections, options.config);

  if (configUpdateResult.updated) {
    // Reload config with updated collections
    return loadConfig(options.config);
  }

  return config;
}

/**
 * Handle comparison and display changes
 */
function handleComparison(
  localBaseline: BaselineData,
  newBaseline: BaselineData,
  options: SyncOptions,
  spinner: Spinner
): {
  result: ComparisonResult;
  styleResult: StyleComparisonResult;
  shouldProceed: boolean;
  hasBaselineChanges: boolean;
} {
  spinner.text = 'Comparing with local tokens...';
  const result = compareBaselines(localBaseline, newBaseline);
  const counts = getChangeCounts(result);

  // Compare styles
  const styleResult = compareStyleBaselines(localBaseline.styles, newBaseline.styles);
  const styleCounts = getStyleChangeCounts(styleResult);

  // Check for any changes
  const hasBaselineChanges = hasChanges(result) || hasStyleChanges(styleResult);

  // Preview mode - show changes and exit
  if (options.preview) {
    spinner.stop();
    console.log(chalk.cyan('\n  Preview Mode - No changes will be applied\n'));
    printDiffSummary(result);
    if (hasStyleChanges(styleResult)) {
      printStyleDiffSummary(styleResult);
    }
    return { result, styleResult, shouldProceed: false, hasBaselineChanges };
  }

  // Breaking changes detected - block unless --force
  if (shouldBlockSync(result, styleResult, options.force || false)) {
    spinner.stop();
    displayBreakingChanges(result, styleResult);
    return { result, styleResult, shouldProceed: false, hasBaselineChanges };
  }

  // Show summary of what will be synced
  if (hasBaselineChanges) {
    spinner.stop();
    displaySyncSummary(counts, styleCounts);
    displayValueChanges(result.valueChanges);
    displayNewVariables(result.newVariables);
    displayNewModes(result.newModes);
    displayStyleChanges(styleResult);
    console.log('');
  }

  return { result, styleResult, shouldProceed: true, hasBaselineChanges };
}

/**
 * Generate sync report if configured
 */
async function generateReport(
  localBaseline: BaselineData,
  newBaseline: BaselineData,
  config: any,
  options: SyncOptions
): Promise<string | undefined> {
  const syncConfig = config.sync || { report: true, reportHistory: true };
  const shouldGenerateReport = options.noReport
    ? false
    : (options.report || syncConfig.report !== false);

  if (!shouldGenerateReport) {
    return undefined;
  }

  const result = compareBaselines(localBaseline, newBaseline);

  // Only generate if there were actual changes
  if (!hasChanges(result)) {
    return undefined;
  }

  const report = generateDiffReport(result, {
    fileName: config.figma.fileId,
    exportedAt: newBaseline.metadata.syncedAt,
  });

  const synkioDir = resolve(process.cwd(), 'synkio');
  await mkdir(synkioDir, { recursive: true });

  let reportPath: string;
  if (syncConfig.reportHistory) {
    // Timestamped reports for changelog history
    const reportsDir = resolve(synkioDir, 'reports');
    await mkdir(reportsDir, { recursive: true });
    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
    reportPath = resolve(reportsDir, `${timestamp}.md`);
  } else {
    // Single report file, overwritten each sync
    reportPath = resolve(synkioDir, 'sync-report.md');
  }

  await writeFile(reportPath, report);
  return reportPath.replace(process.cwd() + '/', '');
}

/**
 * Execute the main sync pipeline
 *
 * This is the core sync logic extracted from syncCommand.
 * It handles:
 * 1. Fetching data from Figma
 * 2. Normalizing tokens and styles
 * 3. Comparing with local baseline
 * 4. Processing and writing files
 * 5. Running build pipeline
 *
 * @param options - Sync command options
 * @param spinner - Ora spinner instance
 * @returns Sync pipeline result
 */
export async function executeSyncPipeline(
  options: SyncOptions,
  spinner: Spinner
): Promise<SyncPipelineResult> {
  const logger = createLogger();

  // 1. Load config
  spinner.text = 'Loading configuration...';
  let config = loadConfig(options.config);
  logger.debug('Config loaded', config);

  // 2. Handle --regenerate: skip Figma fetch
  if (options.regenerate) {
    spinner.text = 'Regenerating files from existing baseline...';
    const localBaseline = await readBaseline();

    if (!localBaseline) {
      throw new Error('No baseline found. Run synkio pull first to fetch tokens from Figma.');
    }

    const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
    const result = await regenerateFromBaseline(localBaseline, config, { defaultOutDir });

    // Check if build should run
    spinner.stop();
    const runBuild = await shouldRunBuild(config, options);

    let buildScriptRan = false;
    let cssFilesWritten = 0;

    if (runBuild) {
      spinner.start('Running build pipeline...');
      const buildResult = await runBuildPipeline(localBaseline, config, spinner);
      buildScriptRan = buildResult.scriptRan;
      cssFilesWritten = buildResult.cssFilesWritten;
    }

    return {
      filesWritten: result.filesWritten,
      styleFilesWritten: result.styleFilesWritten,
      docsFilesWritten: result.docsFilesWritten,
      cssFilesWritten,
      buildScriptRan,
      hasChanges: false,
    };
  }

  // 3. Fetch data from Figma
  spinner.text = 'Fetching data from Figma...';
  const timeout = options.timeout ? options.timeout * 1000 : undefined;
  const figmaClient = new FigmaClient({ ...config.figma, logger, timeout });
  const rawData = await figmaClient.fetchData();
  logger.debug('Figma data fetched');

  // 4. Normalize plugin data
  spinner.text = 'Processing tokens...';
  let normalizedTokens = normalizePluginData(rawData);
  logger.debug(`Normalized ${Object.keys(normalizedTokens).length} token entries`);

  // Normalize styles
  const normalizedStyles = hasStyles(rawData) ? normalizeStyleData(rawData) : undefined;

  // Filter phantom modes
  const preFilterCount = Object.keys(normalizedTokens).length;
  normalizedTokens = filterPhantomModes(normalizedTokens);
  const phantomFilteredCount = preFilterCount - Object.keys(normalizedTokens).length;
  if (phantomFilteredCount > 0) {
    logger.debug(`Filtered out ${phantomFilteredCount} tokens with phantom modes`);
  }

  // Filter by collection if specified
  if (options.collection) {
    const collectionsToSync = new Set(options.collection.split(',').map(c => c.trim().toLowerCase()));
    const originalCount = Object.keys(normalizedTokens).length;
    normalizedTokens = Object.fromEntries(
      Object.entries(normalizedTokens).filter(([_, entry]) => {
        const entryCollection = (entry.collection || entry.path.split('.')[0]).toLowerCase();
        return collectionsToSync.has(entryCollection);
      })
    );
    const filteredCount = Object.keys(normalizedTokens).length;

    if (filteredCount === 0) {
      throw new Error(`No tokens found for collection(s): ${options.collection}`);
    }

    spinner.text = `Filtered to ${filteredCount} tokens from collection(s): ${options.collection}`;
    logger.debug(`Filtered from ${originalCount} to ${filteredCount} tokens`);
  }

  // 5. Read existing baseline
  const localBaseline = await readBaseline();

  // Build new baseline
  const newBaseline: BaselineData = {
    baseline: normalizedTokens,
    styles: normalizedStyles,
    metadata: {
      syncedAt: new Date().toISOString(),
    },
  };

  // 6. Handle first sync
  const isFirstSync = !localBaseline;
  if (isFirstSync) {
    config = await handleFirstSync(normalizedTokens, normalizedStyles, rawData, config, options, spinner);

    // Preview mode for first sync - show what will be created
    if (options.preview) {
      spinner.stop();
      console.log(chalk.cyan('\n  Preview Mode - Initial Sync (No baseline exists)\n'));

      // Try to read existing token files from disk for comparison
      spinner.start('Checking for existing token files...');
      const diskBaseline = await tryBuildBaselineFromDisk(config);
      spinner.stop();

      if (diskBaseline) {
        // Compare output files (not internal representations)
        // This runs the full sync pipeline to generate what WILL be written,
        // then compares with what's currently on disk - same format comparison
        console.log(chalk.cyan('  Verifying roundtrip (comparing current files with sync output):\n'));

        // Run split/process to see what sync will write
        const splitOptions: SplitTokensOptions = {
          collections: config.tokens.collections || {},
          dtcg: config.tokens.dtcg !== false,
          includeVariableId: config.tokens.includeVariableId === true,
          splitBy: config.tokens.splitBy,
          includeMode: config.tokens.includeMode,
          extensions: config.tokens.extensions || {},
        };
        const processedTokens = splitTokens(normalizedTokens, splitOptions);
        const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
        const filesByDir = buildFilesByDirectory(processedTokens, defaultOutDir);

        // Compare file-by-file what exists vs what will be written
        let totalTokensChecked = 0;
        let filesWithChanges = 0;
        const changedFiles: string[] = [];

        for (const [dir, files] of filesByDir) {
          for (const [filename, newContent] of files) {
            const filePath = resolve(dir, filename);
            const relPath = relative(process.cwd(), filePath);

            try {
              const existingContent = await readFile(filePath, 'utf-8');
              const existingJson = JSON.parse(existingContent);
              const newJson = JSON.parse(newContent);

              // Deep comparison of JSON structures
              const existingStr = JSON.stringify(existingJson, null, 2);
              const newStr = JSON.stringify(newJson, null, 2);

              if (existingStr !== newStr) {
                filesWithChanges++;
                changedFiles.push(relPath);
              }

              // Count tokens in this file
              const countTokens = (obj: any): number => {
                let count = 0;
                for (const value of Object.values(obj)) {
                  if (value && typeof value === 'object' && '$value' in value) {
                    count++;
                  } else if (value && typeof value === 'object') {
                    count += countTokens(value);
                  }
                }
                return count;
              };
              totalTokensChecked += countTokens(newJson);

            } catch (error) {
              // File doesn't exist yet - will be created
              changedFiles.push(relPath);
              filesWithChanges++;
            }
          }
        }

        if (filesWithChanges === 0) {
          console.log(chalk.green(`  ✓ Roundtrip verified: ${totalTokensChecked} tokens match exactly.\n`));
          console.log(chalk.green('  ✓ No changes will be made to your files.\n'));
        } else {
          console.log(chalk.yellow(`  ⚠ ${filesWithChanges} file(s) will be modified:\n`));
          for (const file of changedFiles) {
            console.log(chalk.dim(`    - ${file}`));
          }
          console.log(chalk.dim('\n  Note: Formatting changes (field order, hex case) are expected.'));
          console.log(chalk.dim('  Token values and structure remain the same.'));
          console.log(chalk.cyan('\n  Run with --backup to create a safety backup before building:\n'));
          console.log(chalk.dim('    synkio build --backup\n'));
        }
      } else {
        // No existing files - show what will be created
        const splitOptions: SplitTokensOptions = {
          collections: config.tokens.collections || {},
          dtcg: config.tokens.dtcg !== false,
          includeVariableId: config.tokens.includeVariableId === true,
          splitBy: config.tokens.splitBy,
          includeMode: config.tokens.includeMode,
          extensions: config.tokens.extensions || {},
        };
        const processedTokens = splitTokens(normalizedTokens, splitOptions);
        const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
        const filesByDir = buildFilesByDirectory(processedTokens, defaultOutDir);

        console.log(chalk.bold('  Files to be created:\n'));

        // Group files by directory
        const filesByCollection = new Map<string, string[]>();
        for (const [dir, files] of filesByDir) {
          for (const [filename, _] of files) {
            const relPath = relative(process.cwd(), resolve(dir, filename));
            const collection = filename.split('.')[0];
            if (!filesByCollection.has(collection)) {
              filesByCollection.set(collection, []);
            }
            filesByCollection.get(collection)!.push(relPath);
          }
        }

        // Display files grouped by collection
        for (const [collection, files] of filesByCollection) {
          console.log(chalk.dim(`    ${collection}:`));
          for (const file of files.sort()) {
            console.log(chalk.green(`      + ${file}`));
          }
        }

        if (normalizedStyles && Object.keys(normalizedStyles).length > 0) {
          const stylesByType = new Map<string, number>();
          for (const [_, style] of Object.entries(normalizedStyles)) {
            stylesByType.set(style.type, (stylesByType.get(style.type) || 0) + 1);
          }
          console.log(chalk.bold('\n  Style files to be created:\n'));
          for (const [type, count] of stylesByType) {
            console.log(chalk.green(`    + styles.${type}.json`), chalk.dim(`${count} styles`));
          }
        }
      }

      console.log(chalk.dim('\n  Run without --preview to write files\n'));

      return {
        filesWritten: 0,
        styleFilesWritten: 0,
        docsFilesWritten: 0,
        cssFilesWritten: 0,
        buildScriptRan: false,
        hasChanges: true,
      };
    }
  }

  // 7. Compare with local baseline
  let hasBaselineChanges = false;
  let collectionRenames: any[] = [];

  if (localBaseline) {
    const comparison = handleComparison(localBaseline, newBaseline, options, spinner);

    if (!comparison.shouldProceed) {
      // Preview mode or blocked by breaking changes
      if (options.preview) {
        return {
          filesWritten: 0,
          styleFilesWritten: 0,
          docsFilesWritten: 0,
          cssFilesWritten: 0,
          buildScriptRan: false,
          hasChanges: comparison.hasBaselineChanges,
        };
      }
      // Breaking changes blocked sync
      throw new Error('Sync blocked due to breaking changes. Use --force to override.');
    }

    hasBaselineChanges = comparison.hasBaselineChanges;
    collectionRenames = comparison.result.collectionRenames;
  } else {
    spinner.info('No local baseline found. Performing initial sync.');
  }

  // 8. Write baseline
  spinner.start('Writing baseline...');
  await writeBaseline(newBaseline);

  // Handle collection renames
  if (collectionRenames.length > 0) {
    spinner.text = 'Updating config with collection renames...';
    const configUpdateResult = updateConfigWithCollectionRenames(collectionRenames, options.config);
    if (configUpdateResult.updated && configUpdateResult.configPath) {
      config = loadConfig(options.config);
      const configFileName = configUpdateResult.configPath.split('/').pop();
      console.log(chalk.cyan(`\n  Updated ${configFileName} with collection renames:`));
      configUpdateResult.renames.forEach((r: any) => {
        console.log(chalk.dim(`    ${r.old} -> ${r.new}`));
      });
      console.log('');
    }
  }

  // 9. Split tokens
  spinner.text = 'Processing tokens...';
  const splitOptions: SplitTokensOptions = {
    collections: config.tokens.collections || {},
    dtcg: config.tokens.dtcg !== false,
    includeVariableId: config.tokens.includeVariableId === true,
    splitBy: config.tokens.splitBy,
    includeMode: config.tokens.includeMode,
    extensions: config.tokens.extensions || {},
  };
  const processedTokens = splitTokens(normalizedTokens, splitOptions);
  logger.debug(`${processedTokens.size} token sets processed`);

  // 10. Build file map and process styles
  spinner.text = 'Writing token files...';
  const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
  const outputDirs = new Set<string>([defaultOutDir]);

  const filesByDir = buildFilesByDirectory(processedTokens, defaultOutDir);

  // Add custom directories
  for (const outDir of filesByDir.keys()) {
    outputDirs.add(outDir);
  }

  // Process styles
  const { standaloneStyleFiles } = await processStyles(
    normalizedStyles,
    config,
    filesByDir,
    defaultOutDir,
    spinner
  );

  // Ensure directories exist
  await ensureDirectories(outputDirs);

  // Backup existing files if --backup flag is set
  let backupDir: string | null = null;
  if (options.backup) {
    spinner.text = 'Backing up existing files...';
    backupDir = await backupExistingFiles(filesByDir);
    if (backupDir) {
      spinner.info(`Backup created: ${relative(process.cwd(), backupDir)}`);
    }
  }

  // Cleanup stale files
  await cleanupAllStaleFiles(filesByDir);

  // Write files
  spinner.text = 'Writing token files...';
  const filesWritten = await writeTokenFiles(filesByDir);
  const styleFilesWritten = await writeStandaloneStyleFiles(standaloneStyleFiles, defaultOutDir);

  // 11. Generate intermediate format
  spinner.text = 'Generating intermediate format...';
  await generateIntermediateFromBaseline(newBaseline, config);

  // 12. Generate docs if enabled
  let docsFilesWritten = 0;
  let docsDir = '';
  if (config.docsPages?.enabled) {
    spinner.text = 'Generating documentation...';
    const docsResult = await generateDocsFromBaseline(newBaseline, config);
    docsFilesWritten = docsResult.files.length;
    docsDir = docsResult.outputDir;
  }

  // 13. Check if build should run
  spinner.stop();
  const runBuild = await shouldRunBuild(config, options);

  let buildScriptRan = false;
  let cssFilesWritten = 0;

  if (runBuild) {
    spinner.start('Running build pipeline...');
    const buildResult = await runBuildPipeline(newBaseline, config, spinner);
    buildScriptRan = buildResult.scriptRan;
    cssFilesWritten = buildResult.cssFilesWritten;
    spinner.stop();
  }

  // 14. Generate report
  let reportPath: string | undefined;
  if (localBaseline) {
    reportPath = await generateReport(localBaseline, newBaseline, config, options);
  }

  return {
    filesWritten,
    styleFilesWritten,
    docsFilesWritten,
    cssFilesWritten,
    buildScriptRan,
    hasChanges: hasBaselineChanges,
    reportPath,
    docsDir: docsDir || undefined,
    backupDir: backupDir || undefined,
  };
}

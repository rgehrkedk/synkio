/**
 * Sync Pipeline Module
 *
 * Orchestrates the main sync flow from Figma fetch to file writing.
 * This module coordinates all the extracted modules to perform a sync.
 */

import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import type { BaselineData, ComparisonResult, StyleComparisonResult } from '../../types/index.js';
import { loadConfig, updateConfigWithCollectionRenames, updateConfigWithCollections } from '../config.js';
import { FigmaClient } from '../figma.js';
import { splitTokens, splitStyles, normalizePluginData, normalizeStyleData, hasStyles, getStyleCount } from '../tokens.js';
import type { SplitTokensOptions, StylesSplitOptions } from '../tokens.js';
import { readBaseline, writeBaseline } from '../baseline.js';
import { compareBaselines, hasChanges, getChangeCounts, generateDiffReport, printDiffSummary, compareStyleBaselines, hasStyleChanges, getStyleChangeCounts } from '../compare.js';
import { generateIntermediateFromBaseline, generateDocsFromBaseline } from '../output.js';
import { discoverCollectionsFromTokens } from '../utils/index.js';
import { filterPhantomModes } from '../../utils/figma.js';
import { createLogger } from '../../utils/logger.js';

import { buildFilesByDirectory, regenerateFromBaseline } from './regenerate.js';
import { mergeStylesIntoTokens } from './style-merger.js';
import { shouldBlockSync, displayBreakingChanges } from './breaking-changes.js';
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
      // Import and use printStyleDiffSummary from compare.js
      const { printStyleDiffSummary } = require('../compare.js');
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
  const syncConfig = config.sync || { report: true, reportHistory: false };
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

  const synkioDir = resolve(process.cwd(), '.synkio');
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
      throw new Error('No baseline found. Run synkio sync first to fetch tokens from Figma.');
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
  };
}

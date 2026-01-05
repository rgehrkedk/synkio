/**
 * Pull Command
 *
 * Fetches tokens from Figma, compares with local baseline, and updates baseline.json.
 * Does NOT write token files, CSS, or run builds - that's the build command's job.
 *
 * Exit codes:
 *   0 - Success (no breaking changes)
 *   1 - Breaking changes detected
 *   2 - Error (config, network, etc.)
 */

import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, updateConfigWithCollections, updateConfigWithCollectionRenames } from '../../core/config.js';
import { FigmaClient } from '../../core/figma.js';
import { normalizePluginData, normalizeStyleData, hasStyles, getStyleCount } from '../../core/tokens.js';
import { readBaseline, writeBaseline } from '../../core/baseline.js';
import {
  compareBaselines,
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
  printDiffSummary,
  compareStyleBaselines,
  hasStyleChanges,
  hasBreakingStyleChanges,
  getStyleChangeCounts,
  printStyleDiffSummary,
  compareBaselinesByPath,
  baselineHasIds,
  hasPathChanges,
  displayPathComparisonResult,
} from '../../core/compare.js';
import { discoverCollectionsFromTokens } from '../../core/utils/collection-discovery.js';
import { filterPhantomModes } from '../../utils/figma.js';
import { createLogger } from '../../utils/logger.js';
import type { BaselineData, ComparisonResult, StyleComparisonResult } from '../../types/index.js';
import {
  displayValueChanges,
  displayNewVariables,
  displayNewModes,
  displayStyleChanges,
  displayDiscoveredCollections,
  displayDiscoveredStyles,
} from '../../core/sync/display.js';
import { displayBreakingChanges } from '../../core/sync/breaking-changes.js';

/**
 * Pull command options
 */
export interface PullOptions {
  preview?: boolean;
  collection?: string;
  timeout?: number;
  watch?: boolean;
  interval?: number;
  config?: string;
}

/**
 * Result of pull operation
 */
export interface PullResult {
  hasChanges: boolean;
  hasBreakingChanges: boolean;
  isFirstSync: boolean;
  tokenChanges: {
    added: number;
    modified: number;
    deleted: number;
    pathChanges: number;
  };
  styleChanges: {
    added: number;
    modified: number;
    deleted: number;
    pathChanges: number;
  };
}

/**
 * Display pull summary showing all changes
 */
function displayPullSummary(
  result: ComparisonResult,
  styleResult: StyleComparisonResult,
  isFirstSync: boolean
): void {
  const counts = getChangeCounts(result);
  const styleCounts = getStyleChangeCounts(styleResult);

  if (isFirstSync) {
    console.log(chalk.cyan('\n  Initial pull from Figma\n'));
    console.log(chalk.green(`  Tokens: ${counts.newVariables} variables discovered`));
    if (styleCounts.newStyles > 0) {
      console.log(chalk.green(`  Styles: ${styleCounts.newStyles} styles discovered`));
    }
    console.log('');
    return;
  }

  const totalChanges = counts.total + styleCounts.total;

  if (totalChanges === 0) {
    console.log(chalk.dim('\n  No changes from Figma.\n'));
    return;
  }

  console.log(chalk.cyan(`\n  ${totalChanges} change(s) from Figma\n`));

  // Token changes
  if (counts.total > 0) {
    console.log(chalk.bold('  Tokens:'));
    if (counts.newVariables > 0) {
      console.log(chalk.green(`    + ${counts.newVariables} added`));
    }
    if (counts.valueChanges > 0) {
      console.log(chalk.yellow(`    ~ ${counts.valueChanges} modified`));
    }
    if (counts.pathChanges > 0) {
      console.log(chalk.red(`    ~ ${counts.pathChanges} renamed`));
    }
    if (counts.deletedVariables > 0) {
      console.log(chalk.red(`    - ${counts.deletedVariables} deleted`));
    }
    if (counts.newModes > 0) {
      console.log(chalk.green(`    + ${counts.newModes} new modes`));
    }
    if (counts.deletedModes > 0) {
      console.log(chalk.red(`    - ${counts.deletedModes} deleted modes`));
    }
    if (counts.collectionRenames > 0) {
      console.log(chalk.yellow(`    ~ ${counts.collectionRenames} collections renamed`));
    }
    if (counts.modeRenames > 0) {
      console.log(chalk.yellow(`    ~ ${counts.modeRenames} modes renamed`));
    }
  }

  // Style changes
  if (styleCounts.total > 0) {
    console.log(chalk.bold('\n  Styles:'));
    if (styleCounts.newStyles > 0) {
      console.log(chalk.green(`    + ${styleCounts.newStyles} added`));
    }
    if (styleCounts.valueChanges > 0) {
      console.log(chalk.yellow(`    ~ ${styleCounts.valueChanges} modified`));
    }
    if (styleCounts.pathChanges > 0) {
      console.log(chalk.red(`    ~ ${styleCounts.pathChanges} renamed`));
    }
    if (styleCounts.deletedStyles > 0) {
      console.log(chalk.red(`    - ${styleCounts.deletedStyles} deleted`));
    }
  }

  console.log('');
}

/**
 * Execute a single pull operation
 */
async function executePull(
  options: PullOptions,
  spinner: ReturnType<typeof ora>
): Promise<PullResult> {
  const logger = createLogger();

  // Load config
  spinner.text = 'Loading configuration...';
  let config = loadConfig(options.config);
  logger.debug('Config loaded', config);

  // Fetch from Figma
  spinner.text = 'Fetching data from Figma...';
  const timeout = options.timeout ? options.timeout * 1000 : undefined;
  const figmaClient = new FigmaClient({ ...config.figma, logger, timeout });
  const rawData = await figmaClient.fetchData();
  logger.debug('Figma data fetched');

  // Normalize tokens
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

  // Read existing baseline
  const localBaseline = await readBaseline();

  // Build new baseline (include figmaBaselineHash for code sync tracking)
  const newBaseline: BaselineData = {
    baseline: normalizedTokens,
    styles: normalizedStyles,
    metadata: {
      syncedAt: new Date().toISOString(),
      figmaBaselineHash: rawData.figmaBaselineHash,
    },
  };

  // Handle first sync - discover collections and update config
  const isFirstSync = !localBaseline;
  if (isFirstSync) {
    const discoveredCollections = discoverCollectionsFromTokens(normalizedTokens);

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
      config = loadConfig(options.config);
    }
  }

  // Handle bootstrap sync - baseline exists but has no IDs (from init-baseline)
  const isBootstrapSync = localBaseline && !baselineHasIds(localBaseline);
  if (isBootstrapSync) {
    spinner.stop();
    console.log(chalk.cyan('\n  Bootstrap sync detected\n'));
    console.log(chalk.dim('  Baseline has no Figma IDs. Using path-based comparison.\n'));

    const pathResult = compareBaselinesByPath(localBaseline, newBaseline);
    displayPathComparisonResult(pathResult);

    const hasChangesInBootstrap = hasPathChanges(pathResult);
    // Tokens only in code = breaking (they will be lost when building from new baseline)
    const hasBreakingInBootstrap = pathResult.onlyInCode.length > 0;

    // Preview mode for bootstrap
    if (options.preview) {
      console.log(chalk.cyan('  Preview Mode - No changes will be applied\n'));
      return {
        hasChanges: hasChangesInBootstrap,
        hasBreakingChanges: hasBreakingInBootstrap,
        isFirstSync: false,
        tokenChanges: {
          added: pathResult.onlyInFigma.length,
          modified: pathResult.valueChanges.length,
          deleted: pathResult.onlyInCode.length,
          pathChanges: 0,
        },
        styleChanges: { added: 0, modified: 0, deleted: 0, pathChanges: 0 },
      };
    }

    // Show breaking changes warning
    if (hasBreakingInBootstrap) {
      console.log(chalk.red.bold('\n  BREAKING CHANGES DETECTED\n'));
      console.log(chalk.yellow(`  ${pathResult.onlyInCode.length} token(s) exist only in code and will be lost.`));
      console.log(chalk.dim('  These tokens are not in Figma and will not be in the new baseline.\n'));
    }

    // Write Figma baseline (has IDs) - this replaces the init baseline
    spinner.start('Writing baseline with Figma variable IDs...');
    await writeBaseline(newBaseline, 'figma');

    spinner.succeed(chalk.green('Baseline updated with Figma variable IDs.'));

    if (hasBreakingInBootstrap) {
      console.log(chalk.yellow('\n  Breaking changes detected. Review carefully before running build.'));
      console.log(chalk.dim(`  Run ${chalk.cyan('synkio build --force')} to proceed despite breaking changes.\n`));
    } else {
      console.log(chalk.dim(`\n  Run ${chalk.cyan('synkio build')} to generate token files.\n`));
    }

    return {
      hasChanges: hasChangesInBootstrap,
      hasBreakingChanges: hasBreakingInBootstrap,
      isFirstSync: false,
      tokenChanges: {
        added: pathResult.onlyInFigma.length,
        modified: pathResult.valueChanges.length,
        deleted: pathResult.onlyInCode.length,
        pathChanges: 0,
      },
      styleChanges: { added: 0, modified: 0, deleted: 0, pathChanges: 0 },
    };
  }

  // Compare with local baseline
  let result: ComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    collectionRenames: [],
    modeRenames: [],
    newModes: [],
    deletedModes: [],
    newVariables: [],
    deletedVariables: [],
  };

  let styleResult: StyleComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    newStyles: [],
    deletedStyles: [],
  };

  if (localBaseline) {
    spinner.text = 'Comparing with local baseline...';
    result = compareBaselines(localBaseline, newBaseline);
    styleResult = compareStyleBaselines(localBaseline.styles, newBaseline.styles);
  } else {
    // For first sync, all tokens are "new"
    result.newVariables = Object.entries(normalizedTokens).map(([_, entry]) => ({
      variableId: entry.variableId || '',
      path: entry.path,
      value: entry.value,
      type: entry.type,
      collection: entry.collection,
      mode: entry.mode,
    }));

    if (normalizedStyles) {
      styleResult.newStyles = Object.entries(normalizedStyles).map(([_, entry]) => ({
        styleId: entry.styleId,
        path: entry.path,
        value: entry.value,
        styleType: entry.type,
      }));
    }
  }

  const hasTokenChanges = hasChanges(result);
  const hasStylesChanged = hasStyleChanges(styleResult);
  const hasAnyChanges = hasTokenChanges || hasStylesChanged;
  const hasBreaking = hasBreakingChanges(result) || hasBreakingStyleChanges(styleResult);

  // Preview mode - show changes without updating baseline
  if (options.preview) {
    spinner.stop();
    console.log(chalk.cyan('\n  Preview Mode - No changes will be applied\n'));

    if (isFirstSync) {
      displayPullSummary(result, styleResult, isFirstSync);
    } else if (hasAnyChanges) {
      displayPullSummary(result, styleResult, isFirstSync);
      printDiffSummary(result);
      if (hasStylesChanged) {
        printStyleDiffSummary(styleResult);
      }
    } else {
      console.log(chalk.dim('  No changes from Figma.\n'));
    }

    return {
      hasChanges: hasAnyChanges,
      hasBreakingChanges: hasBreaking,
      isFirstSync,
      tokenChanges: {
        added: result.newVariables.length,
        modified: result.valueChanges.length,
        deleted: result.deletedVariables.length,
        pathChanges: result.pathChanges.length,
      },
      styleChanges: {
        added: styleResult.newStyles.length,
        modified: styleResult.valueChanges.length,
        deleted: styleResult.deletedStyles.length,
        pathChanges: styleResult.pathChanges.length,
      },
    };
  }

  // Show changes summary
  spinner.stop();
  displayPullSummary(result, styleResult, isFirstSync);

  // Show breaking changes warning (but don't block - we still update baseline)
  if (hasBreaking) {
    displayBreakingChanges(result, styleResult);
  }

  // Show detailed changes for non-breaking changes
  if (hasTokenChanges && !hasBreaking) {
    displayValueChanges(result.valueChanges);
    displayNewVariables(result.newVariables);
    displayNewModes(result.newModes);
  }

  if (hasStylesChanged && !hasBreaking) {
    displayStyleChanges(styleResult);
  }

  // Write baseline (source: figma)
  spinner.start('Writing baseline...');
  await writeBaseline(newBaseline, 'figma');

  // Handle collection renames in config
  if (result.collectionRenames.length > 0) {
    spinner.text = 'Updating config with collection renames...';
    const configUpdateResult = updateConfigWithCollectionRenames(result.collectionRenames, options.config);
    if (configUpdateResult.updated && configUpdateResult.configPath) {
      const configFileName = configUpdateResult.configPath.split('/').pop();
      spinner.stop();
      console.log(chalk.cyan(`\n  Updated ${configFileName} with collection renames:`));
      for (const r of configUpdateResult.renames) {
        console.log(chalk.dim(`    ${r.old} -> ${r.new}`));
      }
      console.log('');
    }
  }

  spinner.succeed(chalk.green('Baseline updated.'));

  if (isFirstSync) {
    // First sync - guide user through next steps
    console.log(chalk.bold('\nNext steps:'));
    console.log(chalk.dim('  1. Review ') + chalk.cyan('synkio.config.json') + chalk.dim(' to configure:'));
    console.log(chalk.dim('     - tokens.collections.[name].splitBy: "mode" | "group" | "none"'));
    console.log(chalk.dim('     - build.css.enabled: true for CSS custom properties'));
    console.log(chalk.dim('     - docsPages.enabled: true for documentation site'));
    console.log(chalk.dim(`  2. Run ${chalk.cyan('synkio build')} to generate token files`));
    console.log(chalk.dim(`\n  Tip: After build, use ${chalk.cyan('synkio diff')} to check if files match baseline.\n`));
  } else if (hasBreaking) {
    console.log(chalk.yellow('\n  Breaking changes detected. Review carefully before running build.\n'));
  } else if (hasAnyChanges) {
    console.log(chalk.dim(`\n  Run ${chalk.cyan('synkio build')} to generate token files.\n`));
  }

  return {
    hasChanges: hasAnyChanges,
    hasBreakingChanges: hasBreaking,
    isFirstSync,
    tokenChanges: {
      added: result.newVariables.length,
      modified: result.valueChanges.length,
      deleted: result.deletedVariables.length,
      pathChanges: result.pathChanges.length,
    },
    styleChanges: {
      added: styleResult.newStyles.length,
      modified: styleResult.valueChanges.length,
      deleted: styleResult.deletedStyles.length,
      pathChanges: styleResult.pathChanges.length,
    },
  };
}

/**
 * Main pull command - fetches from Figma and updates baseline
 */
export async function pullCommand(options: PullOptions = {}): Promise<void> {
  const spinner = ora('Pulling tokens from Figma...').start();

  try {
    const result = await executePull(options, spinner);

    // Exit code 1 if breaking changes detected (for CI)
    if (result.hasBreakingChanges) {
      process.exit(1);
    }
  } catch (error: any) {
    spinner.fail(chalk.red(`Pull failed: ${error.message}`));
    const logger = createLogger();
    logger.error('Pull failed', { error });
    process.exit(2);
  }
}

/**
 * Watch mode - poll Figma for changes continuously
 */
export async function pullWatchCommand(options: PullOptions = {}): Promise<void> {
  const interval = (options.interval || 30) * 1000;
  const logger = createLogger();

  console.log(chalk.cyan(`\n  Watching for changes (every ${options.interval || 30}s)\n`));
  console.log(chalk.dim('  Press Ctrl+C to stop\n'));

  let lastBaseline: BaselineData | undefined = undefined;
  let isRunning = true;

  process.on('SIGINT', () => {
    isRunning = false;
    console.log(chalk.dim('\n\n  Watch stopped.\n'));
    process.exit(0);
  });

  try {
    const config = loadConfig(options.config);
    const timeout = options.timeout ? options.timeout * 1000 : undefined;
    const figmaClient = new FigmaClient({ ...config.figma, logger, timeout });

    lastBaseline = await readBaseline();

    if (lastBaseline) {
      console.log(chalk.dim(`  Baseline loaded. Last sync: ${lastBaseline.metadata.syncedAt}\n`));
    } else {
      console.log(chalk.yellow('  No baseline found. Running initial pull...\n'));
      await pullCommand({ ...options, watch: false });
      lastBaseline = await readBaseline();
    }

    while (isRunning) {
      const checkTime = new Date().toLocaleTimeString();
      process.stdout.write(chalk.dim(`  [${checkTime}] Checking Figma... `));

      try {
        const rawData = await figmaClient.fetchData();
        let normalizedTokens = normalizePluginData(rawData);
        normalizedTokens = filterPhantomModes(normalizedTokens);

        const normalizedStyles = hasStyles(rawData) ? normalizeStyleData(rawData) : undefined;

        const newBaseline: BaselineData = {
          baseline: normalizedTokens,
          styles: normalizedStyles,
          metadata: {
            syncedAt: new Date().toISOString(),
            figmaBaselineHash: rawData.figmaBaselineHash,
          },
        };

        if (lastBaseline) {
          const result = compareBaselines(lastBaseline, newBaseline);
          const styleResult = compareStyleBaselines(lastBaseline.styles, newBaseline.styles);

          if (hasChanges(result) || hasStyleChanges(styleResult)) {
            process.stdout.write(chalk.green('Changes detected!\n\n'));
            await pullCommand({ ...options, watch: false });
            lastBaseline = await readBaseline();
            console.log('');
          } else {
            process.stdout.write(chalk.dim('No changes\n'));
          }
        }
      } catch (err: any) {
        process.stdout.write(chalk.red(`Error: ${err.message}\n`));
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  } catch (error: any) {
    console.error(chalk.red(`\n  Watch failed: ${error.message}\n`));
    logger.error('Watch failed', { error });
    process.exit(2);
  }
}

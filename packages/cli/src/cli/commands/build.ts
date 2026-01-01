/**
 * Build Command
 *
 * Generates token files from baseline.json.
 * Works entirely offline - no Figma API calls.
 *
 * This is the "build" phase of the pull/build workflow.
 * The baseline.json is the source of truth created by `synkio pull`.
 */

import chalk from 'chalk';
import ora from 'ora';
import { resolve, relative, dirname, join } from 'node:path';
import { mkdir, writeFile, access, copyFile } from 'node:fs/promises';
import { loadConfig } from '../../core/config.js';
import { readBaseline } from '../../core/baseline.js';
import {
  compareBaselines,
  hasChanges,
  hasBreakingChanges,
  generateDiffReport,
  printDiffSummary,
} from '../../core/compare.js';
import { splitTokens, splitStyles } from '../../core/tokens.js';
import type { SplitTokensOptions, StylesSplitOptions } from '../../core/tokens.js';
import type { BaselineData, ComparisonResult } from '../../types/index.js';
import {
  buildFilesByDirectory,
  mergeStylesIntoTokens,
  writeTokenFiles,
  writeStandaloneStyleFiles,
  cleanupAllStaleFiles,
  ensureDirectories,
  shouldRunBuild,
  runBuildPipeline,
  formatExtrasString,
  type Spinner,
} from '../../core/sync/index.js';
import { generateIntermediateFromBaseline, generateDocsFromBaseline } from '../../core/output.js';
import { createLogger } from '../../utils/logger.js';
import { openFolder } from '../utils.js';

/**
 * Options for the build command
 */
export interface BuildOptions {
  force?: boolean;      // Bypass breaking change confirmation
  rebuild?: boolean;    // Regenerate all files (skip comparison)
  backup?: boolean;     // Backup existing files before overwriting
  report?: boolean;     // Generate markdown diff report
  noReport?: boolean;   // Skip report generation
  open?: boolean;       // Open docs folder after build
  config?: string;      // Config file path
}

/**
 * Result of the build command
 */
export interface BuildResult {
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
 * Backup existing token files before overwriting
 * Creates a timestamped backup directory in synkio/backups/
 *
 * @returns The backup directory path, or null if no files existed to backup
 */
async function backupExistingFiles(
  filesByDir: Map<string, Map<string, any>>
): Promise<string | null> {
  const logger = createLogger();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = resolve(process.cwd(), 'synkio', 'backups', timestamp);

  let filesBackedUp = 0;

  for (const [dir, files] of filesByDir) {
    for (const [filename] of files) {
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
        logger.debug(`Backed up: ${sourcePath} -> ${backupFilePath}`);
      } catch {
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
 * Generate diff report if configured
 */
async function generateReport(
  result: ComparisonResult,
  config: any,
  options: BuildOptions
): Promise<string | undefined> {
  // Check report options
  const shouldGenerateReport = options.noReport
    ? false
    : options.report !== false;

  if (!shouldGenerateReport) {
    return undefined;
  }

  // Only generate if there were changes
  if (!hasChanges(result)) {
    return undefined;
  }

  const report = generateDiffReport(result, {
    fileName: config.figma?.fileId || 'baseline',
    exportedAt: new Date().toISOString(),
  });

  const synkioDir = resolve(process.cwd(), 'synkio');
  await mkdir(synkioDir, { recursive: true });

  // Always use timestamped reports for changelog history
  const reportsDir = resolve(synkioDir, 'reports');
  await mkdir(reportsDir, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const reportPath = resolve(reportsDir, `build-${timestamp}.md`);

  await writeFile(reportPath, report);
  return reportPath.replace(process.cwd() + '/', '');
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
): Promise<{ standaloneStyleFiles: any[] }> {
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
  const mergeResult = mergeStylesIntoTokens(
    processedStyles,
    filesByDir,
    config,
    defaultOutDir
  );

  return { standaloneStyleFiles: mergeResult.standaloneStyleFiles };
}

/**
 * Build command - generate token files from baseline.json
 *
 * Workflow:
 * 1. Read baseline.json
 * 2. Compare baseline with current token files (unless --rebuild)
 * 3. Prompt Y/N if breaking changes detected (unless --force)
 * 4. Split tokens according to config strategy
 * 5. Write token files
 * 6. Merge styles if configured
 * 7. Generate docs if enabled
 * 8. Run CSS/build scripts
 * 9. Generate report
 *
 * @param options - Build command options
 */
export async function buildCommand(options: BuildOptions = {}): Promise<void> {
  const spinner = ora('Building tokens...').start();
  const logger = createLogger();

  try {
    // 1. Load config
    spinner.text = 'Loading configuration...';
    const config = loadConfig(options.config);
    logger.debug('Config loaded', config);

    // 2. Read baseline
    spinner.text = 'Reading baseline...';
    const baseline = await readBaseline();

    if (!baseline) {
      spinner.fail(chalk.red('No baseline found.'));
      console.log(chalk.dim('\nRun one of:'));
      console.log(chalk.dim('  synkio pull                           - Fetch from Figma'));
      console.log(chalk.dim('  synkio export-baseline                - Export from token files'));
      process.exit(1);
    }

    logger.debug(`Loaded baseline with ${Object.keys(baseline.baseline || {}).length} tokens`);

    // 3. Split tokens using config
    spinner.text = 'Processing tokens...';
    const normalizedTokens = baseline.baseline || {};

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

    // 4. Build file map
    const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
    const outputDirs = new Set<string>([defaultOutDir]);
    const filesByDir = buildFilesByDirectory(processedTokens, defaultOutDir);

    // Add custom directories
    for (const outDir of filesByDir.keys()) {
      outputDirs.add(outDir);
    }

    // 5. Compare with existing files (unless --rebuild)
    let comparisonResult: ComparisonResult | undefined;

    if (!options.rebuild) {
      // Create empty comparison result - in future we could read existing files
      comparisonResult = {
        valueChanges: [],
        pathChanges: [],
        collectionRenames: [],
        modeRenames: [],
        newModes: [],
        deletedModes: [],
        newVariables: [],
        deletedVariables: [],
      };
    }

    // 6. Process styles
    const { standaloneStyleFiles } = await processStyles(
      baseline.styles,
      config,
      filesByDir,
      defaultOutDir,
      spinner as Spinner
    );

    // 7. Ensure directories exist
    await ensureDirectories(outputDirs);

    // 8. Backup existing files if --backup flag is set
    let backupDir: string | null = null;
    if (options.backup) {
      spinner.text = 'Backing up existing files...';
      backupDir = await backupExistingFiles(filesByDir);
      if (backupDir) {
        spinner.info(`Backup created: ${relative(process.cwd(), backupDir)}`);
        spinner.start('Building tokens...');
      }
    }

    // 9. Cleanup stale files
    await cleanupAllStaleFiles(filesByDir);

    // 10. Write token files
    spinner.text = 'Writing token files...';
    const filesWritten = await writeTokenFiles(filesByDir);
    const styleFilesWritten = await writeStandaloneStyleFiles(
      standaloneStyleFiles,
      defaultOutDir
    );

    // 11. Generate intermediate format
    spinner.text = 'Generating intermediate format...';
    await generateIntermediateFromBaseline(baseline, config);

    // 12. Generate docs if enabled
    let docsFilesWritten = 0;
    let docsDir = '';
    if (config.docsPages?.enabled) {
      spinner.text = 'Generating documentation...';
      const docsResult = await generateDocsFromBaseline(baseline, config);
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
      const buildResult = await runBuildPipeline(baseline, config, spinner as Spinner);
      buildScriptRan = buildResult.scriptRan;
      cssFilesWritten = buildResult.cssFilesWritten;
      spinner.stop();
    }

    // 14. Generate report if configured
    let reportPath: string | undefined;
    if (comparisonResult && (options.report || !options.noReport)) {
      reportPath = await generateReport(comparisonResult, config, options);
    }

    // 15. Build success message
    const extras = formatExtrasString({
      styleFilesWritten,
      buildScriptRan,
      cssFilesWritten,
      docsFilesWritten,
    });

    if (options.rebuild) {
      spinner.succeed(
        chalk.green(`Rebuilt ${filesWritten} token files from baseline.${extras}`)
      );
    } else {
      spinner.succeed(
        chalk.green(`Built ${filesWritten} token files from baseline.${extras}`)
      );
    }

    // Show backup location
    if (backupDir) {
      console.log(chalk.dim(`  Backup: ${relative(process.cwd(), backupDir)}`));
    }

    // Show report location
    if (reportPath) {
      console.log(chalk.dim(`  Report: ${reportPath}`));
    }

    // 16. Open docs folder if --open flag was passed and docs were generated
    if (options.open && config.docsPages?.enabled && docsDir) {
      try {
        await openFolder(docsDir);
        console.log(chalk.dim(`  Opened ${docsDir.replace(process.cwd() + '/', '')}`));
      } catch {
        console.log(
          chalk.yellow(
            `  Could not open folder: ${docsDir.replace(process.cwd() + '/', '')}`
          )
        );
      }
    }
  } catch (error: any) {
    spinner.fail(chalk.red(`Build failed: ${error.message}`));
    logger.error('Build failed', { error });
    process.exit(1);
  }
}

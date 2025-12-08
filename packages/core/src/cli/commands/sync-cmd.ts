/**
 * Sync Command (Modern)
 *
 * Fetch and apply tokens from Figma with modern CLI UX.
 * Uses spinners, colored output, and tables for better user experience.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { initContext } from '../../context.js';
import { loadEnv } from '../../env.js';
import type { ResolvedConfig, ComparisonResult } from '../../types/index.js';
import {
  loadConfigOrThrow,
  loadBaseline,
  backupBaseline,
  restoreBaseline,
  saveJsonFile,
  saveTextFile,
  ensureFigmaDir,
  getBaselinePath,
  getDiffReportPath,
  loadTokenMap,
} from '../../files/index.js';
import { fetchFigmaData } from '../../figma/index.js';
import {
  splitTokens,
  scanAllPlatforms,
  scanAllPlatformsWithMap,
  generateMultiPlatformDiffReport,
  applyAllPlatformReplacements,
  generateTokenMap,
  getTokenMapPath,
} from '../../tokens/index.js';
import type { PlatformScanResult } from '../../tokens/index.js';
import type { PlatformConfig } from '../../types/index.js';
import {
  compareBaselines,
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
  generateDiffReport,
} from '../../compare/index.js';
import {
  formatSuccess,
  formatWarning,
  formatInfo,
  createSpinner,
  createTable,
  logInfo,
} from '../utils.js';
import { askYesNo, askChoice, createPrompt } from '../prompt.js';
import { getMigrationReportPath } from '../../files/index.js';

// ============================================================================
// Types
// ============================================================================

interface SyncOptions {
  dryRun?: boolean;
  backup?: boolean;
  build?: boolean;
}

// ============================================================================
// Build Utilities
// ============================================================================

/**
 * Run build command if configured
 */
function runBuildCommand(config: ResolvedConfig, skipBuild: boolean): void {
  if (skipBuild) {
    logInfo('Skipping build command (--no-build flag)');
    return;
  }

  if (!config.build?.command) {
    return;
  }

  const spinner = createSpinner('Running build command...');
  spinner.start();

  try {
    execSync(config.build.command, { stdio: 'inherit' });
    spinner.succeed('Build completed successfully');
  } catch (error) {
    spinner.warn('Build command failed');
    console.log(formatWarning(`Build command failed. You can run it manually:\n${config.build.command}`));
  }
}

// ============================================================================
// Diff Display
// ============================================================================

/**
 * Display changes in a formatted table
 */
function displayChangesTable(result: ComparisonResult): void {
  const changes: Array<{ path: string; oldValue: any; newValue: any; type: string }> = [];

  // Collect all changes
  changes.push(...result.valueChanges.map(c => ({
    path: c.path,
    oldValue: c.oldValue,
    newValue: c.newValue,
    type: 'modified',
  })));

  changes.push(...result.pathChanges.map(c => ({
    path: c.newPath,
    oldValue: c.oldPath,
    newValue: c.newPath,
    type: 'renamed',
  })));

  changes.push(...result.newVariables.map(c => ({
    path: c.path,
    oldValue: null,
    newValue: c.value,
    type: 'added',
  })));

  changes.push(...result.deletedVariables.map(c => ({
    path: c.path,
    oldValue: c.value,
    newValue: null,
    type: 'removed',
  })));

  if (changes.length === 0) {
    return;
  }

  // Show up to 10 changes in table
  const displayCount = Math.min(changes.length, 10);
  const rows = changes.slice(0, displayCount).map(change => {
    const oldValue = String(change.oldValue || '-');
    const newValue = String(change.newValue || '-');
    const type = change.type;

    // Color-code based on change type
    let coloredType = type;
    if (type === 'added') {
      coloredType = chalk.green(type);
    } else if (type === 'removed') {
      coloredType = chalk.red(type);
    } else if (type === 'modified') {
      coloredType = chalk.yellow(type);
    } else if (type === 'renamed') {
      coloredType = chalk.cyan(type);
    }

    return [
      change.path,
      oldValue.substring(0, 30),
      newValue.substring(0, 30),
      coloredType,
    ];
  });

  const table = createTable(
    ['Token Path', 'Old Value', 'New Value', 'Type'],
    rows
  );

  console.log('\n' + table.toString());

  if (changes.length > displayCount) {
    console.log(chalk.gray(`\n... and ${changes.length - displayCount} more changes`));
  }
}

/**
 * Display change summary
 */
function displaySummary(result: ComparisonResult): void {
  const counts = getChangeCounts(result);

  console.log('\nChanges detected:');
  if (result.newVariables.length > 0) {
    console.log(chalk.green(`  + ${result.newVariables.length} added`));
  }
  if (result.deletedVariables.length > 0) {
    console.log(chalk.red(`  - ${result.deletedVariables.length} removed`));
  }
  if (result.valueChanges.length > 0) {
    console.log(chalk.yellow(`  ~ ${result.valueChanges.length} modified`));
  }
  if (result.pathChanges.length > 0) {
    console.log(chalk.cyan(`  → ${result.pathChanges.length} renamed`));
  }
  console.log(chalk.bold(`  = ${counts.total} total changes`));

  if (counts.breaking > 0) {
    console.log(chalk.red.bold(`\n⚠ ${counts.breaking} breaking changes detected!`));
  }
}

// ============================================================================
// Sync Handlers
// ============================================================================

/**
 * Handle first-time sync (no previous baseline)
 */
async function handleFirstSync(
  config: ResolvedConfig,
  fetchedData: any
): Promise<void> {
  console.log(formatInfo('First sync - no previous baseline found'));

  const spinner = createSpinner('Processing tokens...');
  spinner.start();

  const splitResult = splitTokens(fetchedData, config);
  spinner.succeed(`Processed ${splitResult.filesWritten} token files`);

  // Generate token map for migration support
  const mapSpinner = createSpinner('Generating token map...');
  mapSpinner.start();
  const tokenMap = generateTokenMap(fetchedData, config);
  const tokenMapPath = getTokenMapPath(config);
  saveJsonFile(tokenMapPath, tokenMap);
  mapSpinner.succeed(`Token map saved: ${tokenMapPath}`);

  runBuildCommand(config, false);

  console.log(formatSuccess('Initial sync complete!\n\nTokens have been saved to your project.'));
}

/**
 * Handle sync with no changes
 */
async function handleNoChanges(): Promise<void> {
  console.log(formatInfo('No changes detected. Your tokens are up to date.'));
}

/**
 * Handle sync with breaking changes (renames, deletions)
 * Scans platforms for impact, offers choice to apply migrations or just get report
 */
async function handleBreakingChanges(
  config: ResolvedConfig,
  fetchedData: any,
  result: ComparisonResult,
  options: SyncOptions
): Promise<void> {
  const counts = getChangeCounts(result);

  // Display changes
  displaySummary(result);
  displayChangesTable(result);

  // If dry run, stop here
  if (options.dryRun) {
    console.log(formatInfo('Dry run mode - no changes applied.\n\nRun without --dry-run to apply these changes.'));
    restoreBaseline();
    return;
  }

  // Get enabled platforms and scan for impact
  const platforms = (config.migration?.platforms && typeof config.migration.platforms === 'object' && !Array.isArray(config.migration.platforms)) ? config.migration.platforms : {};
  const enabledPlatforms = Object.entries(platforms)
    .filter(([_, cfg]) => (cfg as PlatformConfig).enabled)
    .map(([name]) => name);

  let platformResults: PlatformScanResult[] = [];
  const hasUsages = () => platformResults.some(p => p.totalUsages > 0);

  if (enabledPlatforms.length > 0) {
    const scanSpinner = createSpinner(`Scanning ${enabledPlatforms.length} platform(s) for impact...`);
    scanSpinner.start();

    // Try to use token map for precise migration (preferred)
    const oldTokenMap = loadTokenMap(config);
    const newTokenMap = generateTokenMap(fetchedData, config);

    if (oldTokenMap) {
      // Use token map for precise matching (recommended)
      platformResults = await scanAllPlatformsWithMap(
        oldTokenMap,
        newTokenMap,
        platforms as { [key: string]: PlatformConfig }
      );
      scanSpinner.succeed(`Scanned ${enabledPlatforms.length} platform(s) using token map`);
    } else {
      // Fallback to path-based matching
      console.log(formatWarning('\nNo token map found. Using path-based matching (less precise).'));
      console.log(formatInfo('Token map will be generated after this sync for future migrations.\n'));
      platformResults = await scanAllPlatforms(
        result,
        platforms as { [key: string]: PlatformConfig },
        config.migration?.stripSegments
      );
      scanSpinner.succeed(`Scanned ${enabledPlatforms.length} platform(s)`);
    }

    // Print per-platform summary
    console.log('');
    for (const platformResult of platformResults) {
      if (!platformResult.replacements.length) continue;

      const platformTitle = platformResult.platform.charAt(0).toUpperCase() + platformResult.platform.slice(1);

      if (platformResult.totalUsages > 0) {
        console.log(chalk.yellow(`${platformTitle}: ${platformResult.totalUsages} usage(s) in ${platformResult.filesAffected} file(s)`));
        for (const file of platformResult.usages.slice(0, 3)) {
          console.log(chalk.gray(`  - ${file.path} (${file.count})`));
        }
        if (platformResult.usages.length > 3) {
          console.log(chalk.gray(`  ... and ${platformResult.usages.length - 3} more files`));
        }
      } else {
        console.log(chalk.gray(`${platformTitle}: No usages found`));
      }
    }
    console.log('');
  } else {
    console.log(formatWarning('\nNo migration platforms configured. Token references won\'t be auto-updated.\nRun "synkio init" and enable migration to set up auto-migration.\n'));
  }

  // Build choice options based on what was found
  type SyncChoice = 'apply-all' | 'tokens-only' | 'report-only' | 'abort';

  const choices: Array<{ value: SyncChoice; label: string; description?: string }> = [];

  if (hasUsages()) {
    choices.push({
      value: 'apply-all',
      label: 'Apply all changes',
      description: 'Update tokens + auto-migrate affected files',
    });
  }

  choices.push({
    value: 'tokens-only',
    label: 'Tokens only',
    description: 'Update tokens, generate migration report for manual updates',
  });

  choices.push({
    value: 'report-only',
    label: 'Report only',
    description: 'Generate migration report without applying any changes',
  });

  choices.push({
    value: 'abort',
    label: 'Abort',
    description: 'Cancel sync, no changes made',
  });

  const rl = createPrompt();
  let choice: SyncChoice;
  try {
    choice = await askChoice<SyncChoice>(rl, 'How do you want to proceed?', choices, hasUsages() ? 0 : 0);
  } finally {
    rl.close();
  }

  if (choice === 'abort') {
    restoreBaseline();
    console.log(formatWarning('Sync aborted. No changes made.'));
    return;
  }

  // Generate and save migration report (for all non-abort choices)
  if (platformResults.length > 0) {
    const migrationReport = generateMultiPlatformDiffReport(platformResults, fetchedData.$metadata);
    saveTextFile(getMigrationReportPath(), migrationReport);
    logInfo(`Migration report saved: ${getMigrationReportPath()}`);
  }

  if (choice === 'report-only') {
    restoreBaseline();
    console.log(formatInfo('No token changes applied. Review the migration report.'));
    return;
  }

  // Apply token changes (tokens-only or apply-all)
  const spinner = createSpinner('Applying token changes...');
  spinner.start();

  const splitResult = splitTokens(fetchedData, config);
  spinner.succeed(`Applied changes to ${splitResult.filesWritten} files`);

  // Generate token map for migration support
  const mapSpinner = createSpinner('Generating token map...');
  mapSpinner.start();
  const tokenMap = generateTokenMap(fetchedData, config);
  const tokenMapPath = getTokenMapPath(config);
  saveJsonFile(tokenMapPath, tokenMap);
  mapSpinner.succeed(`Token map saved: ${tokenMapPath}`);

  // Apply migrations if user chose apply-all
  if (choice === 'apply-all' && hasUsages()) {
    const migrateSpinner = createSpinner('Applying migrations...');
    migrateSpinner.start();

    // Build the data structure expected by applyAllPlatformReplacements
    const platformReplacementsData = platformResults
      .filter(p => p.totalUsages > 0)
      .map(p => ({
        platform: p.platform,
        replacements: p.replacements,
        config: platforms[p.platform] as PlatformConfig,
      }));

    const migrationResults = await applyAllPlatformReplacements(platformReplacementsData);

    const totalModified = migrationResults.reduce((sum, r) => sum + r.filesModified, 0);
    const totalReplacements = migrationResults.reduce((sum, r) => sum + r.totalReplacements, 0);

    migrateSpinner.succeed(`Migrated ${totalReplacements} token reference(s) in ${totalModified} file(s)`);
  } else if (choice === 'tokens-only') {
    console.log(formatInfo('Review the migration report and update affected files manually.'));
  }

  // Save diff report
  const report = generateDiffReport(result, fetchedData.$metadata);
  saveTextFile(getDiffReportPath(), report);
  logInfo(`Diff report saved: ${getDiffReportPath()}`);

  // Run build
  runBuildCommand(config, options.build === false);

  console.log(formatSuccess(`Sync complete!\n\nApplied ${counts.total} change(s) (${counts.breaking} breaking) to your tokens.`));
}

/**
 * Handle sync with non-breaking changes only
 */
async function handleChanges(
  config: ResolvedConfig,
  fetchedData: any,
  result: ComparisonResult,
  options: SyncOptions
): Promise<void> {
  // Display changes
  displaySummary(result);
  displayChangesTable(result);

  // If dry run, stop here
  if (options.dryRun) {
    console.log(formatInfo('Dry run mode - no changes applied.\n\nRun without --dry-run to apply these changes.'));
    // Restore backup since we're not applying
    restoreBaseline();
    return;
  }

  // Confirm with user
  const counts = getChangeCounts(result);
  const rl = createPrompt();
  try {
    const proceed = await askYesNo(rl, '\nApply these changes?', true);
    if (!proceed) {
      restoreBaseline();
      console.log(formatWarning('Sync cancelled. No changes applied.'));
      return;
    }
  } finally {
    rl.close();
  }

  // Apply changes
  const spinner = createSpinner('Applying token changes...');
  spinner.start();

  const splitResult = splitTokens(fetchedData, config);
  spinner.succeed(`Applied changes to ${splitResult.filesWritten} files`);

  // Generate token map for migration support
  const mapSpinner = createSpinner('Generating token map...');
  mapSpinner.start();
  const tokenMap = generateTokenMap(fetchedData, config);
  const tokenMapPath = getTokenMapPath(config);
  saveJsonFile(tokenMapPath, tokenMap);
  mapSpinner.succeed(`Token map saved: ${tokenMapPath}`);

  // Save the new baseline as current (already done on line 338, but baselinePrev needs update)
  // The backup we made earlier becomes the new baselinePrev automatically via backupBaseline()
  // So we don't need to do anything else - the backup system handles it!

  // Save diff report
  const report = generateDiffReport(result, fetchedData.$metadata);
  saveTextFile(getDiffReportPath(), report);
  logInfo(`Diff report saved: ${getDiffReportPath()}`);

  // Run build
  runBuildCommand(config, options.build === false);

  console.log(formatSuccess(`Sync complete!\n\nApplied ${counts.total} change(s) to your tokens.`));
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Sync command handler
 */
export async function syncCommand(options: SyncOptions = {}): Promise<void> {
  // Initialize context
  initContext({ rootDir: process.cwd() });

  // Load environment variables from .env files
  loadEnv();

  console.log(chalk.bold.cyan('\nSynkio Token Sync\n'));

  // Load config
  let config: ResolvedConfig;
  try {
    config = loadConfigOrThrow();
  } catch (error) {
    throw new Error(
      `Configuration not found.\n\nRun 'synkio init' to create a configuration file.`
    );
  }

  // Ensure directories exist
  ensureFigmaDir();

  // Backup current baseline (unless --no-backup)
  if (options.backup !== false) {
    // Manually backup using config paths (not hardcoded paths)
    if (fs.existsSync(config.paths.baseline)) {
      const dataDir = path.dirname(config.paths.baseline);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.copyFileSync(config.paths.baseline, config.paths.baselinePrev);
      logInfo('Created backup of current baseline');
    }
  }

  // Fetch from Figma
  const fetchSpinner = createSpinner('Fetching tokens from Figma...');
  fetchSpinner.start();

  let fetchedData;
  try {
    fetchedData = await fetchFigmaData({
      fileId: config.figma.fileId,
      nodeId: config.figma.nodeId,
    });
    fetchSpinner.succeed('Fetched tokens from Figma');
  } catch (error) {
    fetchSpinner.fail('Failed to fetch from Figma');
    if (options.backup !== false) {
      restoreBaseline();
    }
    throw new Error(
      `Could not fetch from Figma: ${error instanceof Error ? error.message : String(error)}\n\nPlease check your configuration and network connection.`
    );
  }

  // Show metadata
  if (fetchedData.$metadata) {
    logInfo(`File: ${fetchedData.$metadata.fileName}`);
    logInfo(`Exported: ${new Date(fetchedData.$metadata.exportedAt).toLocaleString()}`);
  }

  // Save as new baseline
  saveJsonFile(config.paths.baseline, fetchedData);

  // Load previous baseline for comparison
  const previousBaseline = loadBaseline(config.paths.baselinePrev);

  // Handle first sync
  if (!previousBaseline) {
    await handleFirstSync(config, fetchedData);
    return;
  }

  // Compare baselines
  const compareSpinner = createSpinner('Comparing with previous baseline...');
  compareSpinner.start();

  const result = compareBaselines(previousBaseline, fetchedData);
  compareSpinner.succeed('Comparison complete');

  // Handle based on changes
  if (!hasChanges(result)) {
    await handleNoChanges();
  } else if (hasBreakingChanges(result)) {
    // Breaking changes: offer migration options
    await handleBreakingChanges(config, fetchedData, result, options);
  } else {
    // Non-breaking changes only
    await handleChanges(config, fetchedData, result, options);
  }
}

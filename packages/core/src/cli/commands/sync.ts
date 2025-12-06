/**
 * Figma Sync
 *
 * Main sync script that fetches from Figma, detects changes,
 * and handles both value changes and breaking changes (with migration).
 *
 * Usage:
 *   npm run figma:sync
 */

import { execSync } from 'child_process';

import { initContext } from '../../context';
import type { TokensConfig, ComparisonResult } from '../../types';

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
  getMigrationReportPath,
} from '../../files';

import { fetchFigmaData } from '../../figma';

import {
  splitTokens,
  scanAllPlatforms,
  generateMultiPlatformDiffReport,
  applyAllPlatformReplacements,
} from '../../tokens';

import type { PlatformScanResult } from '../../tokens';

import type { PlatformConfig } from '../../types';

import {
  compareBaselines,
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
  generateDiffReport,
  printDiffSummary,
} from '../../compare';

import { createPrompt, askYesNo, askChoice } from '../prompt';

/**
 * Build CSS from token files
 */
function buildCss(): boolean {
  try {
    console.log('\nBuilding CSS...');
    execSync('npm run tokens:build', { stdio: 'inherit' });
    return true;
  } catch {
    console.log('\nWarning: CSS build failed. Run "npm run tokens:build" manually.');
    return false;
  }
}

/**
 * Handle sync with no changes
 */
function handleNoChanges(): void {
  console.log('\n✓ No changes detected. Already up to date.\n');
}

/**
 * Handle sync with only value changes (non-breaking)
 */
async function handleValueChanges(
  config: TokensConfig,
  fetchedData: any,
  result: ComparisonResult,
  rl: any
): Promise<boolean> {
  const counts = getChangeCounts(result);

  console.log(`\n✓ ${counts.valueChanges} value change(s) detected (non-breaking)\n`);

  // Show summary
  console.log('Changes:');
  for (const change of result.valueChanges.slice(0, 5)) {
    console.log(`  - ${change.path}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`);
  }
  if (result.valueChanges.length > 5) {
    console.log(`  ... and ${result.valueChanges.length - 5} more`);
  }
  console.log();

  // Confirm
  const proceed = await askYesNo(rl, 'Apply changes?', true);
  if (!proceed) {
    // Restore backup
    restoreBaseline();
    console.log('\nSync cancelled. Baseline restored.\n');
    return false;
  }

  // Split tokens
  console.log('\nSplitting tokens...');
  const splitResult = splitTokens(fetchedData, config);
  console.log(`  ${splitResult.filesWritten} files written`);

  // Build CSS
  buildCss();

  // Save report
  const report = generateDiffReport(result, fetchedData.$metadata);
  saveTextFile(getDiffReportPath(), report);

  console.log(`\n✓ Synced ${counts.valueChanges} value change(s)\n`);
  return true;
}

/**
 * Handle sync with breaking changes
 * Scans platforms for impact, offers choice to apply migrations or just get report
 */
async function handleBreakingChanges(
  config: TokensConfig,
  fetchedData: any,
  result: ComparisonResult,
  rl: any
): Promise<boolean> {
  const counts = getChangeCounts(result);

  console.log('\n' + '!'.repeat(60));
  console.log('  BREAKING CHANGES DETECTED');
  console.log('!'.repeat(60) + '\n');

  // Print summary
  printDiffSummary(result);

  // Get enabled platforms and scan for impact
  const platforms = (config.migration?.platforms && typeof config.migration.platforms === 'object' && !Array.isArray(config.migration.platforms)) ? config.migration.platforms : {};
  const enabledPlatforms = Object.entries(platforms)
    .filter(([_, cfg]) => (cfg as PlatformConfig).enabled)
    .map(([name]) => name);

  let platformResults: PlatformScanResult[] = [];
  const hasUsages = () => platformResults.some(p => p.totalUsages > 0);

  if (enabledPlatforms.length > 0) {
    console.log(`Scanning ${enabledPlatforms.length} platform(s) for impact...`);
    console.log(`  Platforms: ${enabledPlatforms.join(', ')}\n`);

    platformResults = await scanAllPlatforms(result, platforms as { [key: string]: PlatformConfig });

    // Print per-platform summary
    for (const platformResult of platformResults) {
      if (!platformResult.replacements.length) continue;

      const platformTitle = platformResult.platform.charAt(0).toUpperCase() + platformResult.platform.slice(1);

      if (platformResult.totalUsages > 0) {
        console.log(`${platformTitle}: ${platformResult.totalUsages} usage(s) in ${platformResult.filesAffected} file(s)`);
        for (const file of platformResult.usages.slice(0, 3)) {
          console.log(`  - ${file.path} (${file.count})`);
        }
        if (platformResult.usages.length > 3) {
          console.log(`  ... and ${platformResult.usages.length - 3} more files`);
        }
      } else {
        console.log(`${platformTitle}: No usages found`);
      }
    }
    console.log();
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

  const choice = await askChoice<SyncChoice>(rl, 'How do you want to proceed?', choices, hasUsages() ? 0 : 1);

  if (choice === 'abort') {
    restoreBaseline();
    console.log('\nSync aborted. No changes made.\n');
    return false;
  }

  // Generate and save migration report (for all non-abort choices)
  if (platformResults.length > 0) {
    const migrationReport = generateMultiPlatformDiffReport(platformResults, fetchedData.$metadata);
    saveTextFile(getMigrationReportPath(), migrationReport);
    console.log(`\nMigration report saved: ${getMigrationReportPath()}`);
  }

  if (choice === 'report-only') {
    restoreBaseline();
    console.log('No token changes applied. Review the migration report.\n');
    return false;
  }

  // Apply token changes (tokens-only or apply-all)
  console.log('\nSplitting tokens...');
  const splitResult = splitTokens(fetchedData, config);
  console.log(`  ${splitResult.filesWritten} files written`);

  // Apply migrations if user chose apply-all
  if (choice === 'apply-all' && hasUsages()) {
    console.log('\nApplying migrations...');

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

    console.log(`\n✓ Migrated ${totalReplacements} token reference(s) in ${totalModified} file(s)`);
  } else if (choice === 'tokens-only') {
    console.log('\nReview the migration report and update affected files manually.');
  }

  // Build CSS
  buildCss();

  // Save diff report
  const report = generateDiffReport(result, fetchedData.$metadata);
  saveTextFile(getDiffReportPath(), report);

  console.log(`\n✓ Applied ${counts.total} token change(s) (${counts.breaking} breaking)\n`);
  return true;
}

/**
 * Main sync function
 */
async function main() {
  // Initialize context
  initContext({ rootDir: process.cwd() });

  console.log('\n' + '='.repeat(60));
  console.log('  Figma Token Sync');
  console.log('='.repeat(60) + '\n');

  // Load config
  let config: TokensConfig;
  try {
    config = loadConfigOrThrow();
  } catch (error) {
    console.error(`${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Ensure directories exist
  ensureFigmaDir();

  // Backup current baseline
  const hadBaseline = backupBaseline();
  if (hadBaseline) {
    console.log('Backed up current baseline');
  }

  // Fetch from Figma
  console.log('Fetching from Figma...\n');
  let fetchedData;
  try {
    fetchedData = await fetchFigmaData({
      fileId: config.figma.fileId,
      nodeId: config.figma.nodeId,
    });
  } catch (error) {
    console.error(`Fetch failed: ${error instanceof Error ? error.message : error}`);
    if (hadBaseline) {
      restoreBaseline();
      console.log('Baseline restored.');
    }
    process.exit(1);
  }

  // Save fetched data as new baseline
  saveJsonFile(getBaselinePath(), fetchedData);

  // Show metadata
  if (fetchedData.$metadata) {
    console.log(`File: ${fetchedData.$metadata.fileName}`);
    console.log(`Exported: ${fetchedData.$metadata.exportedAt}`);
  }

  // Load previous baseline for comparison
  const previousBaseline = loadBaseline(config.paths.baselinePrev);

  // If no previous baseline, this is first sync
  if (!previousBaseline) {
    console.log('\nFirst sync - no previous baseline to compare.\n');

    // Split tokens
    console.log('Splitting tokens...');
    const splitResult = splitTokens(fetchedData, config);
    console.log(`  ${splitResult.filesWritten} files written`);

    // Build CSS
    buildCss();

    console.log('\n✓ Initial sync complete!\n');
    process.exit(0);
  }

  // Compare baselines
  const result = compareBaselines(previousBaseline, fetchedData);

  // Create readline interface for prompts
  const rl = createPrompt();

  try {
    // Route based on change type
    if (!hasChanges(result)) {
      handleNoChanges();
    } else if (hasBreakingChanges(result)) {
      await handleBreakingChanges(config, fetchedData, result, rl);
    } else {
      await handleValueChanges(config, fetchedData, result, rl);
    }
  } finally {
    rl.close();
  }
}

main();

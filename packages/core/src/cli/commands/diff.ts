/**
 * Figma Diff
 *
 * Preview changes from Figma without applying them.
 * Shows what would change if you run figma:sync.
 * Optionally apply file migrations without updating tokens.
 *
 * Usage:
 *   npm run figma:diff             # Compare Figma against current baseline
 *   npm run figma:diff --local     # Compare current baseline against previous (no Figma fetch)
 *   npm run figma:diff --apply     # Apply file migrations (not token changes)
 *   npm run figma:diff --dry-run   # Preview what --apply would change
 */

import { initContext } from '../../context';
import {
  loadConfigOrThrow,
  loadBaseline,
  loadBaselinePrev,
  saveTextFile,
  ensureFigmaDir,
  getBaselinePath,
  getDiffReportPath,
} from '../../files';

import { fetchFigmaData } from '../../figma';

import {
  compareBaselines,
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
  generateDiffReport,
  printDiffSummary,
} from '../../compare';

import {
  scanAllPlatforms,
  generateMultiPlatformDiffReport,
  applyAllPlatformReplacements,
} from '../../tokens';

import type { PlatformScanResult } from '../../tokens';
import type { PlatformConfig } from '../../types';

import { createPrompt, askChoice } from '../prompt';

/**
 * Parse command line arguments
 */
function parseArgs(): { local: boolean; apply: boolean; dryRun: boolean } {
  const args = process.argv.slice(2);
  return {
    local: args.includes('--local'),
    apply: args.includes('--apply'),
    dryRun: args.includes('--dry-run'),
  };
}

/**
 * Main diff function
 */
async function main() {
  // Initialize context
  initContext({ rootDir: process.cwd() });

  const { local, apply, dryRun } = parseArgs();

  console.log('\n' + '='.repeat(60));
  console.log('  Figma Token Diff (Preview)');
  console.log('='.repeat(60) + '\n');

  // Ensure directories exist
  ensureFigmaDir();

  let baselineData;
  let comparisonData;
  let metadata;

  if (local) {
    // Compare current baseline against previous (no Figma fetch)
    console.log('Mode: Local comparison (current vs previous baseline)\n');

    baselineData = loadBaselinePrev();
    if (!baselineData) {
      console.log('No previous baseline found. Nothing to compare.\n');
      console.log('Run "npm run figma:sync" first to create a baseline.\n');
      process.exit(0);
    }

    comparisonData = loadBaseline();
    if (!comparisonData) {
      console.log('No current baseline found.\n');
      process.exit(1);
    }

    metadata = comparisonData.$metadata;
    console.log('Comparing:');
    console.log(`  Previous: ${baselineData.$metadata?.exportedAt || 'unknown'}`);
    console.log(`  Current:  ${comparisonData.$metadata?.exportedAt || 'unknown'}`);
  } else {
    // Fetch from Figma and compare
    console.log('Mode: Figma comparison (fetching latest)\n');

    baselineData = loadBaseline();
    if (!baselineData) {
      console.log('No baseline found. Run "npm run figma:setup" first.\n');
      process.exit(1);
    }

    console.log('Fetching from Figma...\n');
    try {
      const config = loadConfigOrThrow();
      comparisonData = await fetchFigmaData({
        fileId: config.figma.fileId,
        nodeId: config.figma.nodeId,
      });
    } catch (error) {
      console.error(`Fetch failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }

    metadata = comparisonData.$metadata;
    console.log('Comparing:');
    console.log(`  Baseline: ${baselineData.$metadata?.exportedAt || 'unknown'}`);
    console.log(`  Figma:    ${comparisonData.$metadata?.exportedAt || 'unknown'}`);
  }

  console.log();

  // Compare baselines
  const result = compareBaselines(baselineData, comparisonData);
  const counts = getChangeCounts(result);

  // Print summary
  if (!hasChanges(result)) {
    console.log('✓ No changes detected.\n');
    process.exit(0);
  }

  printDiffSummary(result);

  // Scan all enabled platforms for impact
  let platformResults: PlatformScanResult[] = [];
  let config;

  try {
    config = loadConfigOrThrow();
  } catch {
    // Config not found
  }

  const platforms = config?.migration?.platforms as { [key: string]: PlatformConfig } | undefined;

  if (hasBreakingChanges(result) && platforms) {
    const enabledPlatforms = Object.entries(platforms)
      .filter(([_, cfg]) => cfg.enabled)
      .map(([name]) => name);

    if (enabledPlatforms.length > 0) {
      console.log(`Scanning ${enabledPlatforms.length} platform(s) for impact...`);
      console.log(`  Platforms: ${enabledPlatforms.join(', ')}\n`);

      platformResults = await scanAllPlatforms(result, platforms);

      // Print summary for each platform
      for (const platformResult of platformResults) {
        if (!platformResult.replacements.length) continue;

        const platformTitle = platformResult.platform.charAt(0).toUpperCase() + platformResult.platform.slice(1);

        if (platformResult.totalUsages > 0) {
          console.log(`${platformTitle} Impact: ${platformResult.totalUsages} usage(s) in ${platformResult.filesAffected} file(s)`);
          for (const file of platformResult.usages.slice(0, 3)) {
            console.log(`  - ${file.path} (${file.count})`);
          }
          if (platformResult.usages.length > 3) {
            console.log(`  ... and ${platformResult.usages.length - 3} more files`);
          }
        } else {
          console.log(`${platformTitle} Impact: No usages found in codebase`);
        }
        console.log();
      }
    }
  }

  // Save token diff report
  const report = generateDiffReport(result, metadata);
  saveTextFile(getDiffReportPath(), report);
  console.log(`Token diff report saved: ${getDiffReportPath()}`);

  // Save multi-platform impact report if we have breaking changes
  if (hasBreakingChanges(result) && platformResults.length > 0) {
    const impactReport = generateMultiPlatformDiffReport(platformResults, metadata);
    const impactReportFile = getDiffReportPath().replace('.md', '-impact.md');
    saveTextFile(impactReportFile, impactReport);
    console.log(`Platform impact report saved: ${impactReportFile}`);
  }
  console.log();

  // Check if user wants to apply migrations
  const hasUsages = platformResults.some(p => p.totalUsages > 0);

  if (hasBreakingChanges(result) && hasUsages && platforms) {
    // If --apply flag was passed, apply migrations directly
    if (apply) {
      console.log(dryRun ? 'Dry run - showing what would be changed:\n' : 'Applying migrations...\n');

      const platformReplacementsData = platformResults
        .filter(p => p.totalUsages > 0)
        .map(p => ({
          platform: p.platform,
          replacements: p.replacements,
          config: platforms[p.platform],
        }));

      const migrationResults = await applyAllPlatformReplacements(platformReplacementsData, { dryRun });

      const totalModified = migrationResults.reduce((sum, r) => sum + r.filesModified, 0);
      const totalReplacements = migrationResults.reduce((sum, r) => sum + r.totalReplacements, 0);

      if (dryRun) {
        console.log(`\nWould migrate ${totalReplacements} token reference(s) in ${totalModified} file(s)`);
        console.log('Run without --dry-run to apply changes.\n');
      } else {
        console.log(`\n✓ Migrated ${totalReplacements} token reference(s) in ${totalModified} file(s)\n`);
      }
    } else {
      // Offer interactive choice
      const rl = createPrompt();

      type DiffChoice = 'apply' | 'dry-run' | 'skip';

      const choices: Array<{ value: DiffChoice; label: string; description?: string }> = [
        {
          value: 'skip',
          label: 'Skip',
          description: 'Just view the report, no changes',
        },
        {
          value: 'dry-run',
          label: 'Dry run',
          description: 'Preview what would be changed',
        },
        {
          value: 'apply',
          label: 'Apply migrations',
          description: 'Update affected files now',
        },
      ];

      const choice = await askChoice<DiffChoice>(rl, 'Apply migrations to affected files?', choices, 0);
      rl.close();

      if (choice !== 'skip') {
        const isDryRun = choice === 'dry-run';

        console.log(isDryRun ? '\nDry run - showing what would be changed:\n' : '\nApplying migrations...\n');

        const platformReplacementsData = platformResults
          .filter(p => p.totalUsages > 0)
          .map(p => ({
            platform: p.platform,
            replacements: p.replacements,
            config: platforms[p.platform],
          }));

        const migrationResults = await applyAllPlatformReplacements(platformReplacementsData, { dryRun: isDryRun });

        const totalModified = migrationResults.reduce((sum, r) => sum + r.filesModified, 0);
        const totalReplacements = migrationResults.reduce((sum, r) => sum + r.totalReplacements, 0);

        if (isDryRun) {
          console.log(`\nWould migrate ${totalReplacements} token reference(s) in ${totalModified} file(s)`);
        } else {
          console.log(`\n✓ Migrated ${totalReplacements} token reference(s) in ${totalModified} file(s)`);
        }
        console.log();
      }
    }
  }

  // Next steps
  console.log('Next steps:');
  if (hasBreakingChanges(result)) {
    console.log('  Run "npm run figma:sync" to apply token changes');
    if (hasUsages && !apply) {
      console.log('  Or run "npm run figma:diff --apply" to apply only file migrations');
    }
  } else {
    console.log('  Run "npm run figma:sync" to apply these changes');
  }
  console.log();
}

main();

/**
 * Diff Command (Modern)
 *
 * Compare Figma tokens with local baseline.
 * Supports multiple output formats: table, json, markdown.
 */

import chalk from 'chalk';
import { initContext } from '../../context.js';
import type { TokensConfig, ComparisonResult } from '../../types/index.js';
import {
  loadConfigOrThrow,
  loadBaseline,
  getBaselinePath,
} from '../../files/index.js';
import { fetchFigmaData } from '../../figma/index.js';
import {
  compareBaselines,
  hasChanges,
  getChangeCounts,
} from '../../compare/index.js';
import {
  formatInfo,
  formatWarning,
  createSpinner,
  createTable,
} from '../utils.js';

// ============================================================================
// Types
// ============================================================================

interface DiffOptions {
  format?: 'table' | 'json' | 'markdown';
  local?: boolean;
}

// ============================================================================
// Output Formatters
// ============================================================================

/**
 * Format diff as table (default)
 */
function formatAsTable(result: ComparisonResult): string {
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
    return chalk.green('No changes detected');
  }

  const rows = changes.map(change => {
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
      oldValue.substring(0, 40),
      newValue.substring(0, 40),
      coloredType,
    ];
  });

  const table = createTable(
    ['Token Path', 'Old Value', 'New Value', 'Type'],
    rows
  );

  return table.toString();
}

/**
 * Format diff as JSON
 */
function formatAsJson(result: ComparisonResult): string {
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

  return JSON.stringify({
    summary: getChangeCounts(result),
    changes,
  }, null, 2);
}

/**
 * Format diff as Markdown
 */
function formatAsMarkdown(result: ComparisonResult): string {
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
    return '# Diff Report\n\nNo changes detected.';
  }

  const counts = getChangeCounts(result);
  let md = '# Diff Report\n\n';
  md += '## Summary\n\n';
  md += `- Added: ${result.newVariables.length}\n`;
  md += `- Removed: ${result.deletedVariables.length}\n`;
  md += `- Modified: ${result.valueChanges.length}\n`;
  md += `- Renamed: ${result.pathChanges.length}\n`;
  md += `- **Total**: ${counts.total}\n\n`;

  md += '## Changes\n\n';
  md += '| Token Path | Old Value | New Value | Type |\n';
  md += '|------------|-----------|-----------|------|\n';

  changes.forEach(change => {
    const oldValue = String(change.oldValue || '-');
    const newValue = String(change.newValue || '-');
    md += `| ${change.path} | ${oldValue} | ${newValue} | ${change.type} |\n`;
  });

  return md;
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Diff command handler
 */
export async function diffCommand(options: DiffOptions = {}): Promise<void> {
  // Initialize context
  initContext({ rootDir: process.cwd() });

  // Load config
  let config: TokensConfig;
  try {
    config = loadConfigOrThrow();
  } catch (error) {
    throw new Error(
      `Configuration not found.\n\nRun 'synkio init' to create a configuration file.`
    );
  }

  // Load current baseline
  const currentBaseline = loadBaseline(getBaselinePath());
  if (!currentBaseline) {
    console.log(formatWarning('No baseline found. Run \'synkio sync\' first.'));
    return;
  }

  // Get comparison baseline
  let comparisonBaseline;

  if (options.local) {
    // Compare with previous local baseline
    comparisonBaseline = loadBaseline(config.paths.baselinePrev);
    if (!comparisonBaseline) {
      console.log(formatWarning('No previous baseline found for comparison.'));
      return;
    }
    console.log(formatInfo('Comparing current baseline with previous baseline'));
  } else {
    // Fetch from Figma
    const spinner = createSpinner('Fetching tokens from Figma...');
    spinner.start();

    try {
      comparisonBaseline = await fetchFigmaData({
        fileId: config.figma.fileId,
        nodeId: config.figma.nodeId,
      });
      spinner.succeed('Fetched tokens from Figma');
    } catch (error) {
      spinner.fail('Failed to fetch from Figma');
      throw new Error(
        `Could not fetch from Figma: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    console.log(formatInfo('Comparing local baseline with Figma'));
  }

  // Compare baselines
  const spinner = createSpinner('Comparing baselines...');
  spinner.start();

  const result = compareBaselines(currentBaseline, comparisonBaseline);
  spinner.succeed('Comparison complete');

  // Check for changes
  if (!hasChanges(result)) {
    console.log(formatInfo('No changes detected. Your tokens are up to date.'));
    return;
  }

  // Display summary
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
  console.log(chalk.bold(`  = ${counts.total} total changes\n`));

  // Format output based on requested format
  const format = options.format || 'table';
  let output: string;

  switch (format) {
    case 'json':
      output = formatAsJson(result);
      break;
    case 'markdown':
      output = formatAsMarkdown(result);
      break;
    case 'table':
    default:
      output = formatAsTable(result);
      break;
  }

  console.log(output);
}

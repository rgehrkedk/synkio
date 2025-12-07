/**
 * Migrate Command
 *
 * Manages the migration workflow:
 * - Show current plan status
 * - Scan codebase for patterns
 * - Apply approved migrations
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';

import { initContext } from '../../context.js';
import type { TokensConfig } from '../../types/index.js';

import {
  loadConfig,
  loadBaseline,
} from '../../files/index.js';

import {
  scanForPatterns,
  formatPatternsForDisplay,
  type DetectedPattern,
} from '../../detect/patterns.js';

import {
  generateMigrationPlan,
  savePlan,
  loadPlan,
  getPlanPath,
  isPlanApproved,
  archivePlan,
  type MigrationPlan,
  type PlannedChange,
} from '../../tokens/migration-plan.js';

import { compareBaselines } from '../../compare/index.js';

// ============================================================================
// CLI Helpers
// ============================================================================

function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function askYesNo(rl: readline.Interface, question: string, defaultYes: boolean = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  return new Promise((resolve) => {
    rl.question(`${question} ${hint} `, (answer) => {
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultYes);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

async function askText(rl: readline.Interface, question: string, defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

// ============================================================================
// Command Options
// ============================================================================

export interface MigrateOptions {
  /** Apply approved migrations */
  apply?: boolean;
  /** Scan codebase for patterns */
  scan?: boolean;
  /** Generate plan from current comparison */
  plan?: boolean;
  /** Show detailed status */
  status?: boolean;
  /** Directory to scan (default: src/) */
  dir?: string;
  /** Skip confirmation prompts */
  yes?: boolean;
}

// ============================================================================
// Migrate Command Implementation
// ============================================================================

/**
 * Show migration status
 */
function showStatus(config: TokensConfig): void {
  const planPath = getPlanPath(process.cwd(), config.paths?.reports);

  console.log('\n' + '━'.repeat(60));
  console.log('Migration Status');
  console.log('━'.repeat(60) + '\n');

  // Check for existing plan
  const plan = loadPlan(planPath);

  if (!plan) {
    console.log('No migration plan found.\n');
    console.log('To create a plan:');
    console.log('  1. Run `synkio sync` to detect changes');
    console.log('  2. Or run `synkio migrate --plan` if you have a comparison\n');
    return;
  }

  console.log(`Plan: ${planPath}`);
  console.log(`Status: ${plan.status}`);
  console.log(`Generated: ${plan.generatedAt}`);
  console.log('');
  console.log('Summary:');
  console.log(`  • ${plan.summary.tokensRenamed} token(s) renamed`);
  console.log(`  • ${plan.summary.filesAffected} file(s) affected`);
  console.log(`  • ${plan.summary.totalChanges} change(s) to apply`);
  console.log('');

  if (plan.status === 'PENDING_APPROVAL') {
    console.log('To apply this plan:');
    console.log('  1. Review the plan file');
    console.log('  2. Uncomment the APPROVED line');
    console.log('  3. Run `synkio migrate --apply`\n');
  } else if (plan.status === 'APPROVED') {
    console.log('Plan is approved! Run `synkio migrate --apply` to execute.\n');
  } else if (plan.status === 'APPLIED') {
    console.log('This plan has already been applied.\n');
  }
}

/**
 * Scan codebase for token usage patterns
 */
async function scanPatterns(config: TokensConfig, scanDir: string): Promise<DetectedPattern[]> {
  console.log('\n' + '━'.repeat(60));
  console.log('Scanning for Token Usage Patterns');
  console.log('━'.repeat(60) + '\n');

  console.log(`Scanning: ${scanDir}`);
  console.log('Looking for CSS, SCSS, TypeScript, Swift, Kotlin patterns...\n');

  // Get known tokens from baseline if available
  let knownTokens: string[] = [];
  try {
    const baseline = loadBaseline();
    if (baseline) {
      knownTokens = extractTokenNames(baseline);
      console.log(`Using ${knownTokens.length} known tokens from baseline\n`);
    }
  } catch {
    console.log('No baseline found, scanning without token validation\n');
  }

  const result = await scanForPatterns(scanDir, knownTokens);

  console.log(formatPatternsForDisplay(result));

  return result.patterns;
}

/**
 * Extract token names from baseline
 */
function extractTokenNames(baseline: any): string[] {
  const names: string[] = [];

  function walk(obj: any, path: string[] = []) {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) continue;

      if (value && typeof value === 'object' && '$value' in value) {
        names.push([...path, key].join('.'));
      } else if (typeof value === 'object') {
        walk(value, [...path, key]);
      }
    }
  }

  walk(baseline);
  return names;
}

/**
 * Generate migration plan
 */
async function generatePlan(config: TokensConfig, patterns: DetectedPattern[]): Promise<MigrationPlan | null> {
  console.log('\n' + '━'.repeat(60));
  console.log('Generating Migration Plan');
  console.log('━'.repeat(60) + '\n');

  // Load baseline and previous baseline to compare
  const baseline = loadBaseline();
  if (!baseline) {
    console.log('No baseline found. Run `synkio sync` first.\n');
    return null;
  }

  // Load previous baseline
  const prevPath = config.paths?.baselinePrev || '.figma/data/baseline.prev.json';
  if (!fs.existsSync(prevPath)) {
    console.log('No previous baseline found. Run `synkio sync` after making changes in Figma.\n');
    return null;
  }

  const prevBaseline = JSON.parse(fs.readFileSync(prevPath, 'utf-8'));

  // Compare
  const comparison = compareBaselines(prevBaseline, baseline);

  if (comparison.pathChanges.length === 0) {
    console.log('No token renames detected.\n');
    return null;
  }

  console.log(`Found ${comparison.pathChanges.length} token rename(s)`);
  console.log('Analyzing impact...\n');

  const plan = await generateMigrationPlan({
    rootDir: process.cwd(),
    patterns,
    comparison,
    stripSegments: config.migration?.stripSegments,
  });

  // Save plan
  const planPath = getPlanPath(process.cwd(), config.paths?.reports);
  savePlan(plan, planPath);

  console.log(`Plan saved: ${planPath}`);
  console.log('');
  console.log('Summary:');
  console.log(`  • ${plan.summary.tokensRenamed} token(s) renamed`);
  console.log(`  • ${plan.summary.filesAffected} file(s) affected`);
  console.log(`  • ${plan.summary.totalChanges} change(s) to apply`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the plan file');
  console.log('  2. Uncomment the APPROVED line when ready');
  console.log('  3. Run `synkio migrate --apply`\n');

  return plan;
}

/**
 * Apply approved migrations
 */
async function applyMigrations(config: TokensConfig, skipConfirm: boolean): Promise<boolean> {
  console.log('\n' + '━'.repeat(60));
  console.log('Applying Migrations');
  console.log('━'.repeat(60) + '\n');

  const planPath = getPlanPath(process.cwd(), config.paths?.reports);

  // Check plan exists
  if (!fs.existsSync(planPath)) {
    console.log('No migration plan found.');
    console.log('Run `synkio migrate --plan` to create one.\n');
    return false;
  }

  // Check approval
  if (!isPlanApproved(planPath)) {
    console.log('Migration plan has not been approved.');
    console.log('');
    console.log('To approve:');
    console.log(`  1. Open ${planPath}`);
    console.log('  2. Uncomment the APPROVED line');
    console.log('  3. Run `synkio migrate --apply` again\n');
    return false;
  }

  // Load full plan
  const planContent = fs.readFileSync(planPath, 'utf-8');
  const plan = loadPlan(planPath);

  if (!plan) {
    console.log('Failed to parse migration plan.\n');
    return false;
  }

  console.log('Plan is approved!');
  console.log(`  • ${plan.summary.tokensRenamed} token(s) renamed`);
  console.log(`  • ${plan.summary.filesAffected} file(s) to modify`);
  console.log(`  • ${plan.summary.totalChanges} change(s) to apply`);
  console.log('');

  // Confirm unless --yes
  if (!skipConfirm) {
    const rl = createPrompt();
    const confirm = await askYesNo(rl, 'Apply these changes?', true);
    rl.close();

    if (!confirm) {
      console.log('\nMigration cancelled.\n');
      return false;
    }
  }

  // Parse the markdown to get actual changes
  // For now, we need to re-generate the full plan to get change details
  // In production, we'd parse the markdown table or use JSON

  console.log('\nApplying changes...');

  // Read the plan and extract changes from markdown tables
  const changes = parseChangesFromMarkdown(planContent);

  if (changes.length === 0) {
    console.log('No changes to apply (could not parse plan).\n');
    return false;
  }

  // Group changes by file
  const changesByFile = new Map<string, PlannedChange[]>();
  for (const change of changes) {
    if (!changesByFile.has(change.file)) {
      changesByFile.set(change.file, []);
    }
    changesByFile.get(change.file)!.push(change);
  }

  // Apply changes
  let filesModified = 0;
  let totalChanges = 0;

  for (const [filePath, fileChanges] of changesByFile) {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`  Skipped: ${filePath} (file not found)`);
      continue;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;

    // Sort changes by line number (descending) to avoid offset issues
    const sortedChanges = fileChanges.sort((a, b) => b.line - a.line);

    for (const change of sortedChanges) {
      if (change.excluded) continue;

      // Replace the specific line
      const lines = content.split('\n');
      if (lines[change.line - 1] === change.before) {
        lines[change.line - 1] = change.after;
        content = lines.join('\n');
        modified = true;
        totalChanges++;
      }
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      filesModified++;
      console.log(`  ✓ ${filePath}`);
    }
  }

  console.log('');
  console.log(`Applied ${totalChanges} change(s) in ${filesModified} file(s)`);

  // Archive the plan
  const archivePath = archivePlan(planPath);
  console.log(`Plan archived: ${archivePath}\n`);

  return true;
}

/**
 * Parse changes from markdown plan
 */
function parseChangesFromMarkdown(markdown: string): PlannedChange[] {
  const changes: PlannedChange[] = [];

  // Find all table rows
  const tableRowRegex = /\|\s*([^|]+)\s*\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/g;

  let currentOldToken = '';
  let currentNewToken = '';

  // Track current rename context
  const renameRegex = /###\s*`([^`]+)`\s*→\s*`([^`]+)`/g;
  let renameMatch;
  while ((renameMatch = renameRegex.exec(markdown)) !== null) {
    currentOldToken = renameMatch[1];
    currentNewToken = renameMatch[2];
  }

  let match;
  while ((match = tableRowRegex.exec(markdown)) !== null) {
    const file = match[1].trim().replace(/~~/g, '');
    const line = parseInt(match[2]);
    const before = match[3].replace(/\\'/g, "'");
    const after = match[4].replace(/\\'/g, "'");
    const excluded = match[1].includes('~~');

    // Skip header row
    if (file === 'File' || file.includes('---')) continue;

    changes.push({
      file,
      line,
      column: 0,
      before,
      after,
      oldToken: currentOldToken,
      newToken: currentNewToken,
      platform: 'unknown',
      excluded,
    });
  }

  return changes;
}

/**
 * Main migrate command
 */
export async function migrateCommand(options: MigrateOptions = {}): Promise<void> {
  // Initialize context
  initContext({ rootDir: process.cwd() });

  // Load config (without strict validation - migrate doesn't need Figma token)
  const config = loadConfig();
  
  if (!config) {
    console.error('No tokensrc.json found. Run \'synkio init\' first.');
    process.exit(1);
  }

  // Determine action
  if (options.apply) {
    await applyMigrations(config, options.yes || false);
  } else if (options.scan) {
    const scanDir = options.dir || 'src';
    await scanPatterns(config, scanDir);
  } else if (options.plan) {
    // First scan for patterns
    const scanDir = options.dir || 'src';
    const patterns = await scanPatterns(config, scanDir);

    if (patterns.length > 0) {
      await generatePlan(config, patterns);
    } else {
      console.log('No patterns found. Cannot generate plan.\n');
    }
  } else {
    // Default: show status
    showStatus(config);
  }
}

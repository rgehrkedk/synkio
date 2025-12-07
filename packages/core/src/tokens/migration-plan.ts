/**
 * Migration Plan Generator
 *
 * Generates detailed migration plans with exact file/line/before/after changes.
 * Plans must be approved before migration can be applied.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

import type { ComparisonResult, PathChange, PlatformConfig } from '../types/index.js';
import type { DetectedPattern } from '../detect/patterns.js';

// ============================================================================
// Types
// ============================================================================

export type PlanStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'APPLIED' | 'REJECTED';

export interface PlannedChange {
  /** File path relative to project root */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column where match starts (1-indexed) */
  column: number;
  /** Original content of the line */
  before: string;
  /** New content after replacement */
  after: string;
  /** The old token reference */
  oldToken: string;
  /** The new token reference */
  newToken: string;
  /** Platform where change occurs */
  platform: string;
  /** Whether this change is excluded from application */
  excluded?: boolean;
}

export interface TokenRename {
  /** Original token path in Figma */
  oldPath: string;
  /** New token path in Figma */
  newPath: string;
  /** Changes to apply for this rename */
  changes: PlannedChange[];
}

export interface MigrationPlan {
  /** Plan version for compatibility */
  version: '1.0';
  /** When the plan was generated */
  generatedAt: string;
  /** Current status */
  status: PlanStatus;
  /** Who/what approved (optional) */
  approvedBy?: string;
  /** When approved (optional) */
  approvedAt?: string;
  /** Summary statistics */
  summary: {
    tokensRenamed: number;
    filesAffected: number;
    totalChanges: number;
  };
  /** Token renames with their changes */
  renames: TokenRename[];
}

export interface GeneratePlanOptions {
  /** Root directory to scan */
  rootDir: string;
  /** Detected patterns to use for matching */
  patterns: DetectedPattern[];
  /** Comparison result with path changes */
  comparison: ComparisonResult;
  /** Segments to strip from token paths */
  stripSegments?: string[];
  /** Directories to exclude */
  exclude?: string[];
}

// ============================================================================
// Plan Generation
// ============================================================================

/**
 * Generate a migration plan from comparison result and detected patterns
 */
export async function generateMigrationPlan(options: GeneratePlanOptions): Promise<MigrationPlan> {
  const {
    rootDir,
    patterns,
    comparison,
    stripSegments = ['primitives', 'themes', 'brands', 'light', 'dark', 'value'],
    exclude = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
  } = options;

  const renames: TokenRename[] = [];
  const affectedFiles = new Set<string>();

  // Process each path change (rename)
  for (const change of comparison.pathChanges) {
    const renameChanges: PlannedChange[] = [];

    // For each platform pattern, find and plan changes
    for (const pattern of patterns) {
      const changes = await findChangesForRename(
        rootDir,
        change,
        pattern,
        stripSegments,
        exclude
      );

      for (const c of changes) {
        renameChanges.push(c);
        affectedFiles.add(c.file);
      }
    }

    if (renameChanges.length > 0) {
      renames.push({
        oldPath: change.oldPath,
        newPath: change.newPath,
        changes: renameChanges,
      });
    }
  }

  // Sort renames by number of changes (most impactful first)
  renames.sort((a, b) => b.changes.length - a.changes.length);

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    status: 'PENDING_APPROVAL',
    summary: {
      tokensRenamed: renames.length,
      filesAffected: affectedFiles.size,
      totalChanges: renames.reduce((sum, r) => sum + r.changes.length, 0),
    },
    renames,
  };
}

/**
 * Find all changes needed for a single token rename
 */
async function findChangesForRename(
  rootDir: string,
  change: PathChange,
  pattern: DetectedPattern,
  stripSegments: string[],
  exclude: string[]
): Promise<PlannedChange[]> {
  const changes: PlannedChange[] = [];

  // Convert token paths to platform-specific format
  const oldToken = tokenPathToPlatformFormat(change.oldPath, pattern, stripSegments);
  const newToken = tokenPathToPlatformFormat(change.newPath, pattern, stripSegments);

  if (oldToken === newToken) return changes;

  // Build regex to find old token
  const searchRegex = buildSearchRegex(oldToken, pattern);

  // Get include paths - use fallback if empty
  const includePaths = pattern.includePaths.length > 0 
    ? pattern.includePaths 
    : ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.css', '**/*.scss'];

  // Search in files matching the pattern's include paths
  for (const includePath of includePaths) {
    const files = await glob(includePath, {
      cwd: rootDir,
      ignore: exclude,
      nodir: true,
      absolute: false,
    });

    for (const relativeFile of files) {
      const filePath = path.join(rootDir, relativeFile);

      if (!fs.existsSync(filePath)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Find all matches in this file
        let match;
        searchRegex.lastIndex = 0;

        while ((match = searchRegex.exec(content)) !== null) {
          // Calculate line and column
          const beforeMatch = content.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          const lastNewline = beforeMatch.lastIndexOf('\n');
          const column = match.index - lastNewline;

          const originalLine = lines[lineNumber - 1];
          const newLine = originalLine.replace(match[0], match[0].replace(oldToken, newToken));

          changes.push({
            file: relativeFile,
            line: lineNumber,
            column,
            before: originalLine,
            after: newLine,
            oldToken,
            newToken,
            platform: pattern.platform,
          });
        }
      } catch (error) {
        // Skip files we can't read
        continue;
      }
    }
  }

  return changes;
}

/**
 * Convert Figma token path to platform-specific format
 */
function tokenPathToPlatformFormat(
  tokenPath: string,
  pattern: DetectedPattern,
  stripSegments: string[]
): string {
  // Split path and filter out segments to strip
  const parts = tokenPath.split('.');
  const filtered = parts.filter(p => !stripSegments.includes(p.toLowerCase()));

  switch (pattern.platform) {
    case 'css':
      // CSS: kebab-case with -- prefix
      return filtered.map(p => p.toLowerCase()).join('-');
    case 'scss':
      // SCSS: kebab-case with $ prefix (handled in regex)
      return filtered.map(p => p.toLowerCase()).join('-');
    case 'typescript':
      // TypeScript: For theme.{token} pattern, keep dot notation as-is
      // For tokens.{token} pattern, use camelCase
      if (pattern.format.includes('theme.')) {
        // Theme object: keep dots, lowercase
        return filtered.map(p => p.toLowerCase()).join('.');
      }
      if (pattern.format.includes('[')) {
        // Bracket notation: keep dots
        return filtered.join('.');
      }
      // Dot notation with tokens object: camelCase
      return filtered
        .map((p, i) => i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('.');
    case 'swift':
    case 'kotlin':
      // Swift/Kotlin: camelCase
      return filtered
        .map((p, i) => i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('.');
    default:
      return filtered.join('-');
  }
}

/**
 * Build regex to search for token in platform format
 */
function buildSearchRegex(token: string, pattern: DetectedPattern): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  switch (pattern.platform) {
    case 'css':
      // Match var(--token) or --token:
      return new RegExp(`(var\\(\\s*--${escaped}\\s*[,)]|--${escaped}\\s*:)`, 'g');
    case 'scss':
      // Match $token
      return new RegExp(`\\$${escaped}(?![\\w-])`, 'g');
    case 'typescript':
      // Match tokens.token or tokens['token']
      return new RegExp(`tokens\\.${escaped}(?![\\w])|tokens\\[['"]${escaped}['"]\\]`, 'g');
    case 'swift':
      return new RegExp(`(DesignTokens|Color|Tokens)\\.${escaped}(?![\\w])`, 'g');
    case 'kotlin':
      return new RegExp(`(AppTheme|R\\.color|R\\.dimen)\\.${escaped.replace(/\./g, '_')}(?![\\w])`, 'g');
    default:
      return new RegExp(escaped, 'g');
  }
}

// ============================================================================
// Plan Serialization (Markdown)
// ============================================================================

/**
 * Serialize migration plan to markdown format
 */
export function planToMarkdown(plan: MigrationPlan): string {
  const lines: string[] = [];

  lines.push('# Migration Plan');
  lines.push('');
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push(`Status: **${plan.status}**`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- ${plan.summary.tokensRenamed} token(s) renamed`);
  lines.push(`- ${plan.summary.filesAffected} file(s) affected`);
  lines.push(`- ${plan.summary.totalChanges} change(s) to apply`);
  lines.push('');

  if (plan.renames.length === 0) {
    lines.push('No changes to apply.');
    return lines.join('\n');
  }

  // Changes by token
  lines.push('## Changes');
  lines.push('');

  for (const rename of plan.renames) {
    lines.push(`### \`${rename.oldPath}\` → \`${rename.newPath}\``);
    lines.push('');
    lines.push(`${rename.changes.length} change(s)`);
    lines.push('');
    lines.push('| File | Line | Before | After |');
    lines.push('|------|------|--------|-------|');

    for (const change of rename.changes) {
      const excluded = change.excluded ? '~~' : '';
      const before = escapeMarkdownTableCell(change.before.trim());
      const after = escapeMarkdownTableCell(change.after.trim());
      lines.push(`| ${excluded}${change.file}${excluded} | ${change.line} | \`${before}\` | \`${after}\` |`);
    }

    lines.push('');
  }

  // Approval section
  lines.push('---');
  lines.push('');
  lines.push('## Approval');
  lines.push('');
  lines.push('To apply these changes, uncomment the approval line below and run `synkio migrate --apply`:');
  lines.push('');
  lines.push('```');
  lines.push('<!-- APPROVED -->');
  lines.push('```');
  lines.push('');
  lines.push('To exclude specific changes, add `~~` around the file path in the table above.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Escape special characters for markdown table cells
 */
function escapeMarkdownTableCell(content: string): string {
  return content
    .replace(/\|/g, '\\|')
    .replace(/`/g, "'")
    .substring(0, 80); // Truncate long lines
}

/**
 * Parse migration plan from markdown
 */
export function parsePlanFromMarkdown(markdown: string): MigrationPlan | null {
  try {
    // Check for approval marker
    const isApproved = markdown.includes('APPROVED') && !markdown.includes('<!-- APPROVED -->');
    
    // Parse status line
    const statusMatch = markdown.match(/Status:\s*\*\*(\w+)\*\*/);
    let status: PlanStatus = 'PENDING_APPROVAL';
    if (statusMatch) {
      status = statusMatch[1] as PlanStatus;
    }
    if (isApproved && status === 'PENDING_APPROVAL') {
      status = 'APPROVED';
    }

    // Parse generated date
    const dateMatch = markdown.match(/Generated:\s*(.+)/);
    const generatedAt = dateMatch?.[1] || new Date().toISOString();

    // Parse summary
    const tokensMatch = markdown.match(/(\d+)\s*token\(s\)\s*renamed/);
    const filesMatch = markdown.match(/(\d+)\s*file\(s\)\s*affected/);
    const changesMatch = markdown.match(/(\d+)\s*change\(s\)\s*to apply/);

    // Parse renames (simplified - just get counts)
    const renames: TokenRename[] = [];
    const renameMatches = markdown.matchAll(/###\s*`([^`]+)`\s*→\s*`([^`]+)`/g);
    
    for (const match of renameMatches) {
      renames.push({
        oldPath: match[1],
        newPath: match[2],
        changes: [], // Would need full parsing for actual changes
      });
    }

    return {
      version: '1.0',
      generatedAt,
      status,
      summary: {
        tokensRenamed: parseInt(tokensMatch?.[1] || '0'),
        filesAffected: parseInt(filesMatch?.[1] || '0'),
        totalChanges: parseInt(changesMatch?.[1] || '0'),
      },
      renames,
    };
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Plan File Operations
// ============================================================================

const PLAN_FILENAME = 'migration-plan.md';

/**
 * Get the path to the migration plan file
 */
export function getPlanPath(rootDir: string, reportsDir?: string): string {
  const dir = reportsDir || path.join(rootDir, '.figma', 'reports');
  return path.join(dir, PLAN_FILENAME);
}

/**
 * Save migration plan to file
 */
export function savePlan(plan: MigrationPlan, planPath: string): void {
  const dir = path.dirname(planPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const markdown = planToMarkdown(plan);
  fs.writeFileSync(planPath, markdown, 'utf-8');
}

/**
 * Load migration plan from file
 */
export function loadPlan(planPath: string): MigrationPlan | null {
  if (!fs.existsSync(planPath)) {
    return null;
  }

  const markdown = fs.readFileSync(planPath, 'utf-8');
  return parsePlanFromMarkdown(markdown);
}

/**
 * Check if a plan is approved
 */
export function isPlanApproved(planPath: string): boolean {
  if (!fs.existsSync(planPath)) {
    return false;
  }

  const markdown = fs.readFileSync(planPath, 'utf-8');
  // Approved if the marker is uncommented (not inside <!-- -->)
  return markdown.includes('APPROVED') && !markdown.includes('<!-- APPROVED -->');
}

/**
 * Archive an applied plan
 */
export function archivePlan(planPath: string, historyDir?: string): string {
  const dir = historyDir || path.join(path.dirname(planPath), 'migration-history');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const archivePath = path.join(dir, `${date}-applied.md`);

  // Read and update status
  let content = fs.readFileSync(planPath, 'utf-8');
  content = content.replace(/Status:\s*\*\*\w+\*\*/, 'Status: **APPLIED**');

  fs.writeFileSync(archivePath, content, 'utf-8');
  fs.unlinkSync(planPath);

  return archivePath;
}

/**
 * Token Migration Logic
 *
 * Functions for applying token migrations (renames, value changes) to source files.
 * Supports multiple platforms: CSS, SCSS, TypeScript, Swift, Kotlin.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

import type {
  ComparisonResult,
  PathChange,
  PlatformConfig,
  TokenMap,
} from '../types/index.js';

import { escapeRegex, createTokenBoundaryRegex } from './transform.js';

/** Platform-agnostic token replacement */
export interface TokenReplacement {
  from: string;  // Old token reference (platform-specific format)
  to: string;    // New token reference (platform-specific format)
}

/**
 * CSS-specific replacement type
 * @deprecated Use TokenReplacement instead
 */
export type CssReplacement = TokenReplacement;

/** Platform-agnostic file match */
export interface FileMatch {
  path: string;
  count: number;
  lines: { line: number; content: string }[];
}

/**
 * CSS-specific file match type
 * @deprecated Use FileMatch instead
 */
export type CssFileMatch = FileMatch;

export interface MigrationResult {
  filesModified: number;
  totalReplacements: number;
  files: FileMatch[];
}

/** Platform scan result */
export interface PlatformScanResult {
  platform: string;
  replacements: TokenReplacement[];
  usages: FileMatch[];
  totalUsages: number;
  filesAffected: number;
}

/**
 * Convert path change to CSS token replacement
 * @deprecated Use pathChangeToTokenReplacement instead for platform-agnostic support
 */
export function pathChangeToReplacement(change: PathChange, stripSegments: string[]): CssReplacement | null {
  // Extract token name from path, stripping collection/mode prefixes
  const oldParts = change.oldPath.split('.');
  const newParts = change.newPath.split('.');

  // Filter out segments that should be stripped
  const filteredOld = oldParts.filter(p => !stripSegments.includes(p));
  const filteredNew = newParts.filter(p => !stripSegments.includes(p));

  const oldToken = filteredOld.join('-');
  const newToken = filteredNew.join('-');

  if (oldToken === newToken) {
    return null;
  }

  return {
    from: `--${oldToken}`,
    to: `--${newToken}`,
  };
}

/**
 * Build replacement map from comparison result
 * @deprecated Use buildPlatformReplacements instead for platform-agnostic support
 */
export function buildReplacements(
  result: ComparisonResult,
  stripSegments: string[] = ['primitives', 'themes', 'brands', 'light', 'dark', 'value']
): CssReplacement[] {
  const replacements: CssReplacement[] = [];
  const seen = new Set<string>();

  for (const change of result.pathChanges) {
    const replacement = pathChangeToReplacement(change, stripSegments);
    if (replacement && !seen.has(replacement.from)) {
      seen.add(replacement.from);
      replacements.push(replacement);
    }
  }

  return replacements;
}

/**
 * Find CSS files matching include/exclude patterns
 * @deprecated Use findPlatformFiles instead for platform-agnostic support
 */
export async function findCssFiles(config: PlatformConfig): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of config.include) {
    const matches = await glob(pattern, {
      ignore: config.exclude,
      cwd: process.cwd(),
    });
    files.push(...matches);
  }

  // Deduplicate
  return [...new Set(files)];
}

/**
 * Scan CSS files for token usages without modifying
 * @deprecated Use scanPlatformUsages instead for platform-agnostic support
 */
export async function scanCssUsages(
  replacements: CssReplacement[],
  config: PlatformConfig
): Promise<CssFileMatch[]> {
  const cssFiles = await findCssFiles(config);
  const matches: CssFileMatch[] = [];

  for (const filePath of cssFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const fileMatch: CssFileMatch = {
      path: filePath,
      count: 0,
      lines: [],
    };

    for (const { from } of replacements) {
      // Use word boundary: match token but not if followed by more token segments (e.g., -hover)
      // For CSS: --token-name should not match --token-name-extended
      const regex = createTokenBoundaryRegex(from);

      lines.forEach((line, index) => {
        const lineMatches = line.match(regex);
        if (lineMatches) {
          fileMatch.count += lineMatches.length;
          fileMatch.lines.push({
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }

    if (fileMatch.count > 0) {
      matches.push(fileMatch);
    }
  }

  return matches;
}

/**
 * Apply CSS replacements to files
 * @deprecated Use applyPlatformReplacements from apply-migrations.ts instead
 */
export async function applyCssReplacements(
  replacements: CssReplacement[],
  config: PlatformConfig,
  options?: { dryRun?: boolean; silent?: boolean }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    filesModified: 0,
    totalReplacements: 0,
    files: [],
  };

  if (replacements.length === 0) {
    return result;
  }

  const cssFiles = await findCssFiles(config);

  for (const filePath of cssFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;
    let count = 0;
    const matchedLines: { line: number; content: string }[] = [];

    for (const { from, to } of replacements) {
      // Use word boundary: match token but not if followed by more token segments
      const regex = createTokenBoundaryRegex(from);
      const matches = content.match(regex);

      if (matches) {
        count += matches.length;

        // Track which lines were modified
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(from)) {
            matchedLines.push({ line: index + 1, content: line.trim() });
          }
        });

        content = content.replace(regex, to);
        modified = true;
      }
    }

    if (modified) {
      result.filesModified++;
      result.totalReplacements += count;
      result.files.push({ path: filePath, count, lines: matchedLines });

      if (!options?.dryRun) {
        fs.writeFileSync(fullPath, content, 'utf-8');
      }

      if (!options?.silent) {
        const status = options?.dryRun ? '[DRY RUN]' : '✓';
        console.log(`  ${status} ${filePath} (${count} replacements)`);
      }
    }
  }

  return result;
}

/**
 * Print migration summary
 */
export function printMigrationSummary(
  replacements: CssReplacement[],
  result: MigrationResult,
  options?: { dryRun?: boolean }
): void {
  console.log('\n' + '='.repeat(60));
  console.log('  Migration Summary');
  console.log('='.repeat(60) + '\n');

  if (replacements.length === 0) {
    console.log('  No token renames to apply.\n');
    return;
  }

  console.log('  Token replacements:');
  for (const { from, to } of replacements.slice(0, 10)) {
    console.log(`    ${from} → ${to}`);
  }
  if (replacements.length > 10) {
    console.log(`    ... and ${replacements.length - 10} more`);
  }
  console.log();

  if (options?.dryRun) {
    console.log(`  [DRY RUN] Would modify ${result.filesModified} files (${result.totalReplacements} replacements)`);
  } else {
    console.log(`  Modified ${result.filesModified} files (${result.totalReplacements} replacements)`);
  }
  console.log();
}


// ============================================================================
// Platform-Agnostic Functions
// ============================================================================

/**
 * Transform a token path segment according to case convention
 */
function transformCase(str: string, caseType: 'kebab' | 'camel' | 'snake' | 'pascal'): string {
  // First normalize to words
  const words = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  switch (caseType) {
    case 'kebab':
      return words.join('-');
    case 'snake':
      return words.join('_');
    case 'camel':
      return words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case 'pascal':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    default:
      return words.join('-');
  }
}

/**
 * Build platform-specific token name from path
 */
export function buildPlatformTokenName(
  pathParts: string[],
  config: PlatformConfig,
  globalStripSegments?: string[]
): string {
  const { prefix, separator, case: caseType } = config.transform;
  // Zod ensures config.transform.stripSegments exists with defaults, but globalStripSegments takes precedence
  const stripSegments = globalStripSegments ?? config.transform.stripSegments ?? [];

  // Filter out segments that should be stripped
  const filteredParts = pathParts.filter(p => !stripSegments.includes(p.toLowerCase()));

  // Transform each part according to case
  const transformedParts = filteredParts.map(p => transformCase(p, caseType));

  // Join with separator
  const tokenName = transformedParts.join(separator);

  return prefix + tokenName;
}

/**
 * Convert path change to platform-specific token replacement
 */
export function pathChangeToTokenReplacement(
  change: PathChange,
  config: PlatformConfig,
  globalStripSegments?: string[]
): TokenReplacement | null {
  const oldParts = change.oldPath.split('.');
  const newParts = change.newPath.split('.');

  const oldToken = buildPlatformTokenName(oldParts, config, globalStripSegments);
  const newToken = buildPlatformTokenName(newParts, config, globalStripSegments);

  if (oldToken === newToken) {
    return null;
  }

  return { from: oldToken, to: newToken };
}

/**
 * Build platform-specific replacements from comparison result
 */
export function buildPlatformReplacements(
  result: ComparisonResult,
  config: PlatformConfig,
  globalStripSegments?: string[]
): TokenReplacement[] {
  const replacements: TokenReplacement[] = [];
  const seen = new Set<string>();

  for (const change of result.pathChanges) {
    const replacement = pathChangeToTokenReplacement(change, config, globalStripSegments);
    if (replacement && !seen.has(replacement.from)) {
      seen.add(replacement.from);
      replacements.push(replacement);
    }
  }

  return replacements;
}

/**
 * Find platform files matching include/exclude patterns
 */
export async function findPlatformFiles(config: PlatformConfig): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of config.include) {
    const matches = await glob(pattern, {
      ignore: config.exclude,
      cwd: process.cwd(),
    });
    files.push(...matches);
  }

  // Deduplicate
  return [...new Set(files)];
}

/**
 * Scan platform files for token usages without modifying
 */
export async function scanPlatformUsages(
  replacements: TokenReplacement[],
  config: PlatformConfig
): Promise<FileMatch[]> {
  const platformFiles = await findPlatformFiles(config);
  const matches: FileMatch[] = [];

  for (const filePath of platformFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    const fileMatch: FileMatch = {
      path: filePath,
      count: 0,
      lines: [],
    };

    for (const { from } of replacements) {
      const regex = createTokenBoundaryRegex(from);

      lines.forEach((line, index) => {
        const lineMatches = line.match(regex);
        if (lineMatches) {
          fileMatch.count += lineMatches.length;
          fileMatch.lines.push({
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }

    if (fileMatch.count > 0) {
      matches.push(fileMatch);
    }
  }

  return matches;
}

/**
 * Apply platform-specific replacements to files
 */
export async function applyPlatformReplacements(
  replacements: TokenReplacement[],
  config: PlatformConfig,
  options?: { dryRun?: boolean; silent?: boolean }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    filesModified: 0,
    totalReplacements: 0,
    files: [],
  };

  if (replacements.length === 0) {
    return result;
  }

  const platformFiles = await findPlatformFiles(config);

  for (const filePath of platformFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;
    let count = 0;
    const matchedLines: { line: number; content: string }[] = [];

    for (const { from, to } of replacements) {
      const regex = createTokenBoundaryRegex(from);
      const matches = content.match(regex);

      if (matches) {
        count += matches.length;

        // Track which lines were modified
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(from)) {
            matchedLines.push({ line: index + 1, content: line.trim() });
          }
        });

        content = content.replace(regex, to);
        modified = true;
      }
    }

    if (modified) {
      result.filesModified++;
      result.totalReplacements += count;
      result.files.push({ path: filePath, count, lines: matchedLines });

      if (!options?.dryRun) {
        fs.writeFileSync(fullPath, content, 'utf-8');
      }

      if (!options?.silent) {
        const status = options?.dryRun ? '[DRY RUN]' : '✓';
        console.log(`  ${status} ${filePath} (${count} replacements)`);
      }
    }
  }

  return result;
}

// ============================================================================
// Multi-Platform Scanning
// ============================================================================

/**
 * Scan all configured platforms for token usage (path-based matching)
 */
export async function scanAllPlatforms(
  comparisonResult: ComparisonResult,
  platforms: { [platformName: string]: PlatformConfig },
  globalStripSegments?: string[]
): Promise<PlatformScanResult[]> {
  const results: PlatformScanResult[] = [];

  for (const [platformName, platformConfig] of Object.entries(platforms)) {
    if (!platformConfig.enabled) continue;

    // Build replacements for this platform
    const replacements = buildPlatformReplacements(comparisonResult, platformConfig, globalStripSegments);

    // Scan for usages
    const usages = await scanPlatformUsages(replacements, platformConfig);

    results.push({
      platform: platformName,
      replacements,
      usages,
      totalUsages: usages.reduce((sum, f) => sum + f.count, 0),
      filesAffected: usages.length,
    });
  }

  return results;
}

/**
 * Build replacements from token map (for precise migration)
 */
export function buildReplacementsFromMap(
  oldMap: TokenMap,
  newMap: TokenMap,
  config: PlatformConfig,
  platform: string
): TokenReplacement[] {
  const replacements: TokenReplacement[] = [];
  const seen = new Set<string>();

  // Find tokens that exist in old map but not in new map (deleted)
  // or tokens that exist in both but have different output paths (renamed)
  for (const [variableId, oldInfo] of Object.entries(oldMap.tokens)) {
    const newInfo = newMap.tokens[variableId];
    const oldOutput = oldInfo.outputs?.[platform as keyof typeof oldInfo.outputs];
    const newOutput = newInfo?.outputs?.[platform as keyof typeof newInfo.outputs];

    if (oldOutput && !newOutput) {
      // Token was deleted or moved out of this platform
      // Skip for now - we'd need to handle deletions separately
      continue;
    }

    if (oldOutput && newOutput && oldOutput !== newOutput) {
      // Token was renamed in this platform
      if (!seen.has(oldOutput)) {
        replacements.push({
          from: oldOutput,
          to: newOutput,
        });
        seen.add(oldOutput);
      }
    }
  }

  return replacements;
}

/**
 * Scan all configured platforms using token map (recommended for precision)
 */
export async function scanAllPlatformsWithMap(
  oldMap: TokenMap,
  newMap: TokenMap,
  platforms: { [platformName: string]: PlatformConfig }
): Promise<PlatformScanResult[]> {
  const results: PlatformScanResult[] = [];

  for (const [platformName, platformConfig] of Object.entries(platforms)) {
    if (!platformConfig.enabled) continue;

    // Build replacements using token map
    const replacements = buildReplacementsFromMap(oldMap, newMap, platformConfig, platformName);

    // Scan for usages
    const usages = await scanPlatformUsages(replacements, platformConfig);

    results.push({
      platform: platformName,
      replacements,
      usages,
      totalUsages: usages.reduce((sum, f) => sum + f.count, 0),
      filesAffected: usages.length,
    });
  }

  return results;
}

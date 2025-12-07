/**
 * Apply Migrations
 *
 * Functions for applying token migrations (find & replace) to source files.
 * Isolated from scan/report functionality for optional use.
 */

import fs from 'fs';
import path from 'path';

import type { PlatformConfig } from '../types/index.js';
import type { TokenReplacement, FileMatch } from './migrate.js';
import { findPlatformFiles } from './migrate.js';
import { createTokenBoundaryRegex } from './transform.js';

/** Result of applying migrations to a platform */
export interface PlatformMigrationResult {
  platform: string;
  filesModified: number;
  totalReplacements: number;
  files: FileMatch[];
}

/** Options for applying migrations */
export interface ApplyOptions {
  dryRun?: boolean;
  silent?: boolean;
}

/**
 * Apply replacements to files for a specific platform
 */
export async function applyPlatformReplacements(
  replacements: TokenReplacement[],
  config: PlatformConfig,
  options?: ApplyOptions
): Promise<PlatformMigrationResult> {
  const result: PlatformMigrationResult = {
    platform: '',
    filesModified: 0,
    totalReplacements: 0,
    files: [],
  };

  if (replacements.length === 0) {
    return result;
  }

  const files = await findPlatformFiles(config);

  for (const filePath of files) {
    const fullPath = path.join(process.cwd(), filePath);

    try {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let modified = false;
      let count = 0;
      const matchedLines: { line: number; content: string }[] = [];

      for (const { from, to } of replacements) {
        // Use word boundary to avoid matching extended tokens
        const regex = createTokenBoundaryRegex(from);
        const matches = content.match(regex);

        if (matches) {
          count += matches.length;

          // Track which lines were modified
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.match(createTokenBoundaryRegex(from)) && !matchedLines.some(l => l.line === index + 1)) {
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
    } catch {
      // Skip files that can't be read/written
    }
  }

  return result;
}

/**
 * Apply migrations to multiple platforms
 */
export async function applyAllPlatformReplacements(
  platformReplacements: Array<{ platform: string; replacements: TokenReplacement[]; config: PlatformConfig }>,
  options?: ApplyOptions
): Promise<PlatformMigrationResult[]> {
  const results: PlatformMigrationResult[] = [];

  for (const { platform, replacements, config } of platformReplacements) {
    if (!options?.silent) {
      const platformTitle = platform.charAt(0).toUpperCase() + platform.slice(1);
      console.log(`\n${platformTitle}:`);
    }

    const result = await applyPlatformReplacements(replacements, config, options);
    result.platform = platform;
    results.push(result);
  }

  return results;
}

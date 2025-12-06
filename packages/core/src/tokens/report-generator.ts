/**
 * Report Generator
 *
 * Functions for generating migration and diff reports.
 * Isolated from scan/apply functionality for clean separation.
 */

import type { CssReplacement, CssFileMatch, PlatformScanResult } from './migrate.js';

/**
 * Generate CSS migration report markdown
 */
export function generateMigrationReport(
  replacements: CssReplacement[],
  usages: CssFileMatch[]
): string {
  const timestamp = new Date().toISOString();
  let md = `# Token Migration Report\n\n`;
  md += `**Generated:** ${timestamp}\n\n`;
  md += `---\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Token Renames | ${replacements.length} |\n`;
  md += `| Files Affected | ${usages.length} |\n`;
  md += `| Total Usages | ${usages.reduce((sum, f) => sum + f.count, 0)} |\n\n`;

  // Replacements
  if (replacements.length > 0) {
    md += `## Token Renames\n\n`;
    md += `| Old Token | New Token |\n`;
    md += `|-----------|----------|\n`;
    for (const { from, to } of replacements) {
      md += `| \`${from}\` | \`${to}\` |\n`;
    }
    md += `\n`;
  }

  // Files to update
  if (usages.length > 0) {
    md += `## Files to Update\n\n`;
    for (const file of usages) {
      md += `### \`${file.path}\` (${file.count} usages)\n\n`;
      md += `| Line | Content |\n`;
      md += `|------|--------|\n`;
      for (const line of file.lines.slice(0, 10)) {
        const escaped = line.content.replace(/\|/g, '\\|').replace(/`/g, '\\`');
        md += `| ${line.line} | \`${escaped.substring(0, 60)}${escaped.length > 60 ? '...' : ''}\` |\n`;
      }
      if (file.lines.length > 10) {
        md += `| ... | *${file.lines.length - 10} more lines* |\n`;
      }
      md += `\n`;
    }
  }

  return md;
}

/**
 * Generate multi-platform diff report
 */
export function generateMultiPlatformDiffReport(
  platformResults: PlatformScanResult[],
  metadata?: { exportedAt?: string; version?: string }
): string {
  const timestamp = new Date().toISOString();
  let md = `# Token Diff Impact Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  if (metadata?.exportedAt) {
    md += `**Figma Export:** ${metadata.exportedAt}\n`;
  }
  md += `\n---\n\n`;

  // Overall Summary
  const totalPlatforms = platformResults.filter(p => p.replacements.length > 0).length;
  const totalReplacements = platformResults.reduce((sum, p) => sum + p.replacements.length, 0);
  const totalFiles = platformResults.reduce((sum, p) => sum + p.filesAffected, 0);
  const totalUsages = platformResults.reduce((sum, p) => sum + p.totalUsages, 0);

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| Platforms Affected | ${totalPlatforms} |\n`;
  md += `| Token Renames | ${totalReplacements} |\n`;
  md += `| Files Affected | ${totalFiles} |\n`;
  md += `| Total Usages | ${totalUsages} |\n\n`;

  // Per-platform breakdown
  for (const result of platformResults) {
    const platformTitle = result.platform.charAt(0).toUpperCase() + result.platform.slice(1);

    md += `## ${platformTitle}\n\n`;

    if (result.replacements.length === 0) {
      md += `No breaking changes affect ${result.platform} files.\n\n`;
      continue;
    }

    md += `**Impact:** ${result.totalUsages} usage(s) in ${result.filesAffected} file(s)\n\n`;

    // Token renames for this platform
    md += `### Token Renames\n\n`;
    md += `| Old Token | New Token |\n`;
    md += `|-----------|----------|\n`;
    for (const { from, to } of result.replacements.slice(0, 20)) {
      md += `| \`${from}\` | \`${to}\` |\n`;
    }
    if (result.replacements.length > 20) {
      md += `| ... | *${result.replacements.length - 20} more* |\n`;
    }
    md += `\n`;

    // Files affected
    if (result.usages.length > 0) {
      md += `### Files to Update\n\n`;
      for (const file of result.usages.slice(0, 10)) {
        md += `#### \`${file.path}\` (${file.count} usages)\n\n`;
        md += `| Line | Content |\n`;
        md += `|------|--------|\n`;
        for (const line of file.lines.slice(0, 5)) {
          const escaped = line.content.replace(/\|/g, '\\|').replace(/`/g, '\\`');
          md += `| ${line.line} | \`${escaped.substring(0, 60)}${escaped.length > 60 ? '...' : ''}\` |\n`;
        }
        if (file.lines.length > 5) {
          md += `| ... | *${file.lines.length - 5} more lines* |\n`;
        }
        md += `\n`;
      }
      if (result.usages.length > 10) {
        md += `*... and ${result.usages.length - 10} more files*\n\n`;
      }
    }
  }

  return md;
}

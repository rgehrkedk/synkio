// =============================================================================
// Report Generator - Generate SYNC_REPORT.md from ComparisonResult
// =============================================================================

import { ComparisonResult } from './types';

/**
 * Metadata for the sync report
 */
export interface SyncReportMetadata {
  author: string;
  figmaFileUrl: string;
  timestamp: string;
}

/**
 * Generate a SYNC_REPORT.md markdown string from comparison result
 */
export function generateSyncReport(
  diff: ComparisonResult,
  metadata: SyncReportMetadata
): string {
  const {
    valueChanges,
    pathChanges,
    newVariables,
    deletedVariables,
    newModes,
    deletedModes,
    modeRenames,
    collectionRenames,
    styleValueChanges,
    stylePathChanges,
    newStyles,
    deletedStyles,
  } = diff;

  const totalChanges =
    newVariables.length +
    valueChanges.length +
    pathChanges.length +
    deletedVariables.length;

  const hasBreaking =
    deletedVariables.length > 0 ||
    pathChanges.length > 0 ||
    deletedModes.length > 0 ||
    deletedStyles.length > 0;

  let md = `# Design Token Sync Report\n\n`;
  md += `**Generated:** ${metadata.timestamp}\n`;
  md += `**Author:** ${metadata.author}\n`;
  md += `**Figma File:** [View in Figma](${metadata.figmaFileUrl})\n\n`;
  md += `---\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `- ✨ **${newVariables.length} new tokens**\n`;
  md += `- 🔄 **${valueChanges.length} value changes**\n`;
  md += `- 📝 **${pathChanges.length} renamed tokens**\n`;
  md += `- ❌ **${deletedVariables.length} deleted tokens**\n\n`;

  if (newStyles.length > 0) {
    md += `- ✨ **${newStyles.length} new styles**\n`;
  }
  if (styleValueChanges.length > 0) {
    md += `- 🔄 **${styleValueChanges.length} style value changes**\n`;
  }
  if (deletedStyles.length > 0) {
    md += `- ❌ **${deletedStyles.length} deleted styles**\n`;
  }

  md += `\n---\n\n`;

  // Breaking changes section
  if (hasBreaking) {
    md += `## ⚠️ Breaking Changes\n\n`;
    md += `The following changes may break existing code:\n\n`;

    if (deletedVariables.length > 0) {
      md += `### Deleted Tokens\n\n`;
      deletedVariables.forEach(v => {
        md += `- \`${v.path}\` (was: \`${formatValue(v.value)}\`)\n`;
      });
      md += `\n`;
    }

    if (pathChanges.length > 0) {
      md += `### Renamed Tokens\n\n`;
      pathChanges.forEach(c => {
        md += `- \`${c.oldPath}\` → \`${c.newPath}\`\n`;
      });
      md += `\n`;
    }

    if (deletedModes.length > 0) {
      md += `### Deleted Modes\n\n`;
      deletedModes.forEach(m => {
        md += `- \`${m.collection}.${m.mode}\`\n`;
      });
      md += `\n`;
    }

    if (deletedStyles.length > 0) {
      md += `### Deleted Styles\n\n`;
      deletedStyles.forEach(s => {
        md += `- \`${s.path}\` (${s.styleType})\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // New tokens
  if (newVariables.length > 0) {
    md += `## New Tokens\n\n`;
    newVariables.slice(0, 20).forEach(v => {
      md += `- \`${v.path}\` = \`${formatValue(v.value)}\`\n`;
    });
    if (newVariables.length > 20) {
      md += `\n...and ${newVariables.length - 20} more\n`;
    }
    md += `\n---\n\n`;
  }

  // Value changes
  if (valueChanges.length > 0) {
    md += `## Value Changes\n\n`;
    valueChanges.slice(0, 20).forEach(v => {
      md += `- \`${v.path}\`: \`${formatValue(v.oldValue)}\` → \`${formatValue(v.newValue)}\`\n`;
    });
    if (valueChanges.length > 20) {
      md += `\n...and ${valueChanges.length - 20} more\n`;
    }
    md += `\n---\n\n`;
  }

  // Mode changes
  if (newModes.length > 0 || deletedModes.length > 0 || modeRenames.length > 0) {
    md += `## Mode Changes\n\n`;

    if (newModes.length > 0) {
      md += `### New Modes\n\n`;
      newModes.forEach(m => {
        md += `- ✨ \`${m.collection}.${m.mode}\`\n`;
      });
      md += `\n`;
    }

    if (modeRenames.length > 0) {
      md += `### Renamed Modes\n\n`;
      modeRenames.forEach(m => {
        md += `- \`${m.collection}.${m.oldMode}\` → \`${m.collection}.${m.newMode}\`\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // Collection renames
  if (collectionRenames.length > 0) {
    md += `## Collection Changes\n\n`;
    md += `### Renamed Collections\n\n`;
    collectionRenames.forEach(c => {
      md += `- \`${c.oldCollection}\` → \`${c.newCollection}\`\n`;
    });
    md += `\n---\n\n`;
  }

  // Style changes
  if (newStyles.length > 0 || styleValueChanges.length > 0 || stylePathChanges.length > 0) {
    md += `## Style Changes\n\n`;

    if (newStyles.length > 0) {
      md += `### New Styles\n\n`;
      newStyles.slice(0, 10).forEach(s => {
        md += `- ✨ \`${s.path}\` (${s.styleType})\n`;
      });
      if (newStyles.length > 10) {
        md += `\n...and ${newStyles.length - 10} more\n`;
      }
      md += `\n`;
    }

    if (styleValueChanges.length > 0) {
      md += `### Updated Styles\n\n`;
      styleValueChanges.slice(0, 10).forEach(s => {
        md += `- 🔄 \`${s.path}\` (${s.styleType})\n`;
      });
      if (styleValueChanges.length > 10) {
        md += `\n...and ${styleValueChanges.length - 10} more\n`;
      }
      md += `\n`;
    }

    if (stylePathChanges.length > 0) {
      md += `### Renamed Styles\n\n`;
      stylePathChanges.slice(0, 10).forEach(s => {
        md += `- 📝 \`${s.oldPath}\` → \`${s.newPath}\` (${s.styleType})\n`;
      });
      if (stylePathChanges.length > 10) {
        md += `\n...and ${stylePathChanges.length - 10} more\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // Footer
  md += `Generated by [Synkio](https://github.com/yourusername/synkio) Figma Plugin\n`;

  return md;
}

/**
 * Format a value for display in markdown
 */
function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object' && '$ref' in value) {
    return `{${(value as any).$ref}}`;
  }
  return JSON.stringify(value);
}

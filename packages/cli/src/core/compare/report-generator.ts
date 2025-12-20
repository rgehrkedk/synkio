/**
 * Report Generator
 *
 * Generates markdown diff reports from comparison results.
 */

import type {
  ComparisonResult,
  ValueChange,
  PathChange,
  CollectionRename,
  ModeRename,
  ModeChange,
  NewVariable,
  DeletedVariable,
} from '../../types/index.js';

import { getChangeCounts, hasChanges } from './utils.js';

/**
 * Metadata for report generation
 */
export interface ReportMetadata {
  fileName?: string;
  exportedAt?: string;
}

/**
 * Change counts for summary table
 */
export interface ChangeCounts {
  valueChanges: number;
  pathChanges: number;
  collectionRenames: number;
  modeRenames: number;
  newModes: number;
  deletedModes: number;
  newVariables: number;
  deletedVariables: number;
  total: number;
  breaking: number;
}

/**
 * Generate a complete markdown diff report
 *
 * @param result - Comparison result
 * @param metadata - Optional metadata (fileName, exportedAt)
 * @returns Markdown formatted report
 */
export function generateDiffReport(
  result: ComparisonResult,
  metadata?: ReportMetadata
): string {
  const timestamp = new Date().toISOString();
  let md = `# Figma Token Comparison Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**File:** ${metadata?.fileName || 'Unknown'}\n`;
  md += `**Last Synced:** ${metadata?.exportedAt || 'Unknown'}\n\n`;
  md += `---\n\n`;

  // Summary
  const counts = getChangeCounts(result);
  md += `## Summary\n\n`;
  md += generateSummaryTable(counts);
  md += '\n';

  if (!hasChanges(result)) {
    md += `**No changes detected!**\n\n`;
    return md;
  }

  // Value Changes
  md += generateValueChangesSection(result.valueChanges);

  // Path Changes (BREAKING)
  md += generatePathChangesSection(result.pathChanges);

  // Collection Renames (BREAKING)
  md += generateCollectionRenamesSection(result.collectionRenames);

  // Mode Renames (BREAKING)
  md += generateModeRenamesSection(result.modeRenames);

  // New Modes (BREAKING)
  md += generateNewModesSection(result.newModes);

  // Deleted Modes (BREAKING)
  md += generateDeletedModesSection(result.deletedModes);

  // New Variables
  md += generateNewVariablesSection(result.newVariables);

  // Deleted Variables (BREAKING)
  md += generateDeletedVariablesSection(result.deletedVariables);

  return md;
}

/**
 * Generate markdown summary table
 *
 * @param counts - Change counts
 * @returns Markdown table
 */
export function generateSummaryTable(counts: ChangeCounts): string {
  let md = `| Category | Count |\n`;
  md += `|----------|-------|\n`;
  md += `| Value Changes | ${counts.valueChanges} |\n`;
  md += `| Path Changes (BREAKING) | ${counts.pathChanges} |\n`;
  md += `| Collection Renames (BREAKING) | ${counts.collectionRenames} |\n`;
  md += `| Mode Renames (BREAKING) | ${counts.modeRenames} |\n`;
  md += `| New Modes (BREAKING) | ${counts.newModes} |\n`;
  md += `| Deleted Modes (BREAKING) | ${counts.deletedModes} |\n`;
  md += `| New Variables | ${counts.newVariables} |\n`;
  md += `| Deleted Variables (BREAKING) | ${counts.deletedVariables} |\n`;

  return md;
}

/**
 * Generate value changes section
 *
 * @param valueChanges - Array of value changes
 * @returns Markdown section
 */
export function generateValueChangesSection(valueChanges: ValueChange[]): string {
  if (valueChanges.length === 0) return '';

  let md = `## Value Changes (${valueChanges.length})\n\n`;
  md += `Changes where only the value differs (non-breaking).\n\n`;

  for (const change of valueChanges) {
    md += `### \`${change.path}\`\n\n`;
    md += `- **Type:** ${change.type}\n`;
    md += `- **Old value:** \`${JSON.stringify(change.oldValue)}\`\n`;
    md += `- **New value:** \`${JSON.stringify(change.newValue)}\`\n`;
    md += `- **Variable ID:** \`${change.variableId}\`\n\n`;
  }

  return md;
}

/**
 * Generate path changes section
 *
 * @param pathChanges - Array of path changes
 * @returns Markdown section
 */
export function generatePathChangesSection(pathChanges: PathChange[]): string {
  if (pathChanges.length === 0) return '';

  let md = `## Path Changes - BREAKING (${pathChanges.length})\n\n`;
  md += `Changes where the variable's path has moved. These are BREAKING changes.\n\n`;

  for (const change of pathChanges) {
    md += `### Path moved\n\n`;
    md += `- **Old path:** \`${change.oldPath}\`\n`;
    md += `- **New path:** \`${change.newPath}\`\n`;
    md += `- **Value:** \`${JSON.stringify(change.value)}\`\n`;
    md += `- **Type:** ${change.type}\n`;
    md += `- **Variable ID:** \`${change.variableId}\`\n\n`;
  }

  return md;
}

/**
 * Generate collection renames section
 *
 * @param collectionRenames - Array of collection renames
 * @returns Markdown section
 */
export function generateCollectionRenamesSection(collectionRenames: CollectionRename[]): string {
  if (collectionRenames.length === 0) return '';

  let md = `## Collection Renames - BREAKING (${collectionRenames.length})\n\n`;
  md += `Collections that have been renamed. Output folder names will change.\n\n`;

  for (const rename of collectionRenames) {
    md += `- \`${rename.oldCollection}\` -> \`${rename.newCollection}\`\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Generate mode renames section
 *
 * @param modeRenames - Array of mode renames
 * @returns Markdown section
 */
export function generateModeRenamesSection(modeRenames: ModeRename[]): string {
  if (modeRenames.length === 0) return '';

  let md = `## Mode Renames - BREAKING (${modeRenames.length})\n\n`;
  md += `Mode names that have been renamed. File names will change.\n\n`;

  for (const rename of modeRenames) {
    md += `- **${rename.collection}:** \`${rename.oldMode}\` -> \`${rename.newMode}\`\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Generate new modes section
 *
 * @param newModes - Array of new modes
 * @returns Markdown section
 */
export function generateNewModesSection(newModes: ModeChange[]): string {
  if (newModes.length === 0) return '';

  let md = `## New Modes - BREAKING (${newModes.length})\n\n`;
  md += `New mode names that will create new files. Developers may need to handle these.\n\n`;

  for (const modeChange of newModes) {
    md += `- **${modeChange.collection}:** \`${modeChange.mode}\`\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Generate deleted modes section
 *
 * @param deletedModes - Array of deleted modes
 * @returns Markdown section
 */
export function generateDeletedModesSection(deletedModes: ModeChange[]): string {
  if (deletedModes.length === 0) return '';

  let md = `## Deleted Modes - BREAKING (${deletedModes.length})\n\n`;
  md += `Mode names that existed in the baseline but are now deleted.\n\n`;

  for (const modeChange of deletedModes) {
    md += `- **${modeChange.collection}:** \`${modeChange.mode}\`\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Generate new variables section
 *
 * @param newVariables - Array of new variables
 * @returns Markdown section
 */
export function generateNewVariablesSection(newVariables: NewVariable[]): string {
  if (newVariables.length === 0) return '';

  let md = `## New Variables (${newVariables.length})\n\n`;
  md += `Variables that did not exist in the baseline.\n\n`;

  for (const newVar of newVariables) {
    md += `### \`${newVar.path}\`\n\n`;
    md += `- **Collection:** ${newVar.collection}\n`;
    md += `- **Mode:** ${newVar.mode}\n`;
    md += `- **Type:** ${newVar.type}\n`;
    md += `- **Value:** \`${JSON.stringify(newVar.value)}\`\n`;
    md += `- **Variable ID:** \`${newVar.variableId}\`\n\n`;
  }

  return md;
}

/**
 * Generate deleted variables section
 *
 * @param deletedVariables - Array of deleted variables
 * @returns Markdown section
 */
export function generateDeletedVariablesSection(deletedVariables: DeletedVariable[]): string {
  if (deletedVariables.length === 0) return '';

  let md = `## Deleted Variables - BREAKING (${deletedVariables.length})\n\n`;
  md += `Variables that existed in the baseline but are now deleted.\n\n`;

  for (const deleted of deletedVariables) {
    md += `### \`${deleted.path}\`\n\n`;
    md += `- **Collection:** ${deleted.collection}\n`;
    md += `- **Mode:** ${deleted.mode}\n`;
    md += `- **Type:** ${deleted.type}\n`;
    md += `- **Last value:** \`${JSON.stringify(deleted.value)}\`\n`;
    md += `- **Variable ID:** \`${deleted.variableId}\`\n\n`;
  }

  return md;
}

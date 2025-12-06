/**
 * Baseline Comparison Logic
 *
 * Compares two baselines and categorizes changes.
 */

import type {
  BaselineData,
  BaselineEntry,
  ComparisonResult,
  ValueChange,
  PathChange,
  NewVariable,
  DeletedVariable,
} from '../types';

import { parseVariableId } from '../tokens';

/**
 * Compare two baselines and return categorized changes
 */
export function compareBaselines(baseline: BaselineData, fetched: BaselineData): ComparisonResult {
  const result: ComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    newModeNames: [],
    deletedModeNames: [],
    newVariables: [],
    deletedVariables: [],
  };

  const baselineEntries = baseline.baseline || {};
  const fetchedEntries = fetched.baseline || {};

  // Build lookup maps
  const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();
  const baselineModeNames = new Set<string>();

  for (const [prefixedId, entry] of Object.entries(baselineEntries)) {
    const { varId, mode } = parseVariableId(prefixedId);

    if (!baselineByVarId.has(varId)) {
      baselineByVarId.set(varId, new Map());
    }
    baselineByVarId.get(varId)!.set(mode, entry);
    baselineModeNames.add(mode);
  }

  // Track new and fetched mode names
  const newModeNames = new Set<string>();
  const fetchedModeNames = new Set<string>();

  // Compare fetched against baseline
  for (const [prefixedId, fetchedEntry] of Object.entries(fetchedEntries)) {
    const { varId, mode } = parseVariableId(prefixedId);
    fetchedModeNames.add(mode);

    // Check if this variable ID exists in baseline
    if (!baselineByVarId.has(varId)) {
      // Completely new variable
      result.newVariables.push({
        variableId: prefixedId,
        path: fetchedEntry.path,
        value: fetchedEntry.value,
        type: fetchedEntry.type,
        collection: fetchedEntry.collection,
        mode: fetchedEntry.mode,
      });
      continue;
    }

    const baselineModes = baselineByVarId.get(varId)!;

    // Check if this specific mode existed in baseline
    if (!baselineModes.has(mode)) {
      // Track new mode name
      if (!baselineModeNames.has(mode)) {
        newModeNames.add(mode);
      }
      continue;
    }

    const baselineEntry = baselineModes.get(mode)!;

    // Compare path
    if (baselineEntry.path !== fetchedEntry.path) {
      // Path changed - BREAKING
      result.pathChanges.push({
        variableId: prefixedId,
        oldPath: baselineEntry.path,
        newPath: fetchedEntry.path,
        value: fetchedEntry.value,
        type: fetchedEntry.type,
      });
      continue;
    }

    // Compare value
    if (JSON.stringify(baselineEntry.value) !== JSON.stringify(fetchedEntry.value)) {
      // Value changed
      result.valueChanges.push({
        variableId: prefixedId,
        path: fetchedEntry.path,
        oldValue: baselineEntry.value,
        newValue: fetchedEntry.value,
        type: fetchedEntry.type,
      });
    }
  }

  // Find deleted mode names (in baseline but not in fetched)
  const deletedModeNames = new Set<string>();
  for (const modeName of baselineModeNames) {
    if (!fetchedModeNames.has(modeName)) {
      deletedModeNames.add(modeName);
    }
  }
  result.deletedModeNames = Array.from(deletedModeNames);

  // Check for deleted variables (in baseline but not in fetched)
  // BUT: Don't count variables that belong to deleted modes
  for (const [prefixedId, baselineEntry] of Object.entries(baselineEntries)) {
    if (!fetchedEntries[prefixedId]) {
      // Skip if this variable belongs to a deleted mode
      if (deletedModeNames.has(baselineEntry.mode)) {
        continue;
      }

      result.deletedVariables.push({
        variableId: prefixedId,
        path: baselineEntry.path,
        value: baselineEntry.value,
        type: baselineEntry.type,
        collection: baselineEntry.collection,
        mode: baselineEntry.mode,
      });
    }
  }

  // Convert new mode names Set to array
  result.newModeNames = Array.from(newModeNames);

  return result;
}

/**
 * Check if there are any changes
 */
export function hasChanges(result: ComparisonResult): boolean {
  return (
    result.valueChanges.length > 0 ||
    result.pathChanges.length > 0 ||
    result.newModeNames.length > 0 ||
    result.deletedModeNames.length > 0 ||
    result.newVariables.length > 0 ||
    result.deletedVariables.length > 0
  );
}

/**
 * Check if there are breaking changes
 */
export function hasBreakingChanges(result: ComparisonResult): boolean {
  return (
    result.pathChanges.length > 0 ||
    result.deletedModeNames.length > 0 ||
    result.deletedVariables.length > 0
  );
}

/**
 * Get counts summary
 */
export function getChangeCounts(result: ComparisonResult) {
  return {
    valueChanges: result.valueChanges.length,
    pathChanges: result.pathChanges.length,
    newModes: result.newModeNames.length,
    deletedModes: result.deletedModeNames.length,
    newVariables: result.newVariables.length,
    deletedVariables: result.deletedVariables.length,
    total:
      result.valueChanges.length +
      result.pathChanges.length +
      result.newModeNames.length +
      result.deletedModeNames.length +
      result.newVariables.length +
      result.deletedVariables.length,
    breaking:
      result.pathChanges.length +
      result.deletedModeNames.length +
      result.deletedVariables.length,
  };
}

/**
 * Generate Markdown report
 */
export function generateDiffReport(result: ComparisonResult, metadata?: { fileName?: string; exportedAt?: string }): string {
  const timestamp = new Date().toISOString();
  let md = `# Figma Token Comparison Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**File:** ${metadata?.fileName || 'Unknown'}\n`;
  md += `**Last Synced:** ${metadata?.exportedAt || 'Unknown'}\n\n`;
  md += `---\n\n`;

  // Summary
  const counts = getChangeCounts(result);
  md += `## Summary\n\n`;
  md += `| Category | Count |\n`;
  md += `|----------|-------|\n`;
  md += `| Value Changes | ${counts.valueChanges} |\n`;
  md += `| Path Changes (BREAKING) | ${counts.pathChanges} |\n`;
  md += `| New Modes | ${counts.newModes} |\n`;
  md += `| Deleted Modes (BREAKING) | ${counts.deletedModes} |\n`;
  md += `| New Variables | ${counts.newVariables} |\n`;
  md += `| Deleted Variables (BREAKING) | ${counts.deletedVariables} |\n\n`;

  if (!hasChanges(result)) {
    md += `**No changes detected!**\n\n`;
    return md;
  }

  // Value Changes
  if (result.valueChanges.length > 0) {
    md += `## Value Changes (${result.valueChanges.length})\n\n`;
    md += `Changes where only the value differs (non-breaking).\n\n`;

    for (const change of result.valueChanges) {
      md += `### \`${change.path}\`\n\n`;
      md += `- **Type:** ${change.type}\n`;
      md += `- **Old value:** \`${JSON.stringify(change.oldValue)}\`\n`;
      md += `- **New value:** \`${JSON.stringify(change.newValue)}\`\n`;
      md += `- **Variable ID:** \`${change.variableId}\`\n\n`;
    }
  }

  // Path Changes (BREAKING)
  if (result.pathChanges.length > 0) {
    md += `## Path Changes - BREAKING (${result.pathChanges.length})\n\n`;
    md += `Changes where the variable's path has moved. These are BREAKING changes.\n\n`;

    for (const change of result.pathChanges) {
      md += `### Path moved\n\n`;
      md += `- **Old path:** \`${change.oldPath}\`\n`;
      md += `- **New path:** \`${change.newPath}\`\n`;
      md += `- **Value:** \`${JSON.stringify(change.value)}\`\n`;
      md += `- **Type:** ${change.type}\n`;
      md += `- **Variable ID:** \`${change.variableId}\`\n\n`;
    }
  }

  // New Modes
  if (result.newModeNames.length > 0) {
    md += `## New Modes (${result.newModeNames.length})\n\n`;
    md += `New mode names found that didn't exist in the baseline.\n\n`;

    for (const modeName of result.newModeNames) {
      md += `- \`${modeName}\`\n`;
    }
    md += `\n`;
  }

  // Deleted Modes (BREAKING)
  if (result.deletedModeNames.length > 0) {
    md += `## Deleted Modes - BREAKING (${result.deletedModeNames.length})\n\n`;
    md += `Mode names that existed in the baseline but are now deleted.\n\n`;

    for (const modeName of result.deletedModeNames) {
      md += `- \`${modeName}\`\n`;
    }
    md += `\n`;
  }

  // New Variables
  if (result.newVariables.length > 0) {
    md += `## New Variables (${result.newVariables.length})\n\n`;
    md += `Variables that did not exist in the baseline.\n\n`;

    for (const newVar of result.newVariables) {
      md += `### \`${newVar.path}\`\n\n`;
      md += `- **Collection:** ${newVar.collection}\n`;
      md += `- **Mode:** ${newVar.mode}\n`;
      md += `- **Type:** ${newVar.type}\n`;
      md += `- **Value:** \`${JSON.stringify(newVar.value)}\`\n`;
      md += `- **Variable ID:** \`${newVar.variableId}\`\n\n`;
    }
  }

  // Deleted Variables (BREAKING)
  if (result.deletedVariables.length > 0) {
    md += `## Deleted Variables - BREAKING (${result.deletedVariables.length})\n\n`;
    md += `Variables that existed in the baseline but are now deleted.\n\n`;

    for (const deleted of result.deletedVariables) {
      md += `### \`${deleted.path}\`\n\n`;
      md += `- **Collection:** ${deleted.collection}\n`;
      md += `- **Mode:** ${deleted.mode}\n`;
      md += `- **Type:** ${deleted.type}\n`;
      md += `- **Last value:** \`${JSON.stringify(deleted.value)}\`\n`;
      md += `- **Variable ID:** \`${deleted.variableId}\`\n\n`;
    }
  }

  return md;
}

/**
 * Print summary to console
 */
export function printDiffSummary(result: ComparisonResult): void {
  const counts = getChangeCounts(result);

  console.log('\n' + '='.repeat(60));
  console.log('  Comparison Summary');
  console.log('='.repeat(60) + '\n');

  if (!hasChanges(result)) {
    console.log('  No changes detected.\n');
    return;
  }

  console.log(`  Value changes:      ${counts.valueChanges}`);
  console.log(`  Path changes:       ${counts.pathChanges} ${counts.pathChanges > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New modes:          ${counts.newModes}`);
  console.log(`  Deleted modes:      ${counts.deletedModes} ${counts.deletedModes > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New variables:      ${counts.newVariables}`);
  console.log(`  Deleted variables:  ${counts.deletedVariables} ${counts.deletedVariables > 0 ? '(BREAKING)' : ''}`);
  console.log('');
  console.log(`  Total changes: ${counts.total}`);

  if (counts.breaking > 0) {
    console.log(`  Breaking changes: ${counts.breaking}`);
  }

  console.log('');
}

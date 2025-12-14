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
  ModeRename,
} from '../types/index.js';

import { parseVariableId } from './tokens.js';

/**
 * Compare two baselines and return categorized changes
 */
export function compareBaselines(baseline: BaselineData, fetched: BaselineData): ComparisonResult {
  const result: ComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    modeRenames: [],
    newModeNames: [],
    deletedModeNames: [],
    newVariables: [],
    deletedVariables: [],
  };

  // Handle nested baseline structure: baseline.baseline may contain { baseline: {...entries...}, theme: {...}, etc. }
  // The actual entries are in the nested 'baseline' property if it exists
  const rawBaseline = baseline.baseline || {};
  const rawFetched = fetched.baseline || {};
  
  const baselineEntries: Record<string, BaselineEntry> = (rawBaseline as any).baseline || rawBaseline;
  const fetchedEntries: Record<string, BaselineEntry> = (rawFetched as any).baseline || rawFetched;

  // Build lookup maps
  // Use entry.variableId and entry.mode directly since the prefixed key format is complex
  const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();
  const baselineModesByCollection = new Map<string, Set<string>>();

  for (const [prefixedId, entry] of Object.entries(baselineEntries)) {
    // Use the variableId from the entry if available, otherwise fall back to parsing
    const varId = entry.variableId || parseVariableId(prefixedId).varId;
    const mode = entry.mode || parseVariableId(prefixedId).mode;
    const collection = entry.collection || 'unknown';

    if (!baselineByVarId.has(varId)) {
      baselineByVarId.set(varId, new Map());
    }
    baselineByVarId.get(varId)!.set(mode, entry);
    
    // Track modes per collection
    if (!baselineModesByCollection.has(collection)) {
      baselineModesByCollection.set(collection, new Set());
    }
    baselineModesByCollection.get(collection)!.add(mode);
  }

  // Track fetched modes by collection
  const fetchedModesByCollection = new Map<string, Set<string>>();

  // Compare fetched against baseline
  for (const [prefixedId, fetchedEntry] of Object.entries(fetchedEntries)) {
    // Use the variableId from the entry if available, otherwise fall back to parsing
    const varId = fetchedEntry.variableId || parseVariableId(prefixedId).varId;
    const mode = fetchedEntry.mode || parseVariableId(prefixedId).mode;
    const collection = fetchedEntry.collection || 'unknown';
    
    // Track modes per collection
    if (!fetchedModesByCollection.has(collection)) {
      fetchedModesByCollection.set(collection, new Set());
    }
    fetchedModesByCollection.get(collection)!.add(mode);

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
      // Mode doesn't exist for this variable - could be new mode or renamed mode
      // We'll handle this after analyzing all modes per collection
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

  // Detect mode renames, new modes, and deleted modes per collection
  const allCollections = new Set([...baselineModesByCollection.keys(), ...fetchedModesByCollection.keys()]);
  const renamedModes = new Set<string>(); // Track renamed old mode names to exclude from deleted
  
  for (const collection of allCollections) {
    const baselineModes = baselineModesByCollection.get(collection) || new Set<string>();
    const fetchedModes = fetchedModesByCollection.get(collection) || new Set<string>();
    
    const deletedInCollection = [...baselineModes].filter(m => !fetchedModes.has(m));
    const newInCollection = [...fetchedModes].filter(m => !baselineModes.has(m));
    
    // If same number of modes deleted and added in a collection, it's likely a rename
    if (deletedInCollection.length === newInCollection.length && deletedInCollection.length > 0) {
      // Pair them up as renames (for single mode rename, this is straightforward)
      for (let i = 0; i < deletedInCollection.length; i++) {
        result.modeRenames.push({
          collection,
          oldMode: deletedInCollection[i],
          newMode: newInCollection[i],
        });
        renamedModes.add(deletedInCollection[i]);
      }
    } else {
      // Not a simple rename - track as deleted/new
      for (const mode of deletedInCollection) {
        if (!result.deletedModeNames.includes(mode)) {
          result.deletedModeNames.push(mode);
        }
      }
      for (const mode of newInCollection) {
        if (!result.newModeNames.includes(mode)) {
          result.newModeNames.push(mode);
        }
      }
    }
  }

  // Check for deleted variables (in baseline but not in fetched)
  // BUT: Don't count variables that belong to deleted or renamed modes
  const deletedModeSet = new Set(result.deletedModeNames);
  for (const [prefixedId, baselineEntry] of Object.entries(baselineEntries)) {
    if (!fetchedEntries[prefixedId]) {
      // Skip if this variable belongs to a deleted or renamed mode
      if (deletedModeSet.has(baselineEntry.mode) || renamedModes.has(baselineEntry.mode)) {
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

  return result;
}

/**
 * Check if there are any changes
 */
export function hasChanges(result: ComparisonResult): boolean {
  return (
    result.valueChanges.length > 0 ||
    result.pathChanges.length > 0 ||
    result.modeRenames.length > 0 ||
    result.newModeNames.length > 0 ||
    result.deletedModeNames.length > 0 ||
    result.newVariables.length > 0 ||
    result.deletedVariables.length > 0
  );
}

/**
 * Check if there are breaking changes
 * Breaking = requires developer action (path changes, mode changes, deletions)
 */
export function hasBreakingChanges(result: ComparisonResult): boolean {
  return (
    result.pathChanges.length > 0 ||
    result.modeRenames.length > 0 ||
    result.newModeNames.length > 0 ||
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
    modeRenames: result.modeRenames.length,
    newModes: result.newModeNames.length,
    deletedModes: result.deletedModeNames.length,
    newVariables: result.newVariables.length,
    deletedVariables: result.deletedVariables.length,
    total:
      result.valueChanges.length +
      result.pathChanges.length +
      result.modeRenames.length +
      result.newModeNames.length +
      result.deletedModeNames.length +
      result.newVariables.length +
      result.deletedVariables.length,
    breaking:
      result.pathChanges.length +
      result.modeRenames.length +
      result.newModeNames.length +
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
  md += `| Mode Renames (BREAKING) | ${counts.modeRenames} |\n`;
  md += `| New Modes (BREAKING) | ${counts.newModes} |\n`;
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

  // Mode Renames (BREAKING)
  if (result.modeRenames.length > 0) {
    md += `## Mode Renames - BREAKING (${result.modeRenames.length})\n\n`;
    md += `Mode names that have been renamed. File names will change.\n\n`;

    for (const rename of result.modeRenames) {
      md += `- **${rename.collection}:** \`${rename.oldMode}\` → \`${rename.newMode}\`\n`;
    }
    md += `\n`;
  }

  // New Modes (BREAKING)
  if (result.newModeNames.length > 0) {
    md += `## New Modes - BREAKING (${result.newModeNames.length})\n\n`;
    md += `New mode names that will create new files. Developers may need to handle these.\n\n`;

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
  console.log(`  Mode renames:       ${counts.modeRenames} ${counts.modeRenames > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New modes:          ${counts.newModes} ${counts.newModes > 0 ? '(BREAKING)' : ''}`);
  console.log(`  Deleted modes:      ${counts.deletedModes} ${counts.deletedModes > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New variables:      ${counts.newVariables}`);
  console.log(`  Deleted variables:  ${counts.deletedVariables} ${counts.deletedVariables > 0 ? '(BREAKING)' : ''}`);
  console.log('');
  console.log(`  Total changes: ${counts.total}`);

  if (counts.breaking > 0) {
    console.log(`  Breaking changes: ${counts.breaking}`);
  }

  console.log('');

  // Show detailed breaking changes
  if (counts.breaking > 0) {
    console.log('-'.repeat(60));
    console.log('  ⚠️  BREAKING CHANGES DETAILS');
    console.log('-'.repeat(60) + '\n');

    // Path changes
    if (result.pathChanges.length > 0) {
      console.log(`  Path changes (${result.pathChanges.length}):`);
      result.pathChanges.forEach(change => {
        console.log(`    ${change.oldPath}`);
        console.log(`      → ${change.newPath}`);
      });
      console.log('');
    }

    // Mode renames
    if (result.modeRenames.length > 0) {
      console.log(`  Mode renames (${result.modeRenames.length}):`);
      result.modeRenames.forEach(rename => {
        console.log(`    ${rename.collection}: ${rename.oldMode} → ${rename.newMode}`);
      });
      console.log('');
    }

    // New modes
    if (result.newModeNames.length > 0) {
      console.log(`  New modes (${result.newModeNames.length}):`);
      result.newModeNames.forEach(mode => {
        console.log(`    + ${mode}`);
      });
      console.log('');
    }

    // Deleted variables
    if (result.deletedVariables.length > 0) {
      console.log(`  Deleted variables (${result.deletedVariables.length}):`);
      result.deletedVariables.forEach(v => {
        console.log(`    - ${v.path}`);
      });
      console.log('');
    }

    // Deleted modes
    if (result.deletedModeNames.length > 0) {
      console.log(`  Deleted modes (${result.deletedModeNames.length}):`);
      result.deletedModeNames.forEach(mode => {
        console.log(`    - ${mode}`);
      });
      console.log('');
    }
  }

  // Show new variables
  if (result.newVariables.length > 0) {
    console.log('-'.repeat(60));
    console.log('  New variables');
    console.log('-'.repeat(60) + '\n');
    result.newVariables.forEach(v => {
      console.log(`    + ${v.path} (${v.type})`);
    });
    console.log('');
  }

  // Show value changes
  if (result.valueChanges.length > 0) {
    console.log('-'.repeat(60));
    console.log('  Value changes');
    console.log('-'.repeat(60) + '\n');
    result.valueChanges.forEach(change => {
      console.log(`    ${change.path}`);
      console.log(`      ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`);
    });
    console.log('');
  }
}

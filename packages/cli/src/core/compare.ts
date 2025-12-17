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
  ModeChange,
  CollectionRename,
} from '../types/index.js';

import { parseVariableId } from './tokens.js';

/**
 * Compare two baselines and return categorized changes
 */
export function compareBaselines(baseline: BaselineData, fetched: BaselineData): ComparisonResult {
  const result: ComparisonResult = {
    valueChanges: [],
    pathChanges: [],
    collectionRenames: [],
    modeRenames: [],
    newModes: [],
    deletedModes: [],
    newVariables: [],
    deletedVariables: [],
  };

  // Handle nested baseline structure: baseline.baseline may contain { baseline: {...entries...}, theme: {...}, etc. }
  // The actual entries are in the nested 'baseline' property if it exists
  const rawBaseline = baseline.baseline || {};
  const rawFetched = fetched.baseline || {};

  const baselineEntries: Record<string, BaselineEntry> = (rawBaseline as any).baseline || rawBaseline;
  const fetchedEntries: Record<string, BaselineEntry> = (rawFetched as any).baseline || rawFetched;

  // ============================================
  // Check if we have IDs available
  // ============================================
  const baselineHasIds = Object.values(baselineEntries).some(e => e.collectionId && e.modeId);
  const fetchedHasIds = Object.values(fetchedEntries).some(e => e.collectionId && e.modeId);
  const useIdBasedMatching = baselineHasIds && fetchedHasIds;

  // Build lookup maps for variable comparison (used in both approaches)
  const baselineByVarId = new Map<string, Map<string, BaselineEntry>>();

  for (const [prefixedId, entry] of Object.entries(baselineEntries)) {
    const varId = entry.variableId || parseVariableId(prefixedId).varId;
    const mode = entry.mode || parseVariableId(prefixedId).mode;

    if (!baselineByVarId.has(varId)) {
      baselineByVarId.set(varId, new Map());
    }
    baselineByVarId.get(varId)!.set(mode, entry);
  }

  // Track which modes have been renamed to exclude them from deletion detection
  const renamedModes = new Set<string>();

  if (useIdBasedMatching) {
    // ============================================
    // ID-BASED MATCHING (preferred)
    // ============================================

    // Build ID-based lookup maps
    interface CollectionInfo {
      name: string;
      modes: Map<string, string>; // modeId -> modeName
    }

    const baselineCollections = new Map<string, CollectionInfo>();
    const fetchedCollections = new Map<string, CollectionInfo>();

    // Build baseline collection/mode map
    for (const entry of Object.values(baselineEntries)) {
      if (!entry.collectionId || !entry.modeId) continue;

      if (!baselineCollections.has(entry.collectionId)) {
        baselineCollections.set(entry.collectionId, {
          name: entry.collection,
          modes: new Map()
        });
      }

      baselineCollections.get(entry.collectionId)!.modes.set(entry.modeId, entry.mode);
    }

    // Build fetched collection/mode map
    for (const entry of Object.values(fetchedEntries)) {
      if (!entry.collectionId || !entry.modeId) continue;

      if (!fetchedCollections.has(entry.collectionId)) {
        fetchedCollections.set(entry.collectionId, {
          name: entry.collection,
          modes: new Map()
        });
      }

      fetchedCollections.get(entry.collectionId)!.modes.set(entry.modeId, entry.mode);
    }

    // Detect collection renames (same collectionId, different name)
    for (const [collectionId, baselineCol] of baselineCollections) {
      const fetchedCol = fetchedCollections.get(collectionId);
      if (fetchedCol && baselineCol.name !== fetchedCol.name) {
        result.collectionRenames.push({
          oldCollection: baselineCol.name,
          newCollection: fetchedCol.name,
          modeMapping: [],
        });
      }
    }

    // Detect mode renames (same modeId, different mode name)
    for (const [collectionId, baselineCol] of baselineCollections) {
      const fetchedCol = fetchedCollections.get(collectionId);
      if (!fetchedCol) continue;

      for (const [modeId, baselineModeName] of baselineCol.modes) {
        const fetchedModeName = fetchedCol.modes.get(modeId);
        if (fetchedModeName && baselineModeName !== fetchedModeName) {
          result.modeRenames.push({
            collection: fetchedCol.name, // Use new collection name in case collection was also renamed
            oldMode: baselineModeName,
            newMode: fetchedModeName,
          });
          // Track this mode as renamed using old collection name
          renamedModes.add(`${baselineCol.name}:${baselineModeName}`);
        }
      }
    }

    // Detect new/deleted collections
    for (const [collectionId, fetchedCol] of fetchedCollections) {
      if (!baselineCollections.has(collectionId)) {
        // Completely new collection - all modes are new
        for (const modeName of fetchedCol.modes.values()) {
          result.newModes.push({ collection: fetchedCol.name, mode: modeName });
        }
      }
    }

    for (const [collectionId, baselineCol] of baselineCollections) {
      if (!fetchedCollections.has(collectionId)) {
        // Completely deleted collection - all modes are deleted
        for (const modeName of baselineCol.modes.values()) {
          result.deletedModes.push({ collection: baselineCol.name, mode: modeName });
          renamedModes.add(`${baselineCol.name}:${modeName}`); // Mark as renamed to exclude from variable deletion
        }
      }
    }

    // Detect new/deleted modes within existing collections
    for (const [collectionId, baselineCol] of baselineCollections) {
      const fetchedCol = fetchedCollections.get(collectionId);
      if (!fetchedCol) continue;

      // New modes (modeId in fetched but not in baseline)
      for (const [modeId, modeName] of fetchedCol.modes) {
        if (!baselineCol.modes.has(modeId)) {
          result.newModes.push({ collection: fetchedCol.name, mode: modeName });
        }
      }

      // Deleted modes (modeId in baseline but not in fetched)
      for (const [modeId, modeName] of baselineCol.modes) {
        if (!fetchedCol.modes.has(modeId)) {
          result.deletedModes.push({ collection: baselineCol.name, mode: modeName });
          renamedModes.add(`${baselineCol.name}:${modeName}`); // Mark as renamed to exclude from variable deletion
        }
      }
    }

  } else {
    // ============================================
    // FALLBACK: HEURISTIC MATCHING (legacy baselines without IDs)
    // ============================================

    const baselineModesByCollection = new Map<string, Set<string>>();
    const fetchedModesByCollection = new Map<string, Set<string>>();

    // Build collection/mode maps using collection and mode names
    for (const entry of Object.values(baselineEntries)) {
      const collection = entry.collection || 'unknown';
      if (!baselineModesByCollection.has(collection)) {
        baselineModesByCollection.set(collection, new Set());
      }
      baselineModesByCollection.get(collection)!.add(entry.mode);
    }

    for (const entry of Object.values(fetchedEntries)) {
      const collection = entry.collection || 'unknown';
      if (!fetchedModesByCollection.has(collection)) {
        fetchedModesByCollection.set(collection, new Set());
      }
      fetchedModesByCollection.get(collection)!.add(entry.mode);
    }

    // Detect collection renames using heuristic (same mode count)
    const baselineOnlyCollections = [...baselineModesByCollection.keys()].filter(c => !fetchedModesByCollection.has(c));
    const fetchedOnlyCollections = [...fetchedModesByCollection.keys()].filter(c => !baselineModesByCollection.has(c));

    const unmatchedBaseline = [...baselineOnlyCollections];
    const unmatchedFetched = [...fetchedOnlyCollections];

    for (const oldCollection of baselineOnlyCollections) {
      const oldModes = [...(baselineModesByCollection.get(oldCollection) || new Set<string>())];

      // Find a new collection with the same number of modes (heuristic)
      const matchIndex = unmatchedFetched.findIndex(newCollection => {
        const newModes = fetchedModesByCollection.get(newCollection) || new Set<string>();
        return newModes.size === oldModes.length;
      });

      if (matchIndex !== -1) {
        const newCollection = unmatchedFetched[matchIndex];
        const newModes = [...(fetchedModesByCollection.get(newCollection) || new Set<string>())];

        // Record collection rename
        result.collectionRenames.push({
          oldCollection,
          newCollection,
          modeMapping: [],
        });

        // Track mode renames within the renamed collection
        for (let i = 0; i < oldModes.length; i++) {
          const oldMode = oldModes[i];
          const newMode = newModes[i];

          // Always track as renamed to exclude from deleted variables check
          renamedModes.add(`${oldCollection}:${oldMode}`);

          // Only add to modeRenames if the mode name actually changed
          if (oldMode !== newMode) {
            result.modeRenames.push({
              collection: newCollection, // Use the new collection name
              oldMode,
              newMode,
            });
          }
        }

        unmatchedBaseline.splice(unmatchedBaseline.indexOf(oldCollection), 1);
        unmatchedFetched.splice(matchIndex, 1);
      }
    }

    // Handle remaining unmatched collections as truly new/deleted
    for (const collection of unmatchedBaseline) {
      const modes = baselineModesByCollection.get(collection) || new Set<string>();
      for (const mode of modes) {
        result.deletedModes.push({ collection, mode });
        renamedModes.add(`${collection}:${mode}`);
      }
    }

    for (const collection of unmatchedFetched) {
      const modes = fetchedModesByCollection.get(collection) || new Set<string>();
      for (const mode of modes) {
        result.newModes.push({ collection, mode });
      }
    }

    // Handle mode renames within collections that exist in both baseline and fetched
    const sharedCollections = [...baselineModesByCollection.keys()].filter(c => fetchedModesByCollection.has(c));

    for (const collection of sharedCollections) {
      const baselineModes = baselineModesByCollection.get(collection) || new Set<string>();
      const fetchedModes = fetchedModesByCollection.get(collection) || new Set<string>();

      const deletedInCollection = [...baselineModes].filter(m => !fetchedModes.has(m));
      const newInCollection = [...fetchedModes].filter(m => !baselineModes.has(m));

      // If same number of modes deleted and added in a collection, it's likely a rename (heuristic)
      if (deletedInCollection.length === newInCollection.length && deletedInCollection.length > 0) {
        // Pair them up as renames
        for (let i = 0; i < deletedInCollection.length; i++) {
          result.modeRenames.push({
            collection,
            oldMode: deletedInCollection[i],
            newMode: newInCollection[i],
          });
          renamedModes.add(`${collection}:${deletedInCollection[i]}`);
        }
      } else {
        // Not a simple rename - track as deleted/new
        for (const mode of deletedInCollection) {
          result.deletedModes.push({ collection, mode });
          renamedModes.add(`${collection}:${mode}`);
        }
        for (const mode of newInCollection) {
          result.newModes.push({ collection, mode });
        }
      }
    }
  }

  // ============================================
  // Token comparison (same for both approaches)
  // ============================================

  // Compare fetched against baseline to find changes and new variables
  for (const [prefixedId, fetchedEntry] of Object.entries(fetchedEntries)) {
    const varId = fetchedEntry.variableId || parseVariableId(prefixedId).varId;
    const mode = fetchedEntry.mode || parseVariableId(prefixedId).mode;

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
      // This is handled by the mode detection logic above
      continue;
    }

    const baselineEntry = baselineModes.get(mode)!;

    // Compare path
    const pathChanged = baselineEntry.path !== fetchedEntry.path;
    if (pathChanged) {
      // Path changed - BREAKING
      result.pathChanges.push({
        variableId: prefixedId,
        oldPath: baselineEntry.path,
        newPath: fetchedEntry.path,
        value: fetchedEntry.value,
        type: fetchedEntry.type,
      });
    }

    // Compare value (check even if path changed - both can happen simultaneously)
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

  // Check for deleted variables (in baseline but not in fetched)
  // BUT: Don't count variables that belong to deleted or renamed modes
  const deletedModeSet = new Set(result.deletedModes.map(m => `${m.collection}:${m.mode}`));
  for (const [prefixedId, baselineEntry] of Object.entries(baselineEntries)) {
    if (!fetchedEntries[prefixedId]) {
      // Skip if this variable belongs to a deleted or renamed mode
      const modeKey = `${baselineEntry.collection}:${baselineEntry.mode}`;
      if (deletedModeSet.has(modeKey) || renamedModes.has(modeKey)) {
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
    result.collectionRenames.length > 0 ||
    result.modeRenames.length > 0 ||
    result.newModes.length > 0 ||
    result.deletedModes.length > 0 ||
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
    result.collectionRenames.length > 0 ||
    result.modeRenames.length > 0 ||
    result.newModes.length > 0 ||
    result.deletedModes.length > 0 ||
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
    collectionRenames: result.collectionRenames.length,
    modeRenames: result.modeRenames.length,
    newModes: result.newModes.length,
    deletedModes: result.deletedModes.length,
    newVariables: result.newVariables.length,
    deletedVariables: result.deletedVariables.length,
    total:
      result.valueChanges.length +
      result.pathChanges.length +
      result.collectionRenames.length +
      result.modeRenames.length +
      result.newModes.length +
      result.deletedModes.length +
      result.newVariables.length +
      result.deletedVariables.length,
    breaking:
      result.pathChanges.length +
      result.collectionRenames.length +
      result.modeRenames.length +
      result.newModes.length +
      result.deletedModes.length +
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
  md += `| Collection Renames (BREAKING) | ${counts.collectionRenames} |\n`;
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

  // Collection Renames (BREAKING)
  if (result.collectionRenames.length > 0) {
    md += `## Collection Renames - BREAKING (${result.collectionRenames.length})\n\n`;
    md += `Collections that have been renamed. Output folder names will change.\n\n`;

    for (const rename of result.collectionRenames) {
      md += `- \`${rename.oldCollection}\` → \`${rename.newCollection}\`\n`;
    }
    md += `\n`;
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
  if (result.newModes.length > 0) {
    md += `## New Modes - BREAKING (${result.newModes.length})\n\n`;
    md += `New mode names that will create new files. Developers may need to handle these.\n\n`;

    for (const modeChange of result.newModes) {
      md += `- **${modeChange.collection}:** \`${modeChange.mode}\`\n`;
    }
    md += `\n`;
  }

  // Deleted Modes (BREAKING)
  if (result.deletedModes.length > 0) {
    md += `## Deleted Modes - BREAKING (${result.deletedModes.length})\n\n`;
    md += `Mode names that existed in the baseline but are now deleted.\n\n`;

    for (const modeChange of result.deletedModes) {
      md += `- **${modeChange.collection}:** \`${modeChange.mode}\`\n`;
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

  console.log(`  Value changes:        ${counts.valueChanges}`);
  console.log(`  Path changes:         ${counts.pathChanges} ${counts.pathChanges > 0 ? '(BREAKING)' : ''}`);
  console.log(`  Collection renames:   ${counts.collectionRenames} ${counts.collectionRenames > 0 ? '(BREAKING)' : ''}`);
  console.log(`  Mode renames:         ${counts.modeRenames} ${counts.modeRenames > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New modes:            ${counts.newModes} ${counts.newModes > 0 ? '(BREAKING)' : ''}`);
  console.log(`  Deleted modes:        ${counts.deletedModes} ${counts.deletedModes > 0 ? '(BREAKING)' : ''}`);
  console.log(`  New variables:        ${counts.newVariables}`);
  console.log(`  Deleted variables:    ${counts.deletedVariables} ${counts.deletedVariables > 0 ? '(BREAKING)' : ''}`);
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

    // Collection renames
    if (result.collectionRenames.length > 0) {
      console.log(`  Collection renames (${result.collectionRenames.length}):`);
      result.collectionRenames.forEach(rename => {
        console.log(`    ${rename.oldCollection} → ${rename.newCollection}`);
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
    if (result.newModes.length > 0) {
      console.log(`  New modes (${result.newModes.length}):`);
      result.newModes.forEach(m => {
        console.log(`    + ${m.collection}: ${m.mode}`);
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
    if (result.deletedModes.length > 0) {
      console.log(`  Deleted modes (${result.deletedModes.length}):`);
      result.deletedModes.forEach(m => {
        console.log(`    - ${m.collection}: ${m.mode}`);
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

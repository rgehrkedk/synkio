/**
 * Diff comparison logic
 * Compares current snapshot with baseline to find changes
 */

import type { SyncData, DiffEntry, TokenEntry, ComparisonResult, CollectionRename, ModeRename } from './types.js';

export function compareSnapshots(current: SyncData, baseline: SyncData): ComparisonResult {
  const diffs: DiffEntry[] = [];
  const collectionRenames: CollectionRename[] = [];
  const modeRenames: ModeRename[] = [];

  // Create lookup maps
  const baselineMap = new Map<string, TokenEntry>();
  const baselineModesByCollection = new Map<string, Set<string>>();
  for (const token of baseline.tokens) {
    const key = token.variableId + ':' + token.mode;
    baselineMap.set(key, token);

    // Track modes per collection
    if (!baselineModesByCollection.has(token.collection)) {
      baselineModesByCollection.set(token.collection, new Set());
    }
    baselineModesByCollection.get(token.collection)!.add(token.mode);
  }

  const currentMap = new Map<string, TokenEntry>();
  const currentModesByCollection = new Map<string, Set<string>>();
  for (const token of current.tokens) {
    const key = token.variableId + ':' + token.mode;
    currentMap.set(key, token);

    // Track modes per collection
    if (!currentModesByCollection.has(token.collection)) {
      currentModesByCollection.set(token.collection, new Set());
    }
    currentModesByCollection.get(token.collection)!.add(token.mode);
  }

  // Detect collection renames
  const baselineOnlyCollections = [...baselineModesByCollection.keys()].filter(c => !currentModesByCollection.has(c));
  const currentOnlyCollections = [...currentModesByCollection.keys()].filter(c => !baselineModesByCollection.has(c));
  const renamedCollectionMap = new Map<string, string>(); // old -> new

  // Try to match deleted collections with new collections by mode count
  const unmatchedCurrent = [...currentOnlyCollections];
  for (const oldCollection of baselineOnlyCollections) {
    const oldModes = baselineModesByCollection.get(oldCollection)!;

    const matchIndex = unmatchedCurrent.findIndex(newCollection => {
      const newModes = currentModesByCollection.get(newCollection)!;
      return newModes.size === oldModes.size;
    });

    if (matchIndex !== -1) {
      const newCollection = unmatchedCurrent[matchIndex];
      collectionRenames.push({ oldCollection, newCollection });
      renamedCollectionMap.set(oldCollection, newCollection);
      unmatchedCurrent.splice(matchIndex, 1);
    }
  }

  // Detect mode renames within shared collections
  const sharedCollections = [...baselineModesByCollection.keys()].filter(c => currentModesByCollection.has(c));
  for (const collection of sharedCollections) {
    const baselineModes = baselineModesByCollection.get(collection)!;
    const currentModes = currentModesByCollection.get(collection)!;

    const deletedModes = [...baselineModes].filter(m => !currentModes.has(m));
    const newModes = [...currentModes].filter(m => !baselineModes.has(m));

    // If same number deleted and added, it's likely a rename
    if (deletedModes.length === newModes.length && deletedModes.length > 0) {
      for (let i = 0; i < deletedModes.length; i++) {
        modeRenames.push({
          collection,
          oldMode: deletedModes[i],
          newMode: newModes[i],
        });
      }
    }
  }

  // Also detect mode renames within renamed collections
  for (const [oldCollection, newCollection] of renamedCollectionMap) {
    const oldModes = [...baselineModesByCollection.get(oldCollection)!];
    const newModes = [...currentModesByCollection.get(newCollection)!];

    for (let i = 0; i < oldModes.length && i < newModes.length; i++) {
      if (oldModes[i] !== newModes[i]) {
        modeRenames.push({
          collection: newCollection,
          oldMode: oldModes[i],
          newMode: newModes[i],
        });
      }
    }
  }

  // Find modified and added tokens
  for (const [key, currentToken] of currentMap) {
    const baselineToken = baselineMap.get(key);

    if (!baselineToken) {
      // New variable
      diffs.push({
        id: key,
        name: currentToken.path,
        type: 'added',
        newValue: currentToken.value,
        collection: currentToken.collection,
        mode: currentToken.mode,
      });
    } else {
      // Check if value OR path has changed
      const valueChanged = JSON.stringify(currentToken.value) !== JSON.stringify(baselineToken.value);
      const pathChanged = currentToken.path !== baselineToken.path;

      if (valueChanged || pathChanged) {
        diffs.push({
          id: key,
          name: currentToken.path,
          type: 'modified',
          oldValue: pathChanged ? baselineToken.path + ': ' + JSON.stringify(baselineToken.value) : baselineToken.value,
          newValue: pathChanged ? currentToken.path + ': ' + JSON.stringify(currentToken.value) : currentToken.value,
          collection: currentToken.collection,
          mode: currentToken.mode,
        });
      }
    }
  }

  // Find deleted tokens
  for (const [key, baselineToken] of baselineMap) {
    if (!currentMap.has(key)) {
      diffs.push({
        id: key,
        name: baselineToken.path,
        type: 'deleted',
        oldValue: baselineToken.value,
        collection: baselineToken.collection,
        mode: baselineToken.mode,
      });
    }
  }

  return { diffs, collectionRenames, modeRenames };
}

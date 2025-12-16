/**
 * Diff comparison logic
 * Compares current snapshot with baseline to find changes
 */

import type { SyncData, DiffEntry, TokenEntry } from './types.js';

export function compareSnapshots(current: SyncData, baseline: SyncData): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  // Create lookup maps
  const baselineMap = new Map<string, TokenEntry>();
  for (const token of baseline.tokens) {
    const key = token.variableId + ':' + token.mode;
    baselineMap.set(key, token);
  }

  const currentMap = new Map<string, TokenEntry>();
  for (const token of current.tokens) {
    const key = token.variableId + ':' + token.mode;
    currentMap.set(key, token);
  }

  // Find modified and added
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

  // Find deleted
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

  return diffs;
}

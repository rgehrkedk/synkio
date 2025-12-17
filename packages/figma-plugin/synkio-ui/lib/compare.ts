/**
 * Simple comparison for plugin UI
 * Shows what has changed since last sync - no rename detection needed
 */

import type { SyncData, TokenEntry } from './types';

export interface SimpleDiff {
  id: string;
  name: string;
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  collection: string;
  mode: string;
  oldName?: string;
  oldValue?: any;
  newValue?: any;
}

export interface SimpleCompareResult {
  diffs: SimpleDiff[];
  counts: {
    added: number;
    modified: number;
    deleted: number;
    total: number;
  };
}

/**
 * Simple compare for plugin UI
 * Shows what has changed since last sync - no rename detection
 */
export function compareSnapshots(current: SyncData, baseline: SyncData): SimpleCompareResult {
  const diffs: SimpleDiff[] = [];

  // Build baseline map
  const baselineMap = new Map<string, TokenEntry>();
  for (const token of baseline.tokens) {
    const key = `${token.variableId}:${token.mode}`;
    baselineMap.set(key, token);
  }

  // Find modified and added
  for (const token of current.tokens) {
    const key = `${token.variableId}:${token.mode}`;
    const baselineToken = baselineMap.get(key);

    if (!baselineToken) {
      diffs.push({
        id: key,
        name: token.path,
        type: 'added',
        collection: token.collection,
        mode: token.mode,
        newValue: token.value,
      });
    } else {
      const valueChanged = JSON.stringify(token.value) !== JSON.stringify(baselineToken.value);
      const pathChanged = token.path !== baselineToken.path;

      if (pathChanged && valueChanged) {
        // Both path and value changed
        diffs.push({
          id: key,
          name: token.path,
          type: 'renamed',
          collection: token.collection,
          mode: token.mode,
          oldName: baselineToken.path,
          oldValue: baselineToken.value,
          newValue: token.value,
        });
      } else if (pathChanged) {
        // Only path changed (renamed)
        diffs.push({
          id: key,
          name: token.path,
          type: 'renamed',
          collection: token.collection,
          mode: token.mode,
          oldName: baselineToken.path,
        });
      } else if (valueChanged) {
        // Only value changed
        diffs.push({
          id: key,
          name: token.path,
          type: 'modified',
          collection: token.collection,
          mode: token.mode,
          oldValue: baselineToken.value,
          newValue: token.value,
        });
      }
      baselineMap.delete(key);
    }
  }

  // Remaining in baselineMap = deleted
  for (const [key, token] of baselineMap) {
    diffs.push({
      id: key,
      name: token.path,
      type: 'deleted',
      collection: token.collection,
      mode: token.mode,
      oldValue: token.value,
    });
  }

  const counts = {
    added: diffs.filter(d => d.type === 'added').length,
    modified: diffs.filter(d => d.type === 'modified').length,
    deleted: diffs.filter(d => d.type === 'deleted').length,
    renamed: diffs.filter(d => d.type === 'renamed').length,
    total: diffs.length,
  };

  return { diffs, counts };
}

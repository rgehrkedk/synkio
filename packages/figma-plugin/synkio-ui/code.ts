/**
 * Synkio UI Plugin - Main Code
 * Handles plugin logic and communication with UI
 */

import { chunkData, reassembleChunks } from './lib/chunking';
import { compareSnapshots } from './lib/compare';
import { addHistoryEntry, parseHistory, serializeHistory } from './lib/history';
import type { SyncData, TokenEntry, SyncEvent } from './lib/types';
import type { SimpleDiff, SimpleCompareResult } from './lib/compare';

const NAMESPACE = 'synkio';

// Show UI
figma.showUI(__html__, {
  width: 400,
  height: 600,
  themeColors: true,
});

// Wait for UI to be ready
let uiReady = false;

/**
 * Get excluded collections from sharedPluginData
 */
function getExcludedCollections(): string[] {
  const excludedJson = figma.root.getSharedPluginData(NAMESPACE, 'excludedCollections');
  if (!excludedJson) return [];
  try {
    return JSON.parse(excludedJson);
  } catch (e) {
    return [];
  }
}

/**
 * Convert Figma variable value to simple value
 */
function resolveValue(value: VariableValue, type: string): any {
  if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    return { $ref: value.id };
  }

  if (type === 'COLOR' && typeof value === 'object' && 'r' in value) {
    const { r, g, b, a } = value as RGBA;
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    if (a !== undefined && a < 1) {
      return 'rgba(' + Math.round(r * 255) + ', ' + Math.round(g * 255) + ', ' + Math.round(b * 255) + ', ' + a.toFixed(2) + ')';
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  return value;
}

/**
 * Collect all current variables (excluding excluded collections)
 */
async function collectTokens(): Promise<TokenEntry[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokens: TokenEntry[] = [];

  // Load excluded collections
  const excludedCollections = getExcludedCollections();

  // Filter out excluded collections
  const activeCollections = collections.filter(col => !excludedCollections.includes(col.name));

  for (const collection of activeCollections) {
    const isSingleMode = collection.modes.length === 1;
    const modeMap = new Map(collection.modes.map(m => {
      const normalizedName = (isSingleMode && m.name === 'Mode 1') ? 'value' : m.name;
      return [m.modeId, normalizedName];
    }));

    for (const variableId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (!variable) continue;

      for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
        const modeName = modeMap.get(modeId) || modeId;

        tokens.push({
          variableId: variable.id,
          collectionId: collection.id,
          modeId: modeId,
          collection: collection.name,
          mode: modeName,
          path: variable.name.replace(/\//g, '.'),
          value: resolveValue(value, variable.resolvedType),
          type: variable.resolvedType.toLowerCase(),
        });
      }
    }
  }

  return tokens;
}

/**
 * Get baseline snapshot from storage
 */
function getBaselineSnapshot(): SyncData | null {
  const countStr = figma.root.getSharedPluginData(NAMESPACE, 'baseline_chunkCount');
  if (!countStr) return null;

  const count = parseInt(countStr, 10);
  const json = reassembleChunks(
    (i) => figma.root.getSharedPluginData(NAMESPACE, 'baseline_chunk_' + i),
    count
  );

  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * Save baseline snapshot to storage
 */
function saveBaselineSnapshot(data: SyncData): void {
  const json = JSON.stringify(data);
  const chunks = chunkData(json);

  // Clear old baseline chunks
  const oldCount = figma.root.getSharedPluginData(NAMESPACE, 'baseline_chunkCount');
  if (oldCount) {
    for (let i = 0; i < parseInt(oldCount, 10); i++) {
      figma.root.setSharedPluginData(NAMESPACE, 'baseline_chunk_' + i, '');
    }
  }

  // Save new baseline chunks (for plugin diff)
  figma.root.setSharedPluginData(NAMESPACE, 'baseline_chunkCount', String(chunks.length));
  chunks.forEach((chunk, i) => {
    figma.root.setSharedPluginData(NAMESPACE, 'baseline_chunk_' + i, chunk);
  });
  figma.root.setSharedPluginData(NAMESPACE, 'baseline_timestamp', data.timestamp);

  // ALSO save to chunk_* keys (for CLI to read)
  const oldCliCount = figma.root.getSharedPluginData(NAMESPACE, 'chunkCount');
  if (oldCliCount) {
    for (let i = 0; i < parseInt(oldCliCount, 10); i++) {
      figma.root.setSharedPluginData(NAMESPACE, 'chunk_' + i, '');
    }
  }

  figma.root.setSharedPluginData(NAMESPACE, 'chunkCount', String(chunks.length));
  chunks.forEach((chunk, i) => {
    figma.root.setSharedPluginData(NAMESPACE, 'chunk_' + i, chunk);
  });
  figma.root.setSharedPluginData(NAMESPACE, 'version', data.version);
  figma.root.setSharedPluginData(NAMESPACE, 'timestamp', data.timestamp);
  figma.root.setSharedPluginData(NAMESPACE, 'tokenCount', String(data.tokens.length));
}

/**
 * Get sync history from storage
 */
function getHistory(): SyncEvent[] {
  const json = figma.root.getSharedPluginData(NAMESPACE, 'history');
  return json ? parseHistory(json) : [];
}

/**
 * Add sync event to history
 */
function addToHistory(event: SyncEvent): void {
  const history = getHistory();
  const updated = addHistoryEntry(history, event);
  figma.root.setSharedPluginData(NAMESPACE, 'history', serializeHistory(updated));
}

/**
 * Calculate diff and send to UI
 */
async function sendDiffToUI() {
  const currentTokens = await collectTokens();
  const current: SyncData = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    tokens: currentTokens,
  };

  const baseline = getBaselineSnapshot();

  let diffs: SimpleDiff[] = [];

  if (baseline) {
    const result = compareSnapshots(current, baseline);
    diffs = result.diffs;
  } else {
    // No baseline yet - all current tokens are "new"
    diffs = currentTokens.map(token => ({
      id: token.variableId + ':' + token.mode,
      name: token.path,
      type: 'added' as const,
      newValue: token.value,
      collection: token.collection,
      mode: token.mode,
    }));
  }

  const history = getHistory();
  const excludedCount = getExcludedCollections().length;

  figma.ui.postMessage({
    type: 'update',
    diffs: diffs,
    history: history,
    hasBaseline: !!baseline,
    excludedCount: excludedCount,
  });
}

/**
 * Handle messages from UI
 */
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'ready') {
      uiReady = true;
      await sendDiffToUI();
    }

    if (msg.type === 'sync') {
      const currentTokens = await collectTokens();
      const snapshot: SyncData = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        tokens: currentTokens,
      };

      const baseline = getBaselineSnapshot();
      const result = baseline ? compareSnapshots(snapshot, baseline) : null;
      const changeCount = result
        ? result.counts.total
        : currentTokens.length;

      // Collect change paths with values for history
      let changePaths: string[] = [];
      const truncate = (v: any, max = 20): string => {
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return s.length > max ? s.slice(0, max) + '...' : s;
      };

      if (result) {
        changePaths = result.diffs.map(d => {
          if (d.type === 'renamed') {
            // Show path rename
            if (d.oldValue !== undefined && d.newValue !== undefined) {
              return '<-> ' + d.oldName + ' -> ' + d.name + ': ' + truncate(d.oldValue) + ' -> ' + truncate(d.newValue);
            }
            return '<-> ' + d.oldName + ' -> ' + d.name;
          } else if (d.type === 'modified') {
            return '~ ' + d.name + ': ' + truncate(d.oldValue) + ' -> ' + truncate(d.newValue);
          } else if (d.type === 'added') {
            return '+ ' + d.name + ': ' + truncate(d.newValue);
          } else {
            return '- ' + d.name + ': ' + truncate(d.oldValue);
          }
        });
      } else {
        // Initial sync - show token names with values
        changePaths = currentTokens.slice(0, 50).map(t => '+ ' + t.path + ': ' + truncate(t.value));
        if (currentTokens.length > 50) {
          changePaths.push('... and ' + (currentTokens.length - 50) + ' more');
        }
      }

      // Save new baseline
      saveBaselineSnapshot(snapshot);

      // Add to history with paths
      const userName = figma.currentUser ? figma.currentUser.name : 'Unknown';
      addToHistory({
        u: userName,
        t: Date.now(),
        c: changeCount,
        p: changePaths,
      });

      figma.notify('Synced ' + changeCount + ' changes');

      // Refresh UI
      await sendDiffToUI();
    }

    if (msg.type === 'get-collections') {
      // Get all collections with exclusion status
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const excluded = getExcludedCollections();

      const collectionInfos = collections.map(col => ({
        name: col.name,
        modeCount: col.modes.length,
        excluded: excluded.includes(col.name)
      }));

      figma.ui.postMessage({
        type: 'collections-update',
        collections: collectionInfos
      });
    }

    if (msg.type === 'save-excluded-collections') {
      const { excluded } = msg;
      figma.root.setSharedPluginData(NAMESPACE, 'excludedCollections', JSON.stringify(excluded));
      figma.ui.postMessage({ type: 'collections-saved' });
      figma.notify('Collection settings saved');
    }

    if (msg.type === 'close') {
      figma.closePlugin();
    }
  } catch (error) {
    figma.notify('Error: ' + String(error), { error: true });
  }
};

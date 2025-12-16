/**
 * Synkio UI Plugin - Main Code
 * Handles plugin logic and communication with UI
 */

import { chunkData, reassembleChunks } from './shared';
import { compareSnapshots } from './shared';
import { addHistoryEntry, parseHistory, serializeHistory } from './shared';
import type { SyncData, TokenEntry, DiffEntry, SyncEvent } from './shared';

console.log('=== SYNKIO UI PLUGIN STARTING ===');

const NAMESPACE = 'synkio';

// Show UI
console.log('Showing UI...');
figma.showUI(__html__, {
  width: 400,
  height: 600,
  themeColors: true,
});
console.log('UI shown');

// Wait for UI to be ready
let uiReady = false;

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
 * Collect all current variables
 */
async function collectTokens(): Promise<TokenEntry[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokens: TokenEntry[] = [];

  for (const collection of collections) {
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

  let diffs: DiffEntry[] = [];
  if (baseline) {
    diffs = compareSnapshots(current, baseline);
  } else {
    // No baseline yet - all current tokens are "new"
    diffs = currentTokens.map(token => ({
      id: token.variableId + ':' + token.mode,
      name: token.path,
      type: 'added',
      newValue: token.value,
      collection: token.collection,
      mode: token.mode,
    }));
  }

  const history = getHistory();

  console.log('Sending update to UI:', { diffsCount: diffs.length, historyCount: history.length });

  figma.ui.postMessage({
    type: 'update',
    diffs: diffs,
    history: history,
    hasBaseline: !!baseline,
  });
}

/**
 * Handle messages from UI
 */
console.log('Setting up message handler');
figma.ui.onmessage = async (msg) => {
  console.log('=== MESSAGE HANDLER CALLED ===');
  try {
    console.log('Received message:', msg);

    if (msg.type === 'ready') {
      console.log('UI is ready');
      uiReady = true;
      await sendDiffToUI();
    }

    if (msg.type === 'sync') {
      console.log('Sync request');
      const currentTokens = await collectTokens();
      const snapshot: SyncData = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        tokens: currentTokens,
      };

      const baseline = getBaselineSnapshot();
      const changeCount = baseline
        ? compareSnapshots(snapshot, baseline).length
        : currentTokens.length;

      // Save new baseline
      saveBaselineSnapshot(snapshot);

      // Add to history
      const userName = figma.currentUser ? figma.currentUser.name : 'Unknown';
      addToHistory({
        u: userName,
        t: Date.now(),
        c: changeCount,
      });

      figma.notify('Synced ' + changeCount + ' changes');

      // Refresh UI
      await sendDiffToUI();
    }

    if (msg.type === 'close') {
      figma.closePlugin();
    }
  } catch (error) {
    console.error('Plugin error:', error);
    figma.notify('Error: ' + String(error), { error: true });
  }
};

// UI will send 'ready' message when loaded
console.log('Waiting for UI to be ready...');

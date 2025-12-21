
// Inlined from @synkio/shared
/**
 * Shared types for Synkio CLI and Figma plugin
 */

export interface TokenEntry {
  variableId: string;
  collection: string;
  mode: string;
  path: string;
  value: any;
  type: string;
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

export interface SyncData {
  version: string;
  timestamp: string;
  tokens: TokenEntry[];
}

export type ChangeType = 'added' | 'deleted' | 'modified';

export interface DiffEntry {
  id: string;
  name: string;
  type: ChangeType;
  oldValue?: any;
  newValue?: any;
  collection: string;
  mode: string;
}

export interface SyncEvent {
  u: string;      // user
  t: number;      // timestamp (ms)
  c: number;      // changeCount
}

/**
 * Chunking utilities for Figma plugin data storage
 * Figma has 100KB limit per key
 */

const MAX_CHUNK_SIZE = 90000;

export function chunkData(data: string, maxSize = MAX_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < data.length; i += maxSize) {
    chunks.push(data.slice(i, i + maxSize));
  }
  return chunks;
}

export function reassembleChunks(
  getChunk: (index: number) => string,
  count: number
): string {
  let result = '';
  for (let i = 0; i < count; i++) {
    result += getChunk(i);
  }
  return result;
}

/**
 * Sync history management
 */

const MAX_HISTORY_ENTRIES = 5;

export function addHistoryEntry(
  existing: SyncEvent[],
  newEntry: SyncEvent
): SyncEvent[] {
  const updated = [newEntry].concat(existing);
  return updated.slice(0, MAX_HISTORY_ENTRIES);
}

export function parseHistory(json: string): SyncEvent[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function serializeHistory(events: SyncEvent[]): string {
  return JSON.stringify(events.slice(0, MAX_HISTORY_ENTRIES));
}

/**
 * Diff comparison logic
 * Compares current snapshot with baseline to find changes
 */

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


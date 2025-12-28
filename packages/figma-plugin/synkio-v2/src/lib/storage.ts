// =============================================================================
// Storage - Chunked SharedPluginData Storage
// Figma has a 100KB per-key limit, so we chunk large data
// =============================================================================

const NAMESPACE = 'synkio';
const MAX_CHUNK_SIZE = 90 * 1024; // 90KB, safe margin below 100KB

// Keys
export const KEYS = {
  SYNC_BASELINE: 'syncBaseline',
  CODE_BASELINE: 'codeBaseline',
  HISTORY: 'history',
  EXCLUDED_COLLECTIONS: 'excludedCollections',
  EXCLUDED_STYLE_TYPES: 'excludedStyleTypes',
  SETTINGS: 'settings',
} as const;

// =============================================================================
// Chunked Storage
// =============================================================================

export function saveChunked(key: string, data: object): void {
  const json = JSON.stringify(data);
  const chunks = chunkString(json, MAX_CHUNK_SIZE);

  // Clear old chunks first
  clearChunks(key);

  // Save chunk count
  figma.root.setSharedPluginData(NAMESPACE, `${key}_chunkCount`, String(chunks.length));

  // Save each chunk
  for (let i = 0; i < chunks.length; i++) {
    figma.root.setSharedPluginData(NAMESPACE, `${key}_chunk_${i}`, chunks[i]);
  }

  // Save timestamp
  figma.root.setSharedPluginData(NAMESPACE, `${key}_timestamp`, new Date().toISOString());
}

export function loadChunked<T>(key: string): T | null {
  const countStr = figma.root.getSharedPluginData(NAMESPACE, `${key}_chunkCount`);
  if (!countStr) return null;

  const count = parseInt(countStr, 10);
  if (isNaN(count) || count <= 0) return null;

  const chunks: string[] = [];
  for (let i = 0; i < count; i++) {
    const chunk = figma.root.getSharedPluginData(NAMESPACE, `${key}_chunk_${i}`);
    if (!chunk) return null;
    chunks.push(chunk);
  }

  try {
    return JSON.parse(chunks.join('')) as T;
  } catch (e) {
    console.error(`Failed to parse ${key}:`, e);
    return null;
  }
}

export function clearChunks(key: string): void {
  const countStr = figma.root.getSharedPluginData(NAMESPACE, `${key}_chunkCount`);
  if (countStr) {
    const count = parseInt(countStr, 10);
    for (let i = 0; i < count; i++) {
      figma.root.setSharedPluginData(NAMESPACE, `${key}_chunk_${i}`, '');
    }
  }
  figma.root.setSharedPluginData(NAMESPACE, `${key}_chunkCount`, '');
  figma.root.setSharedPluginData(NAMESPACE, `${key}_timestamp`, '');
}

// =============================================================================
// Simple Storage (for small data)
// =============================================================================

export function saveSimple(key: string, data: object): void {
  figma.root.setSharedPluginData(NAMESPACE, key, JSON.stringify(data));
}

export function loadSimple<T>(key: string): T | null {
  const json = figma.root.getSharedPluginData(NAMESPACE, key);
  if (!json) return null;

  try {
    return JSON.parse(json) as T;
  } catch (e) {
    console.error(`Failed to parse ${key}:`, e);
    return null;
  }
}

// =============================================================================
// Client Storage (persistent across sessions)
// =============================================================================

export async function saveClientStorage(key: string, data: object): Promise<void> {
  await figma.clientStorage.setAsync(key, data);
}

export async function loadClientStorage<T>(key: string): Promise<T | null> {
  return await figma.clientStorage.getAsync(key) as T | null;
}

// =============================================================================
// CLI-Compatible Storage
// The CLI expects data in 'chunk_0', 'chunk_1', etc. keys with 'chunkCount'
// This is different from our internal prefixed keys
// =============================================================================

export interface CLISyncData {
  version: string;
  timestamp: string;
  tokens: unknown[];
  styles?: unknown[];
}

export function saveForCLI(data: CLISyncData): void {
  const json = JSON.stringify(data);
  const chunks = chunkString(json, MAX_CHUNK_SIZE);

  // Clear old CLI chunks first
  const oldCount = figma.root.getSharedPluginData(NAMESPACE, 'chunkCount');
  if (oldCount) {
    const count = parseInt(oldCount, 10);
    for (let i = 0; i < count; i++) {
      figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, '');
    }
  }

  // Save chunk count and chunks
  figma.root.setSharedPluginData(NAMESPACE, 'chunkCount', String(chunks.length));
  for (let i = 0; i < chunks.length; i++) {
    figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, chunks[i]);
  }

  // Save metadata
  figma.root.setSharedPluginData(NAMESPACE, 'version', data.version);
  figma.root.setSharedPluginData(NAMESPACE, 'timestamp', data.timestamp);
  figma.root.setSharedPluginData(NAMESPACE, 'tokenCount', String(data.tokens.length));
  figma.root.setSharedPluginData(NAMESPACE, 'styleCount', String(data.styles?.length || 0));
}

export function clearCLIStorage(): void {
  const oldCount = figma.root.getSharedPluginData(NAMESPACE, 'chunkCount');
  if (oldCount) {
    const count = parseInt(oldCount, 10);
    for (let i = 0; i < count; i++) {
      figma.root.setSharedPluginData(NAMESPACE, `chunk_${i}`, '');
    }
  }
  figma.root.setSharedPluginData(NAMESPACE, 'chunkCount', '');
  figma.root.setSharedPluginData(NAMESPACE, 'version', '');
  figma.root.setSharedPluginData(NAMESPACE, 'timestamp', '');
  figma.root.setSharedPluginData(NAMESPACE, 'tokenCount', '');
  figma.root.setSharedPluginData(NAMESPACE, 'styleCount', '');
}

// =============================================================================
// Clear All Storage
// =============================================================================

export async function clearAllStorage(): Promise<void> {
  // Clear chunked data
  clearChunks(KEYS.SYNC_BASELINE);
  clearChunks(KEYS.CODE_BASELINE);

  // Clear CLI-compatible storage
  clearCLIStorage();

  // Clear simple data
  figma.root.setSharedPluginData(NAMESPACE, KEYS.HISTORY, '');
  figma.root.setSharedPluginData(NAMESPACE, KEYS.EXCLUDED_COLLECTIONS, '');
  figma.root.setSharedPluginData(NAMESPACE, KEYS.EXCLUDED_STYLE_TYPES, '');
  figma.root.setSharedPluginData(NAMESPACE, KEYS.SETTINGS, '');

  // Clear client storage (persistent settings)
  await figma.clientStorage.deleteAsync('settings');
}

// =============================================================================
// Helpers
// =============================================================================

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

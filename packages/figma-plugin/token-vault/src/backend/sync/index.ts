/**
 * Sync orchestrator - coordinates export, chunking, and node storage
 *
 * This module manages the synchronization of Figma variables to a registry node,
 * enabling the Synkio CLI to fetch token data via the Figma API without requiring
 * manual export steps from the plugin.
 *
 * @module backend/sync
 */

import { chunkData } from './chunker.js';
import {
  getOrCreateRegistryNode,
  findRegistryNode,
  clearNodeChunks,
  saveChunksToNode
} from './node-manager.js';
import { readSyncMetadata, writeSyncMetadata } from './metadata.js';
import { PLUGIN_NAMESPACE } from '../utils/constants.js';
import type { SyncInfo } from '../../types/message.types.js';

/**
 * Sync token data to registry node.
 *
 * This is the main entry point for the sync flow. It orchestrates the complete
 * process of persisting token data to a hidden registry node in the Figma file.
 *
 * **Flow:**
 * 1. Export baseline snapshot (passed as parameter to avoid circular dependency)
 * 2. Chunk the data into safe-sized pieces (under 100KB per chunk)
 * 3. Get or create registry node (_token_registry frame)
 * 4. Clear old chunks from previous sync
 * 5. Save new chunks to node's sharedPluginData
 * 6. Save metadata (chunk count, timestamp, variable count)
 *
 * The registry node is:
 * - A hidden, locked FrameNode named "_token_registry"
 * - Positioned off-canvas at (-10000, -10000)
 * - Stores data in sharedPluginData with namespace 'synkio.token-vault'
 * - Accessible via Figma API for CLI fetching
 *
 * @param exportData - Baseline snapshot data to sync (from exportBaseline)
 * @returns Promise resolving to sync result with node ID and variable count
 *
 * @throws {Error} If node creation/update fails
 * @throws {Error} If data chunking fails (data too large even after chunking)
 *
 * @example
 * ```ts
 * // Typical usage in message handler
 * const snapshot = await exportBaseline(['collection-id']);
 * const result = await syncToNode(snapshot);
 *
 * console.log(`Synced to node ${result.nodeId}`);
 * console.log(`Saved ${result.variableCount} variables`);
 *
 * // CLI can now fetch via Figma API:
 * // GET /v1/files/:fileKey/nodes/:nodeId?plugin_data=synkio.token-vault
 * ```
 */
export async function syncToNode(exportData: unknown): Promise<{
  nodeId: string;
  variableCount: number;
}> {
  console.log('[Sync] Starting sync to node...');

  // Calculate variable count from baseline
  const variableCount = exportData && typeof exportData === 'object' && 'baseline' in exportData
    ? Object.keys((exportData as any).baseline).length
    : 0;

  console.log(`[Sync] Syncing ${variableCount} variables`);

  // Chunk the data
  const chunked = chunkData(exportData);
  console.log(`[Sync] Split ${chunked.totalSize} bytes into ${chunked.chunkCount} chunks`);

  // Get or create registry node
  const node = await getOrCreateRegistryNode();
  console.log(`[Sync] Using registry node: ${node.id}`);

  // Clear old chunks
  clearNodeChunks(node, PLUGIN_NAMESPACE);

  // Save new chunks
  saveChunksToNode(node, PLUGIN_NAMESPACE, chunked.chunks);

  // Save metadata
  const metadata = {
    chunkCount: chunked.chunkCount,
    updatedAt: new Date().toISOString(),
    variableCount
  };
  writeSyncMetadata(node, metadata);

  console.log(`[Sync] Successfully synced ${chunked.totalSize} bytes in ${chunked.chunkCount} chunks to node ${node.id}`);

  return {
    nodeId: node.id,
    variableCount
  };
}

/**
 * Get information about the last sync.
 *
 * Searches all pages in the current Figma file for the registry node and reads
 * its metadata to determine when the last sync occurred and how many variables
 * were synced.
 *
 * Used by the UI to display sync status and help users understand if their
 * local token data is up-to-date.
 *
 * @returns Promise resolving to sync information
 *          - If registry node exists: { exists: true, nodeId, updatedAt, variableCount }
 *          - If no sync found: { exists: false }
 *
 * @example
 * ```ts
 * const info = await getLastSyncInfo();
 *
 * if (info.exists) {
 *   console.log(`Last synced: ${info.updatedAt}`);
 *   console.log(`Node ID: ${info.nodeId}`);
 *   console.log(`Variables: ${info.variableCount}`);
 * } else {
 *   console.log('No sync found. Sync to create registry node.');
 * }
 * ```
 */
export async function getLastSyncInfo(): Promise<SyncInfo> {
  const node = await findRegistryNode();

  if (!node) {
    return { exists: false };
  }

  return readSyncMetadata(node);
}

// Re-export types and utilities for convenience
export type { SyncInfo, SyncMetadata } from '../../types/message.types.js';
export { chunkData, unchunkData } from './chunker.js';
export {
  findRegistryNode,
  getOrCreateRegistryNode,
  createRegistryNode,
  loadChunksFromNode
} from './node-manager.js';
export { readSyncMetadata, writeSyncMetadata } from './metadata.js';

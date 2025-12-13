/**
 * Sync metadata management for registry node
 *
 * @module backend/sync/metadata
 */

import { PLUGIN_NAMESPACE, LEGACY_NAMESPACE } from '../utils/constants.js';
import type { SyncMetadata, SyncInfo } from '../../types/message.types.js';

/**
 * Read sync metadata from a registry node.
 * Supports both current and legacy namespaces for backwards compatibility.
 *
 * @param node - Registry node to read from
 * @returns Sync information
 *
 * @example
 * ```ts
 * const node = await findRegistryNode();
 * if (node) {
 *   const info = readSyncMetadata(node);
 *   console.log(`Last synced: ${info.updatedAt}`);
 * }
 * ```
 */
export function readSyncMetadata(node: FrameNode): SyncInfo {
  // Try current namespace first
  let updatedAt = node.getSharedPluginData(PLUGIN_NAMESPACE, 'updatedAt');
  let variableCount = node.getSharedPluginData(PLUGIN_NAMESPACE, 'variableCount');

  // Fallback to legacy namespace for backwards compatibility
  if (!updatedAt) {
    updatedAt = node.getSharedPluginData(LEGACY_NAMESPACE, 'updatedAt');
    variableCount = node.getSharedPluginData(LEGACY_NAMESPACE, 'variableCount');
  }

  if (!updatedAt) {
    return { exists: false };
  }

  return {
    exists: true,
    nodeId: node.id,
    updatedAt,
    variableCount: variableCount ? parseInt(variableCount, 10) : undefined
  };
}

/**
 * Write sync metadata to a registry node.
 *
 * @param node - Registry node to write to
 * @param metadata - Metadata to save
 *
 * @example
 * ```ts
 * const node = await getOrCreateRegistryNode();
 * writeSyncMetadata(node, {
 *   chunkCount: 3,
 *   updatedAt: new Date().toISOString(),
 *   variableCount: 150
 * });
 * ```
 */
export function writeSyncMetadata(node: FrameNode, metadata: SyncMetadata): void {
  node.setSharedPluginData(PLUGIN_NAMESPACE, 'chunkCount', String(metadata.chunkCount));
  node.setSharedPluginData(PLUGIN_NAMESPACE, 'updatedAt', metadata.updatedAt);
  node.setSharedPluginData(PLUGIN_NAMESPACE, 'variableCount', String(metadata.variableCount));
}

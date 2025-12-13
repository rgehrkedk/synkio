/**
 * Message types for plugin <-> UI communication
 */

import type { CollectionConfig, CollectionSummary } from './collection.types.js';
import type { BaselineSnapshot } from './token.types.js';

/**
 * Sync metadata stored in node
 */
export interface SyncMetadata {
  chunkCount: number;
  updatedAt: string;
  variableCount: number;
}

/**
 * Sync information display
 */
export interface SyncInfo {
  exists: boolean;
  nodeId?: string;
  updatedAt?: string;
  variableCount?: number;
}

/**
 * Messages sent from UI to Plugin backend
 */
export type UIMessage =
  | { type: 'get-collections' }
  | { type: 'get-last-sync' }
  | { type: 'import-tokens'; data: { collections: CollectionConfig[] } }
  | { type: 'export-baseline'; collectionIds: string[] }
  | { type: 'sync-to-node'; collectionIds: string[] }
  | { type: 'cancel' };

/**
 * Messages sent from Plugin backend to UI
 */
export type PluginMessage =
  | { type: 'collections-loaded'; collections: CollectionSummary[] }
  | { type: 'last-sync-loaded'; exists: boolean; nodeId?: string; updatedAt?: string; variableCount?: number }
  | { type: 'import-complete'; message: string }
  | { type: 'import-error'; message: string }
  | { type: 'export-complete'; data: BaselineSnapshot }
  | { type: 'export-error'; message: string }
  | { type: 'sync-complete'; nodeId: string; variableCount: number }
  | { type: 'sync-error'; message: string };

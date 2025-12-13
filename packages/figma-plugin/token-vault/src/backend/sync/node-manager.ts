/**
 * Registry node management for token synchronization
 *
 * @module backend/sync/node-manager
 */

import { REGISTRY_NODE_NAME } from '../utils/constants.js';

/**
 * Find the registry node across all pages.
 * The registry node is a hidden, locked frame that stores token data.
 *
 * @returns Registry node if found, null otherwise
 *
 * @example
 * ```ts
 * const node = await findRegistryNode();
 * if (node) {
 *   console.log(`Found registry node: ${node.id}`);
 * }
 * ```
 */
export async function findRegistryNode(): Promise<FrameNode | null> {
  // Search all pages for the registry node
  for (const page of figma.root.children) {
    // Load page before accessing children
    await page.loadAsync();

    for (const node of page.children) {
      if (node.type === 'FRAME' && node.name === REGISTRY_NODE_NAME) {
        return node;
      }
    }
  }

  return null;
}

/**
 * Create a new registry node on the current page.
 * The node is created off-canvas, hidden, and locked to prevent accidental deletion.
 *
 * @returns Newly created registry node
 *
 * @example
 * ```ts
 * const node = await createRegistryNode();
 * console.log(`Created registry node: ${node.id}`);
 * ```
 */
export async function createRegistryNode(): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = REGISTRY_NODE_NAME;
  frame.resize(100, 100);

  // Position off-canvas to keep it out of the way
  frame.x = -1000;
  frame.y = -1000;

  // Hide and lock to prevent accidental interaction
  frame.visible = false;
  frame.locked = true;

  return frame;
}

/**
 * Get the registry node, creating it if it doesn't exist.
 * This is the primary entry point for accessing the registry node.
 *
 * @returns Registry node (existing or newly created)
 *
 * @example
 * ```ts
 * const node = await getOrCreateRegistryNode();
 * // Node is guaranteed to exist here
 * ```
 */
export async function getOrCreateRegistryNode(): Promise<FrameNode> {
  const existing = await findRegistryNode();

  if (existing) {
    return existing;
  }

  return await createRegistryNode();
}

/**
 * Clear all chunk data from the registry node.
 * Removes up to 20 chunks to ensure clean slate for new data.
 *
 * @param node - Registry node to clear
 * @param namespace - Plugin namespace to clear data from
 *
 * @example
 * ```ts
 * const node = await getOrCreateRegistryNode();
 * clearNodeChunks(node, 'token_vault');
 * ```
 */
export function clearNodeChunks(node: FrameNode, namespace: string): void {
  // Clear up to 20 chunks (should be more than enough)
  for (let i = 0; i < 20; i++) {
    node.setSharedPluginData(namespace, `registry_${i}`, '');
  }
}

/**
 * Save chunk data to the registry node.
 *
 * @param node - Registry node to save to
 * @param namespace - Plugin namespace
 * @param chunks - Array of chunk strings to save
 *
 * @example
 * ```ts
 * const node = await getOrCreateRegistryNode();
 * saveChunksToNode(node, 'token_vault', chunked.chunks);
 * ```
 */
export function saveChunksToNode(
  node: FrameNode,
  namespace: string,
  chunks: string[]
): void {
  for (let i = 0; i < chunks.length; i++) {
    node.setSharedPluginData(namespace, `registry_${i}`, chunks[i]);
  }
}

/**
 * Load chunk data from the registry node.
 *
 * @param node - Registry node to load from
 * @param namespace - Plugin namespace
 * @param chunkCount - Number of chunks to load
 * @returns Array of chunk strings
 *
 * @example
 * ```ts
 * const node = await findRegistryNode();
 * if (node) {
 *   const chunks = loadChunksFromNode(node, 'token_vault', 3);
 * }
 * ```
 */
export function loadChunksFromNode(
  node: FrameNode,
  namespace: string,
  chunkCount: number
): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const chunk = node.getSharedPluginData(namespace, `registry_${i}`);
    chunks.push(chunk);
  }

  return chunks;
}

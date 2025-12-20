/**
 * Collection Discovery Utility
 *
 * Discovers collections and their modes from normalized token data.
 * Used during first sync to auto-populate tokens.collections in config.
 */

import { isPhantomMode } from '../../utils/figma.js';
import type { RawTokens } from '../tokens.js';

/**
 * Information about a discovered collection
 */
export interface CollectionInfo {
  name: string;
  modes: string[];
  splitBy: 'mode' | 'none';
}

/**
 * Extract unique collections and their modes from normalized tokens.
 * Used during first sync to auto-populate tokens.collections.
 * Filters out phantom modes (Figma internal IDs like "21598:4").
 *
 * @param normalizedTokens - The normalized token data from Figma
 * @returns Array of collection info with name, modes, and suggested splitBy strategy
 *
 * @example
 * const collections = discoverCollectionsFromTokens(tokens);
 * // [
 * //   { name: 'theme', modes: ['light', 'dark'], splitBy: 'mode' },
 * //   { name: 'globals', modes: ['default'], splitBy: 'none' }
 * // ]
 */
export function discoverCollectionsFromTokens(normalizedTokens: RawTokens): CollectionInfo[] {
  // Build map of collections to their unique modes
  const collectionModes = new Map<string, Set<string>>();

  for (const entry of Object.values(normalizedTokens)) {
    const collection = entry.collection || entry.path.split('.')[0];
    const mode = entry.mode || 'default';

    // Skip phantom modes (Figma internal IDs)
    if (isPhantomMode(mode)) continue;

    if (!collectionModes.has(collection)) {
      collectionModes.set(collection, new Set());
    }
    collectionModes.get(collection)!.add(mode);
  }

  // Convert to array with splitBy determination
  const result: CollectionInfo[] = [];
  for (const [name, modesSet] of collectionModes) {
    const modes = Array.from(modesSet).sort((a, b) => a.localeCompare(b));
    result.push({
      name,
      modes,
      splitBy: modes.length > 1 ? 'mode' : 'none', // 'none' if 1 mode, 'mode' if 2+ modes
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

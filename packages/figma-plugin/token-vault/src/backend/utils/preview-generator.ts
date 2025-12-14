/**
 * Preview generator utility
 *
 * Generates a preview of the Figma structure that will be created
 * from imported tokens without actually creating variables.
 *
 * This provides users with a live preview of collections, modes, and
 * variable counts before committing to the import.
 */

import type { LevelConfiguration } from '../../types/level-config.types.js';
import type { PreviewStructure, PreviewCollection, PreviewMode } from '../../types/message.types.js';
import { extractTokensByLevels } from './token-extractor.js';

/**
 * Generate preview structure from JSON data and level configuration
 *
 * This is a READ-ONLY operation that simulates what will be created
 * in Figma without actually creating any variables or collections.
 *
 * @param fileName - Name of the file being imported (used for default collection name)
 * @param data - JSON data to preview
 * @param levels - Level configuration defining collection/mode/token-path mapping
 * @returns Preview structure showing collections, modes, and variable samples
 *
 * @example
 * ```ts
 * const preview = generatePreview('semantic.json', jsonData, [
 *   { depth: 1, role: 'collection', exampleKeys: ['semantic'] },
 *   { depth: 2, role: 'mode', exampleKeys: ['light', 'dark'] },
 *   { depth: 3, role: 'token-path', exampleKeys: ['bg', 'text'] }
 * ]);
 *
 * // Preview will show:
 * // - Collection: "semantic"
 * //   - Mode: "light" (8 variables)
 * //   - Mode: "dark" (8 variables)
 * ```
 */
export function generatePreview(
  fileName: string,
  data: unknown,
  levels: LevelConfiguration[]
): PreviewStructure {
  // Determine if user defined a collection level
  const hasCollectionLevel = levels.some(level => level.role === 'collection');
  const fileNameWithoutExt = fileName.replace(/\.json$/i, '');

  // Extract tokens using the token-extractor from Group 6
  const extracted = extractTokensByLevels(data, levels);

  const collections: PreviewCollection[] = [];
  let totalModes = 0;
  let totalVariables = 0;

  // Build preview from extracted data
  for (const [collectionName, collectionData] of extracted.collections) {
    const modes: PreviewMode[] = [];

    for (const [modeName, modeData] of collectionData.modes) {
      const variableCount = modeData.tokens.size;
      totalVariables += variableCount;

      // Get sample variables (first 3-5)
      const sampleVariables = Array.from(modeData.tokens.keys()).slice(0, 5);

      modes.push({
        name: modeName,
        variableCount,
        sampleVariables
      });
    }

    totalModes += modes.length;

    // If no collection level was defined, use filename instead of "Tokens" default
    const finalCollectionName = !hasCollectionLevel && collectionName === 'Tokens'
      ? fileNameWithoutExt
      : collectionName;

    collections.push({
      name: finalCollectionName,
      modes
    });
  }

  // Handle edge case: no collections found (flat structure with no collection level)
  if (collections.length === 0 && extracted.tokens.length > 0) {
    // All tokens go into one default mode
    const sampleVariables = extracted.tokens
      .slice(0, 5)
      .map(t => t.path || t.value);

    collections.push({
      name: fileNameWithoutExt,
      modes: [{
        name: 'Mode 1',
        variableCount: extracted.tokens.length,
        sampleVariables
      }]
    });

    totalModes = 1;
    totalVariables = extracted.tokens.length;
  }

  return {
    collections,
    totalCollections: collections.length,
    totalModes,
    totalVariables
  };
}

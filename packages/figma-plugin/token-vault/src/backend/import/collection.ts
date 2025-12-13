/**
 * Collection management for token import
 */

import type { CollectionConfig } from '../../types/index.js';

/**
 * Find existing collection by name or create a new one
 */
export async function findOrCreateCollection(name: string): Promise<VariableCollection> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find(c => c.name === name);

  if (!collection) {
    collection = figma.variables.createVariableCollection(name);
  }

  return collection;
}

/**
 * Setup modes for a collection based on configuration
 * @param collection - The variable collection
 * @param config - Collection configuration
 * @returns Map of file names to mode IDs
 */
export function setupModes(
  collection: VariableCollection,
  config: CollectionConfig
): Map<string, string> {
  const fileModeMap = new Map<string, string>();

  if (config.isModeCollection) {
    // Each file is a separate mode
    const defaultMode = collection.modes[0];

    for (let i = 0; i < config.files.length; i++) {
      const file = config.files[i];
      let modeId: string;

      if (i === 0) {
        // Rename default mode to first file name
        modeId = defaultMode.modeId;
        collection.renameMode(modeId, file.name);
      } else {
        // Add new mode for each additional file
        modeId = collection.addMode(file.name);
      }

      fileModeMap.set(file.name, modeId);
    }
  } else {
    // Single mode, all files merged
    const defaultMode = collection.modes[0];
    // Map all files to the default mode
    for (const file of config.files) {
      fileModeMap.set(file.name, defaultMode.modeId);
    }
  }

  return fileModeMap;
}

/**
 * Merge token files into a single token object
 */
export function mergeTokenFiles(files: Array<{ name: string; content: any }>): any {
  const merged = {};
  for (const file of files) {
    Object.assign(merged, file.content);
  }
  return merged;
}

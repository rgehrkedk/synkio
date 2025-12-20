/**
 * Filename Generator
 *
 * Handles the generation of output filenames based on split strategy and configuration.
 */

import type { SplitBy } from '../config.js';
import type { CollectionSplitOptions } from '../tokens.js';

/**
 * File data used for filename generation
 */
export interface FileData {
  collection: string;
  group?: string;
}

/**
 * Generates the output filename for a token file based on configuration.
 *
 * @param key - The file key (e.g., 'theme.light', 'globals.colors', 'theme')
 * @param fileData - The file data containing collection and optionally group
 * @param collectionConfig - The collection-specific configuration
 * @param splitBy - The effective split strategy
 * @param defaultSplitBy - The default split strategy
 * @returns The generated filename (e.g., 'theme.light.json', 'colors.json')
 *
 * @example
 * // Mode splitting with custom file base
 * generateFilename(
 *   'theme.light',
 *   { collection: 'theme' },
 *   { file: 'semantic', splitBy: 'mode' },
 *   'mode',
 *   'mode'
 * ) // -> 'semantic.light.json'
 *
 * // Group splitting with names mapping
 * generateFilename(
 *   'globals.colors',
 *   { collection: 'globals', group: 'colors' },
 *   { splitBy: 'group', names: { colors: 'palette' } },
 *   'group',
 *   'mode'
 * ) // -> 'palette.json'
 */
export function generateFilename(
  key: string,
  fileData: FileData,
  collectionConfig: CollectionSplitOptions[string] | undefined,
  splitBy: SplitBy,
  defaultSplitBy: SplitBy
): string {
  const namesMapping = collectionConfig?.names || {};
  const keyParts = key.split('.');

  // Group splitting: use mapped group name as filename
  if (splitBy === 'group' && fileData.group) {
    const mappedGroup = namesMapping[fileData.group] || fileData.group;
    return `${mappedGroup}.json`;
  }

  // Mode splitting: apply names mapping to mode
  if (splitBy === 'mode' && keyParts.length > 1) {
    const mode = keyParts.slice(1).join('.');
    const mappedMode = namesMapping[mode] || mode;
    const fileBase = collectionConfig?.file || keyParts[0];
    return `${fileBase}.${mappedMode}.json`;
  }

  // Custom filename specified (splitBy: none or other cases)
  if (collectionConfig?.file) {
    if (keyParts.length > 1) {
      const suffix = keyParts.slice(1).join('.');
      const mappedSuffix = namesMapping[suffix] || suffix;
      return `${collectionConfig.file}.${mappedSuffix}.json`;
    }
    return `${collectionConfig.file}.json`;
  }

  // Default: use key as-is
  return `${key}.json`;
}

/**
 * Extracts the mode from a file key for mode-based splitting.
 *
 * @param key - The file key (e.g., 'theme.light')
 * @returns The mode portion of the key
 *
 * @example
 * extractModeFromKey('theme.light') // -> 'light'
 * extractModeFromKey('colors.dark.high-contrast') // -> 'dark.high-contrast'
 * extractModeFromKey('theme') // -> ''
 */
export function extractModeFromKey(key: string): string {
  const dotIndex = key.indexOf('.');
  if (dotIndex === -1) return '';
  return key.substring(dotIndex + 1);
}

/**
 * Extracts the collection from a file key.
 *
 * @param key - The file key (e.g., 'theme.light')
 * @returns The collection portion of the key
 *
 * @example
 * extractCollectionFromKey('theme.light') // -> 'theme'
 * extractCollectionFromKey('globals.colors') // -> 'globals'
 */
export function extractCollectionFromKey(key: string): string {
  const dotIndex = key.indexOf('.');
  if (dotIndex === -1) return key;
  return key.substring(0, dotIndex);
}

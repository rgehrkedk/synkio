/**
 * File merger for multi-file imports
 *
 * Merges multiple files into a single collection structure with modes.
 * Supports two strategies:
 * - importAsMode: true -> Each file becomes a mode
 * - importAsMode: false -> Merge all files into single mode
 */

import type { LevelConfiguration } from '../../types/level-config.types.js';
import type { FileData } from './multi-file-validator.js';
import { extractModeNameFromFilename } from './mode-extractor.js';

export interface MergedCollection {
  collectionName: string;
  modes: ModeData[];
}

export interface ModeData {
  modeName: string;
  data: any;
}

/**
 * Merge files as modes in a single collection
 *
 * Takes multiple files and merges them into a single collection structure
 * where each file represents a mode.
 *
 * @param files - Array of files to merge
 * @param levels - Level configuration for token structure
 * @param collectionName - Name of the collection to create
 * @param customModeNames - Optional custom mode names (fileName -> modeName)
 * @returns Merged collection with modes
 */
export function mergeFilesAsMode(
  files: FileData[],
  levels: LevelConfiguration[],
  collectionName: string,
  customModeNames?: Record<string, string>
): MergedCollection {
  const modes: ModeData[] = [];

  for (const file of files) {
    // Use custom mode name if provided, otherwise extract from filename
    const modeName = customModeNames?.[file.fileName] || extractModeNameFromFilename(file.fileName);
    modes.push({
      modeName,
      data: file.data,
    });
  }

  return {
    collectionName,
    modes,
  };
}

/**
 * Merge files into a single mode
 *
 * Takes multiple files and merges their contents into a single mode.
 * All tokens from all files are combined.
 *
 * @param files - Array of files to merge
 * @param levels - Level configuration for token structure
 * @param collectionName - Name of the collection to create
 * @param modeName - Name of the mode (defaults to "Mode 1")
 * @returns Merged collection with single mode
 */
export function mergeFilesAsSingleMode(
  files: FileData[],
  levels: LevelConfiguration[],
  collectionName: string,
  modeName: string = 'Mode 1'
): MergedCollection {
  // Merge all file data into a single object
  const mergedData = files.reduce((acc, file) => {
    return deepMerge(acc, file.data);
  }, {});

  return {
    collectionName,
    modes: [
      {
        modeName,
        data: mergedData,
      },
    ],
  };
}

/**
 * Deep merge two objects
 *
 * Recursively merges two objects, with the second object's values
 * taking precedence in case of conflicts.
 *
 * @param target - Target object
 * @param source - Source object to merge
 * @returns Merged object
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        !isTokenValue(source[key])
      ) {
        // Recursively merge nested objects
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        // Overwrite with source value
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Check if a value is a token value (leaf node)
 *
 * @param value - Value to check
 * @returns True if this is a token value
 */
function isTokenValue(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  // Primitive values are tokens
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  // DTCG format: object with $value
  if (typeof value === 'object' && '$value' in value) {
    return true;
  }

  // Legacy format: object with value
  if (typeof value === 'object' && 'value' in value && !('$value' in value)) {
    return true;
  }

  return false;
}

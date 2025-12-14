/**
 * Multi-file import handler
 *
 * Coordinates the import of multiple files with various grouping strategies.
 * Delegates to level-mapper for actual Figma API calls.
 */

import type { FileGroup } from '../../types/level-config.types.js';
import type { LevelConfiguration } from '../../types/level-config.types.js';
import type { FileData } from '../utils/multi-file-validator.js';
import { mergeFilesAsMode, mergeFilesAsSingleMode, type ModeData } from '../utils/file-merger.js';
import { buildFigmaCollection } from './collection-builder.js';
import type { ImportResult } from './baseline-importer.js';

/**
 * Handle multi-file import
 *
 * Processes multiple file groups, each potentially with different import strategies.
 * For groups with importAsMode=true, files are merged as modes in a single collection.
 * For groups with importAsMode=false, files are merged into a single mode.
 *
 * @param groups - File groups with their configurations
 * @param levelsByGroup - Map of group ID to level configurations
 * @param filesData - Map of filename to file data
 * @returns Aggregated import result
 */
export async function handleMultiFileImport(
  groups: FileGroup[],
  levelsByGroup: Map<string, LevelConfiguration[]>,
  filesData: Map<string, any>
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalCollections = 0;
  let totalModes = 0;
  let totalVariables = 0;

  for (const group of groups) {
    try {
      // Get level configuration for this group
      const levels = levelsByGroup.get(group.id);
      if (!levels) {
        errors.push(`No level configuration found for group "${group.collectionName}"`);
        continue;
      }

      // Prepare file data for this group
      const groupFiles: FileData[] = group.fileNames
        .map((fileName) => {
          const data = filesData.get(fileName);
          if (!data) {
            errors.push(`File data not found: ${fileName}`);
            return null;
          }
          return { fileName, data };
        })
        .filter((f): f is FileData => f !== null);

      if (groupFiles.length === 0) {
        errors.push(`No valid files in group "${group.collectionName}"`);
        continue;
      }

      // Note: We DON'T validate structure compatibility for per-file mode
      // When files represent different modes, they can have completely different tokens
      // Each mode in a collection can have its own set of variables

      // Merge files according to strategy
      const result = await importFileGroup(group, groupFiles, levels);

      totalCollections += result.collectionsCreated;
      totalModes += result.modesCreated;
      totalVariables += result.variablesCreated;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    } catch (error) {
      errors.push(`Failed to import group "${group.collectionName}": ${(error as Error).message}`);
    }
  }

  return {
    success: errors.length === 0,
    collectionsCreated: totalCollections,
    modesCreated: totalModes,
    variablesCreated: totalVariables,
    errors,
    warnings,
  };
}

/**
 * Import a single file group
 *
 * Delegates to the appropriate merger based on the group's mode strategy,
 * then passes the merged structure to the level mapper for Figma import.
 *
 * @param group - File group configuration
 * @param files - File data for this group
 * @param levels - Level configuration
 * @returns Import result for this group
 */
async function importFileGroup(
  group: FileGroup,
  files: FileData[],
  levels: LevelConfiguration[]
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    let mergedCollection;

    // Check if this is a single file with modes from first level
    const isSingleFileWithModes = files.length === 1 && 
      levels.length > 0 && 
      levels[0].role === 'mode';

    if (isSingleFileWithModes) {
      // Single file where first level keys are modes
      // Split the file data by first level keys
      const fileData = files[0].data;
      const modes: ModeData[] = [];

      if (typeof fileData === 'object' && fileData !== null) {
        for (const [key, value] of Object.entries(fileData)) {
          // Skip metadata keys
          if (key.startsWith('$')) continue;
          
          modes.push({
            modeName: key,
            data: value
          });
        }
      }

      mergedCollection = {
        collectionName: group.collectionName,
        modes
      };
    } else if (group.modeStrategy === 'per-file') {
      // Each file becomes a mode - pass custom mode names if available
      mergedCollection = mergeFilesAsMode(files, levels, group.collectionName, group.modeNames);
    } else {
      // Merge all files into one mode
      mergedCollection = mergeFilesAsSingleMode(files, levels, group.collectionName);
    }

    console.log('[MultiFileHandler] Processing collection:', group.collectionName, 'with', mergedCollection.modes.length, 'modes');
    console.log('[MultiFileHandler] Mode names:', mergedCollection.modes.map(m => m.modeName));

    // Convert merged collection to ModeTokens format for buildFigmaCollection
    // For each mode, we extract all tokens by flattening the data structure
    const modeTokensList: { name: string; tokens: Map<string, any> }[] = [];

    for (const modeData of mergedCollection.modes) {
      // Flatten all tokens from this mode's data
      const tokens = flattenTokens(modeData.data);

      console.log('[MultiFileHandler] Mode', modeData.modeName, 'has', tokens.size, 'tokens');

      modeTokensList.push({
        name: modeData.modeName,
        tokens
      });
    }

    // Actually create the Figma collection
    const result = await buildFigmaCollection(group.collectionName, modeTokensList);

    return {
      success: result.errors.length === 0,
      collectionsCreated: result.collectionsCreated,
      modesCreated: result.modesCreated,
      variablesCreated: result.variablesCreated,
      errors: [...errors, ...result.errors],
      warnings: [...warnings, ...result.warnings],
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Failed to import file group: ${(error as Error).message}`],
      warnings,
    };
  }
}

/**
 * Estimate variable count from merged collection
 *
 * Counts unique variable names across all modes.
 *
 * @param collection - Merged collection structure
 * @returns Estimated variable count
 */
function estimateVariableCount(collection: any): number {
  // For estimation, count tokens in first mode
  if (collection.modes && collection.modes.length > 0) {
    return countTokens(collection.modes[0].data);
  }
  return 0;
}

/**
 * Count tokens in a data structure
 *
 * @param obj - Object to count tokens in
 * @returns Number of tokens
 */
function countTokens(obj: any): number {
  if (!obj || typeof obj !== 'object') {
    return 0;
  }

  if (isTokenValue(obj)) {
    return 1;
  }

  let count = 0;
  for (const value of Object.values(obj)) {
    if (isTokenValue(value)) {
      count++;
    } else if (value && typeof value === 'object') {
      count += countTokens(value);
    }
  }

  return count;
}

/**
 * Check if a value is a token value
 *
 * @param value - Value to check
 * @returns True if token value
 */
function isTokenValue(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'object' && ('$value' in value || 'value' in value)) {
    return true;
  }

  return false;
}

/**
 * Flatten all tokens from a nested object into a Map
 *
 * Recursively walks the object and extracts all token values,
 * building a path from the nested keys.
 *
 * @param obj - Object to flatten
 * @param pathSegments - Current path segments (for recursion)
 * @returns Map of token paths to token values
 */
function flattenTokens(obj: any, pathSegments: string[] = []): Map<string, any> {
  const tokens = new Map<string, any>();

  if (obj === null || obj === undefined) {
    return tokens;
  }

  // If it's a primitive, treat the current path as a token
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    if (pathSegments.length > 0) {
      tokens.set(pathSegments.join('/'), obj);
    }
    return tokens;
  }

  // Check if this object is a token (has $value or value property)
  if ('$value' in obj || 'value' in obj) {
    if (pathSegments.length > 0) {
      tokens.set(pathSegments.join('/'), obj);
    }
    return tokens;
  }

  // Recurse into nested objects
  for (const [key, value] of Object.entries(obj)) {
    // Skip $-prefixed metadata keys like $type, $description
    if (key.startsWith('$')) {
      continue;
    }

    const childTokens = flattenTokens(value, [...pathSegments, key]);
    for (const [path, val] of childTokens) {
      tokens.set(path, val);
    }
  }

  return tokens;
}

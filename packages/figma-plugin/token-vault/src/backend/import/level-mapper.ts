/**
 * Level-based importer module
 *
 * Imports tokens using manual level configuration (no auto-detection).
 * Maps JSON levels to Figma structure based on user-defined level roles.
 */

import type { ManualImportConfig } from '../../types/message.types.js';
import type { LevelConfiguration } from '../../types/level-config.types.js';
import { validateLevelConfiguration } from '../../types/level-config.types.js';
import { extractTokensByLevels } from '../utils/token-extractor.js';
import { buildFigmaCollection } from './collection-builder.js';

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  collectionsCreated: number;
  modesCreated: number;
  variablesCreated: number;
  errors: string[];
  warnings: string[];
}

/**
 * Import tokens with manual level configuration
 *
 * Main entry point for flexible import. Handles both single-file and multi-file imports.
 * Creates Figma collections, modes, and variables based on level mapping.
 *
 * @param config - Manual import configuration with level mapping
 * @returns Import result with counts and any errors/warnings
 */
export async function importWithLevelMapping(
  config: ManualImportConfig
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalCollections = 0;
  let totalModes = 0;
  let totalVariables = 0;

  try {
    // Handle single-file import
    if (config.singleFile) {
      const result = await importSingleFile(
        config.singleFile.data,
        config.singleFile.levels,
        config.singleFile.fileName
      );

      return result;
    }

    // Handle multi-file import
    if (config.multiFile) {
      const result = await importMultiFile(config.multiFile);
      return result;
    }

    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: ['No import configuration provided'],
      warnings: []
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Import failed: ${(error as Error).message}`],
      warnings
    };
  }
}

/**
 * Import from a single JSON file
 */
async function importSingleFile(
  data: unknown,
  levels: LevelConfiguration[],
  fileName: string
): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate level configuration
  const validation = validateLevelConfiguration(levels);
  if (!validation.valid) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [validation.error || 'Invalid level configuration'],
      warnings: validation.warnings || []
    };
  }

  if (validation.warnings) {
    warnings.push(...validation.warnings);
  }

  try {
    // Extract tokens based on level configuration
    const extracted = extractTokensByLevels(data, levels);

    let totalCollections = 0;
    let totalModes = 0;
    let totalVariables = 0;

    // Create Figma collections
    for (const [collectionName, collectionData] of extracted.collections) {
      const modes = Array.from(collectionData.modes.values());

      const result = await buildFigmaCollection(collectionName, modes);

      totalCollections += result.collectionsCreated;
      totalModes += result.modesCreated;
      totalVariables += result.variablesCreated;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    return {
      success: errors.length === 0,
      collectionsCreated: totalCollections,
      modesCreated: totalModes,
      variablesCreated: totalVariables,
      errors,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Failed to import from ${fileName}: ${(error as Error).message}`],
      warnings
    };
  }
}

/**
 * Import from multiple files (not yet fully implemented - placeholder)
 */
async function importMultiFile(config: any): Promise<ImportResult> {
  // This will be implemented in Task Group 7: Multi-file Handler
  // For now, return an error
  return {
    success: false,
    collectionsCreated: 0,
    modesCreated: 0,
    variablesCreated: 0,
    errors: ['Multi-file import not yet implemented - will be completed in Task Group 7'],
    warnings: []
  };
}

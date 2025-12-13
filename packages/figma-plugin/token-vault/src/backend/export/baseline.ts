/**
 * Export baseline builder module
 * Builds baseline snapshot structure from Figma variables
 */

import type { BaselineSnapshot, BaselineEntry, ExportToken } from '../../types/index.js';
import { mapFigmaTypeToTokenType } from '../utils/type-mappers.js';
import { resolveVariableValue, setNestedValue } from './transformer.js';

/**
 * Build a complete baseline snapshot from Figma variables
 * Generates both nested token structure and flat baseline lookup
 *
 * @param filterCollectionIds - Optional array of collection IDs to export (null = all)
 * @returns Complete baseline snapshot with metadata
 */
export async function buildBaselineSnapshot(
  filterCollectionIds: string[] | null = null
): Promise<BaselineSnapshot> {
  let collections = await figma.variables.getLocalVariableCollectionsAsync();
  const allVariables = await figma.variables.getLocalVariablesAsync();

  // Filter collections if specific IDs provided
  if (filterCollectionIds && filterCollectionIds.length > 0) {
    collections = collections.filter(c => filterCollectionIds.includes(c.id));
  }

  // Initialize output structure with metadata
  const output: BaselineSnapshot = {
    $metadata: {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      pluginVersion: '1.0.0',
      fileKey: figma.fileKey || '',
      fileName: figma.root.name
    },
    baseline: {}
  };

  // Process each collection
  for (const collection of collections) {
    const collectionName = collection.name;
    const variables = allVariables.filter(v => v.variableCollectionId === collection.id);

    // Initialize collection in output
    if (!output[collectionName]) {
      output[collectionName] = {};
    }

    // Process each mode
    for (const mode of collection.modes) {
      // Use "value" as default mode name if Figma's default "Mode 1" is detected
      const modeName = mode.name === 'Mode 1' ? 'value' : mode.name;

      // Initialize mode in collection
      if (!output[collectionName][modeName]) {
        output[collectionName][modeName] = {};
      }

      // Process each variable in this mode
      for (const variable of variables) {
        const pathParts = variable.name.split('/').map(p => p.trim());
        const value = await resolveVariableValue(variable, mode.modeId);
        const tokenType = mapFigmaTypeToTokenType(variable.resolvedType);

        // Create prefixed variable ID: collectionName:modeName:VariableID
        const prefixedId = `${collectionName}:${modeName}:${variable.id}`;

        // Create token for nested structure
        const token: ExportToken = {
          $type: tokenType,
          $value: value,
          $variableId: prefixedId
        };

        // Add to nested structure
        setNestedValue(output[collectionName][modeName], pathParts, token);

        // Add to baseline (flat structure)
        const fullPath = `${collectionName}.${modeName}.${pathParts.join('.')}`;
        output.baseline[prefixedId] = {
          path: fullPath,
          value: value,
          type: tokenType,
          collection: collectionName,
          mode: modeName
        };
      }
    }
  }

  return output;
}

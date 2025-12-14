/**
 * Export baseline builder module
 * Builds baseline snapshot structure from Figma variables
 */

import type { BaselineSnapshot, BaselineEntry, ExportToken, CollectionMetadata } from '../../types/index.js';
import { mapFigmaTypeToTokenType } from '../utils/type-mappers.js';
import { resolveVariableValue, setNestedValue } from './transformer.js';
import { findRegistryNode, loadChunksFromNode, unchunkData } from '../sync/index.js';
import { PLUGIN_NAMESPACE } from '../utils/constants.js';

/**
 * Get the current baseline version from the stored registry node.
 * Returns "1.0.0" if no previous version exists.
 */
async function getCurrentStoredVersion(): Promise<string> {
  try {
    const node = await findRegistryNode();
    if (!node) {
      return '1.0.0';
    }

    const chunkCountStr = node.getSharedPluginData(PLUGIN_NAMESPACE, 'chunkCount');
    if (!chunkCountStr) {
      return '1.0.0';
    }

    const chunkCount = parseInt(chunkCountStr, 10);
    const chunks = loadChunksFromNode(node, PLUGIN_NAMESPACE, chunkCount);
    const storedBaseline = unchunkData(chunks) as any;

    return storedBaseline?.$metadata?.version || '1.0.0';
  } catch (error) {
    console.warn('Failed to read stored version, defaulting to 1.0.0:', error);
    return '1.0.0';
  }
}

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

  // Get registry node ID if it exists
  const registryNode = await findRegistryNode();
  const registryNodeId = registryNode?.id;

  // Build collection metadata
  const collectionMetadata: CollectionMetadata[] = collections.map(col => {
    const colVariables = allVariables.filter(v => v.variableCollectionId === col.id);
    return {
      id: col.id,
      name: col.name,
      modeCount: col.modes.length,
      variableCount: colVariables.length,
      modes: col.modes.map(m => ({ id: m.modeId, name: m.name }))
    };
  });

  // Count total variables
  const totalVariableCount = collections.reduce((sum, col) => {
    return sum + allVariables.filter(v => v.variableCollectionId === col.id).length;
  }, 0);

  // Get the current stored version (from last sync) for the export
  const storedVersion = await getCurrentStoredVersion();

  // Initialize output structure with enhanced metadata
  const output: BaselineSnapshot = {
    $metadata: {
      version: storedVersion,
      exportedAt: new Date().toISOString(),
      pluginVersion: '2.0.0',
      fileKey: figma.fileKey || '',
      fileName: figma.root.name,
      registryNodeId: registryNodeId,
      variableCount: totalVariableCount,
      collectionCount: collections.length,
      collections: collectionMetadata
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

        // Add to baseline (flat structure) with IDs for re-import matching
        const fullPath = `${collectionName}.${modeName}.${pathParts.join('.')}`;
        output.baseline[prefixedId] = {
          path: fullPath,
          value: value,
          type: tokenType,
          collection: collectionName,
          mode: modeName,
          variableId: variable.id,
          collectionId: collection.id,
          modeId: mode.modeId,
          description: variable.description || undefined
        };
      }
    }
  }

  return output;
}

// =============================================================================
// Variable Operations
// =============================================================================

import { parseColor } from './color-parser';

/**
 * Input type for creating or updating a variable.
 */
export interface VariableChangeInput {
  path: string;
  value: unknown;
  type: string;
  collection: string;
  mode: string;
  variableId?: string;
}

/**
 * Creates or updates a Figma variable based on the provided change data.
 *
 * @param change - The variable change data including path, value, type, collection, and mode
 */
export async function createOrUpdateVariable(change: VariableChangeInput): Promise<void> {
  // Find or create collection
  const allCollections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = allCollections.find((c) => c.name === change.collection);

  if (!collection) {
    try {
      collection = figma.variables.createVariableCollection(change.collection);
    } catch (e) {
      throw new Error(
        `Could not create collection "${change.collection}". ` +
          `You may have reached Figma's collection limit. Error: ${e}`
      );
    }

    if (!collection) {
      throw new Error(
        `Failed to create collection "${change.collection}". ` +
          `Figma may have restrictions on collection creation.`
      );
    }
  }

  // Find or create mode
  let modeId = collection.modes.find((m) => m.name === change.mode)?.modeId;

  if (!modeId) {
    // For collections with single "Mode 1", rename it
    if (collection.modes.length === 1 && collection.modes[0].name === 'Mode 1') {
      try {
        collection.renameMode(collection.modes[0].modeId, change.mode);
        modeId = collection.modes[0].modeId;
      } catch (e) {
        throw new Error(
          `Could not rename mode to "${change.mode}" in collection "${change.collection}". ` +
            `Error: ${e}`
        );
      }
    } else {
      try {
        modeId = collection.addMode(change.mode);
      } catch (e) {
        throw new Error(
          `Could not add mode "${change.mode}" to collection "${change.collection}". ` +
            `You may have reached the mode limit for your Figma plan. Error: ${e}`
        );
      }
    }

    if (!modeId) {
      throw new Error(
        `Failed to create mode "${change.mode}" in collection "${change.collection}". ` +
          `Mode creation returned no ID.`
      );
    }
  }

  // Find or create variable
  let variable: Variable | null = null;

  if (change.variableId) {
    variable = await figma.variables.getVariableByIdAsync(change.variableId);
  }

  if (!variable) {
    // Try to find by name
    const variableName = change.path.replace(/\./g, '/');
    const variablePromises = collection.variableIds.map((id) =>
      figma.variables.getVariableByIdAsync(id)
    );
    const variables = await Promise.all(variablePromises);
    const existingVariables = variables.filter(
      (v): v is Variable => v !== null && v.name === variableName
    );

    variable = existingVariables[0] || null;
  }

  if (!variable) {
    // Create new variable
    const resolvedType = getResolvedType(change.type);
    const variableName = change.path.replace(/\./g, '/');

    try {
      variable = figma.variables.createVariable(variableName, collection, resolvedType);
    } catch (e) {
      throw new Error(
        `Could not create variable "${variableName}" in collection "${change.collection}". ` +
          `Error: ${e}`
      );
    }

    if (!variable) {
      throw new Error(
        `Failed to create variable "${variableName}" in collection "${change.collection}". ` +
          `This may be due to an invalid variable name, type restriction, or Figma plan limits.`
      );
    }
  }

  // Set value
  try {
    const value = await convertValueForFigma(change.value, change.type);
    variable.setValueForMode(modeId, value);
  } catch (e) {
    throw new Error(
      `Could not set value for "${change.path}" in mode "${change.mode}". ` +
        `The value may be incompatible with the variable type. Error: ${e}`
    );
  }
}

/**
 * Converts a token type string to Figma's VariableResolvedDataType.
 *
 * @param type - Token type string (color, number, dimension, string, boolean)
 * @returns Figma's resolved data type
 */
export function getResolvedType(type: string): VariableResolvedDataType {
  switch (type.toLowerCase()) {
    case 'color':
      return 'COLOR';
    case 'number':
    case 'dimension':
      return 'FLOAT';
    case 'string':
      return 'STRING';
    case 'boolean':
      return 'BOOLEAN';
    default:
      return 'STRING';
  }
}

/**
 * Converts a token value to Figma's VariableValue format.
 *
 * @param value - The token value (can be a reference object, color string, or primitive)
 * @param type - The token type
 * @returns Figma-compatible variable value
 */
export async function convertValueForFigma(value: unknown, type: string): Promise<VariableValue> {
  // Handle reference
  if (typeof value === 'object' && value !== null && '$ref' in value) {
    const refId = (value as { $ref: string }).$ref;
    const variable = await figma.variables.getVariableByIdAsync(refId);
    if (variable) {
      return { type: 'VARIABLE_ALIAS', id: variable.id };
    }
  }

  // Handle color
  if (type === 'color' && typeof value === 'string') {
    return parseColor(value);
  }

  return value as VariableValue;
}

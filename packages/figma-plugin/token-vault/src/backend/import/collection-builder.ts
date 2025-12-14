/**
 * Collection builder module
 *
 * Builds Figma variable collections from extracted token data.
 * Creates collections, modes, and variables with proper type mapping.
 */

import type { ModeTokens } from '../utils/token-extractor.js';

/**
 * Result of building a collection
 */
export interface BuildResult {
  success: boolean;
  collectionsCreated: number;
  modesCreated: number;
  variablesCreated: number;
  errors: string[];
  warnings: string[];
}

/**
 * Build a Figma variable collection from token data
 *
 * Creates the collection, sets up modes, and creates all variables with their
 * values for each mode. Variables are created once and values are set for all modes.
 *
 * @param collectionName - Name of the collection to create
 * @param modes - Array of mode data with tokens
 * @returns Build result with counts and any errors/warnings
 */
export async function buildFigmaCollection(
  collectionName: string,
  modes: ModeTokens[]
): Promise<BuildResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Create variable collection
    const collection = figma.variables.createVariableCollection(collectionName);

    // Set up modes
    const modeIds: string[] = [];
    const modeNames = modes.map(m => m.name);

    // First mode is already created by Figma, rename it
    if (modeNames.length > 0) {
      collection.renameMode(collection.modes[0].modeId, modeNames[0]);
      modeIds.push(collection.modes[0].modeId);
    }

    // Add remaining modes
    for (let i = 1; i < modeNames.length; i++) {
      const modeId = collection.addMode(modeNames[i]);
      modeIds.push(modeId);
    }

    // Create variables
    let variablesCreated = 0;

    // Collect all unique variable paths across all modes
    const variablePaths = new Set<string>();
    for (const mode of modes) {
      for (const path of mode.tokens.keys()) {
        variablePaths.add(path);
      }
    }

    // Create each variable with values for all modes
    for (const varPath of variablePaths) {
      try {
        // Get the first non-null value to determine type
        let firstValue: any = null;
        let firstType: string = 'string';

        for (const mode of modes) {
          const value = mode.tokens.get(varPath);
          if (value !== undefined && value !== null) {
            firstValue = value;
            firstType = inferTokenType(value);
            break;
          }
        }

        if (firstValue === null) {
          warnings.push(`Skipping variable "${varPath}": no value found in any mode`);
          continue;
        }

        // Map to Figma type
        const figmaType = mapToFigmaType(firstType);

        // Create variable
        const variable = figma.variables.createVariable(
          varPath,
          collection,
          figmaType as VariableResolvedDataType
        );

        // Set value for each mode
        for (let i = 0; i < modes.length; i++) {
          const mode = modes[i];
          const modeId = modeIds[i];
          const value = mode.tokens.get(varPath);

          if (value !== undefined && value !== null) {
            try {
              const parsedValue = parseValue(value, figmaType);
              variable.setValueForMode(modeId, parsedValue);
            } catch (error) {
              errors.push(
                `Failed to set value for "${varPath}" in mode "${mode.name}": ${(error as Error).message}`
              );
            }
          } else {
            // Set default value based on type
            const defaultValue = getDefaultValue(figmaType);
            try {
              variable.setValueForMode(modeId, defaultValue);
              warnings.push(`Variable "${varPath}" has no value in mode "${mode.name}", using default`);
            } catch (error) {
              errors.push(
                `Failed to set default value for "${varPath}" in mode "${mode.name}": ${(error as Error).message}`
              );
            }
          }
        }

        variablesCreated++;
      } catch (error) {
        errors.push(`Failed to create variable "${varPath}": ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
      collectionsCreated: 1,
      modesCreated: modeIds.length,
      variablesCreated,
      errors,
      warnings
    };
  } catch (error) {
    return {
      success: false,
      collectionsCreated: 0,
      modesCreated: 0,
      variablesCreated: 0,
      errors: [`Failed to create collection "${collectionName}": ${(error as Error).message}`],
      warnings
    };
  }
}

/**
 * Infer token type from value
 */
function inferTokenType(value: any): string {
  // Handle Design Tokens format with explicit type
  if (value && typeof value === 'object') {
    if ('$type' in value) {
      return value.$type;
    }
    if ('type' in value) {
      return value.type;
    }
    // Extract value from DTCG format
    if ('$value' in value) {
      value = value.$value;
    } else if ('value' in value) {
      value = value.value;
    }
  }

  // Infer from value format
  if (typeof value === 'string') {
    // Hex color
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
      return 'color';
    }
    // RGB/RGBA
    if (/^rgba?\(/.test(value)) {
      return 'color';
    }
    // Dimension with units
    if (/^\d+(\.\d+)?(px|rem|em|pt)$/.test(value)) {
      return 'dimension';
    }
    return 'string';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  return 'string';
}

/**
 * Map token type to Figma variable type
 */
function mapToFigmaType(tokenType: string): string {
  const typeMap: Record<string, string> = {
    'color': 'COLOR',
    'number': 'FLOAT',
    'dimension': 'FLOAT',
    'spacing': 'FLOAT',
    'fontSize': 'FLOAT',
    'fontFamily': 'STRING',
    'fontWeight': 'STRING',
    'string': 'STRING',
    'boolean': 'BOOLEAN'
  };

  return typeMap[tokenType] || 'STRING';
}

/**
 * Parse value string to appropriate Figma type
 */
function parseValue(value: any, figmaType: string): any {
  // Extract value from Design Tokens format if needed
  if (value && typeof value === 'object') {
    if ('$value' in value) {
      value = value.$value;
    } else if ('value' in value) {
      value = value.value;
    }
  }

  if (figmaType === 'COLOR') {
    return parseColor(value);
  } else if (figmaType === 'FLOAT') {
    return parseNumber(value);
  } else if (figmaType === 'BOOLEAN') {
    return Boolean(value);
  } else {
    return String(value);
  }
}

/**
 * Parse color value to RGBA
 */
function parseColor(colorValue: any): { r: number; g: number; b: number; a: number } {
  const colorString = String(colorValue);

  // Handle hex colors
  if (colorString.startsWith('#')) {
    const hex = colorString.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  // Handle rgb/rgba
  const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]) / 255;
    const g = parseInt(rgbMatch[2]) / 255;
    const b = parseInt(rgbMatch[3]) / 255;
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    return { r, g, b, a };
  }

  // Default fallback
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Parse number value from string or number
 */
function parseNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }

  const str = String(value);

  // Remove units (px, rem, em, pt)
  const numStr = str.replace(/(px|rem|em|pt)$/, '');
  const num = parseFloat(numStr);

  return isNaN(num) ? 0 : num;
}

/**
 * Get default value for a Figma type
 */
function getDefaultValue(figmaType: string): any {
  switch (figmaType) {
    case 'COLOR':
      return { r: 0, g: 0, b: 0, a: 1 };
    case 'FLOAT':
      return 0;
    case 'BOOLEAN':
      return false;
    case 'STRING':
    default:
      return '';
  }
}

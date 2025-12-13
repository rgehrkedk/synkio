/**
 * Export transformer module
 * Handles value transformation from Figma format to token format
 */

import { rgbToHex } from '../utils/parsers.js';

/**
 * Resolve a variable's value for a specific mode
 * Handles VARIABLE_ALIAS references and color transformations
 *
 * @param variable - Figma variable to resolve
 * @param modeId - Mode ID to get value for
 * @returns Resolved value (alias string, hex color, or raw value)
 */
export async function resolveVariableValue(variable: Variable, modeId: string): Promise<any> {
  const value = variable.valuesByMode[modeId];

  // Check if it's an alias reference
  if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id);
    if (aliasedVariable) {
      // Return alias in {path.to.token} format
      return '{' + aliasedVariable.name.replace(/\//g, '.') + '}';
    }
  }

  // Handle color values - convert RGB to hex
  if (variable.resolvedType === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
    return rgbToHex(value as RGB | RGBA);
  }

  // Return raw value for other types
  return value;
}

/**
 * Set a nested value in an object using a path
 * Creates intermediate objects as needed
 *
 * @param obj - Target object to modify
 * @param pathParts - Array of path segments (e.g., ['colors', 'primary'])
 * @param value - Value to set at the path
 */
export function setNestedValue(obj: any, pathParts: string[], value: any): void {
  let current = obj;

  // Navigate/create nested structure up to the last segment
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  // Set the final value
  current[pathParts[pathParts.length - 1]] = value;
}

/**
 * Variable management for token import
 * Creates and updates Figma variables with token values
 */

import type { NormalizedToken } from '../../types/index.js';
import { mapTokenTypeToFigmaType, getDefaultValueForType } from '../utils/type-mappers.js';
import { parseColor, parseNumber, parseFontWeight } from '../utils/parsers.js';

/**
 * Callback to register alias references during variable creation
 */
export type AliasCallback = (variable: Variable, modeId: string, aliasPath: string) => void;

/**
 * Create or update a Figma variable for a token
 * @param collection - The variable collection
 * @param modeId - The mode ID to set the value for
 * @param path - The token path (becomes variable name)
 * @param token - The normalized token data
 * @param onAlias - Optional callback for alias references
 */
export async function createOrUpdateVariable(
  collection: VariableCollection,
  modeId: string,
  path: string,
  token: NormalizedToken,
  onAlias?: AliasCallback
): Promise<Variable> {
  const variableName = path;

  // Find existing variable or create new
  const variables = await figma.variables.getLocalVariablesAsync();
  let variable = variables.find(
    v => v.name === variableName && v.variableCollectionId === collection.id
  );

  if (!variable) {
    const resolvedType = mapTokenTypeToFigmaType(token.type);
    variable = figma.variables.createVariable(variableName, collection, resolvedType);
  }

  // Set description if provided
  if (token.description) {
    variable.description = token.description;
  }

  // Parse and set value
  const resolvedValue = parseTokenValue(token.value, token.type, variable, modeId, onAlias);

  if (resolvedValue !== null) {
    try {
      variable.setValueForMode(modeId, resolvedValue);
    } catch (error) {
      console.error(`Failed to set value for ${path}:`, error instanceof Error ? error.message : String(error));
      console.error(`Type: ${token.type}, Value: ${token.value}, Resolved: ${JSON.stringify(resolvedValue)}`);

      // Set a default value based on type
      const defaultValue = getDefaultValueForType(variable.resolvedType);
      if (defaultValue !== null) {
        variable.setValueForMode(modeId, defaultValue);
      }
    }
  } else {
    // For aliases, set a temporary default value
    const defaultValue = getDefaultValueForType(variable.resolvedType);
    if (defaultValue !== null) {
      variable.setValueForMode(modeId, defaultValue);
    }
  }

  return variable;
}

/**
 * Parse token value based on type
 * Detects alias references and delegates to type-specific parsers
 * @returns Parsed value or null if alias reference
 */
function parseTokenValue(
  value: any,
  type: string,
  variable?: Variable,
  modeId?: string,
  onAlias?: AliasCallback
): any {
  // Check if value contains alias references
  if (typeof value === 'string' && value.includes('{')) {
    // Check if it's a single alias: "{path.to.token}"
    if (value.startsWith('{') && value.endsWith('}') && value.indexOf('}') === value.length - 1) {
      // Single alias - store for resolution
      if (variable && modeId && onAlias) {
        onAlias(variable, modeId, value);
      }
      return null;
    } else {
      // Multiple aliases or mixed content (e.g., "{space.1} {space.3}")
      // Figma doesn't support multi-alias, so keep as string
      return String(value);
    }
  }

  // Parse based on type
  switch (type) {
    case 'color':
      return parseColor(value);

    case 'dimension':
    case 'spacing':
    case 'fontSize':
    case 'number':
      return parseNumber(value);

    case 'fontWeight':
      return parseFontWeight(value);

    case 'fontFamily':
    case 'string':
    case 'shadow':
    case 'gradient':
    case 'duration':
      return String(value);

    case 'boolean':
      return Boolean(value);

    default:
      // Return string for unknown types
      return String(value);
  }
}

/**
 * Check if an object is a token value (leaf node)
 * Supports W3C format ($value/$type) and legacy format (value/type)
 */
export function isTokenValue(obj: any): boolean {
  return obj && typeof obj === 'object' &&
    (('$value' in obj) || ('value' in obj && !hasNestedTokens(obj)));
}

/**
 * Check if object has nested token objects
 */
function hasNestedTokens(obj: any): boolean {
  for (const key of Object.keys(obj)) {
    if (key === 'value' || key === 'type' || key === 'description' ||
        key === '$value' || key === '$type' || key === '$description') {
      continue;
    }
    // If there's any other key, this might be a container
    const nested = obj[key];
    if (nested && typeof nested === 'object') {
      return true;
    }
  }
  return false;
}

/**
 * Normalize token to internal format
 * Converts W3C format ($value/$type) to internal format
 * @param obj - Raw token object
 * @param path - Token path for type inference
 * @param inferType - Function to infer type from path if not specified
 */
export function normalizeToken(
  obj: any,
  path: string,
  inferType: (path: string) => string
): NormalizedToken {
  const explicitType = obj.$type ?? obj.type;
  const inferredType = explicitType || inferType(path);

  return {
    value: obj.$value ?? obj.value,
    type: inferredType as any,
    description: obj.$description ?? obj.description
  };
}

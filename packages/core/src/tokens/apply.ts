/**
 * Token Apply Utilities
 *
 * Functions for applying token changes to JSON files.
 * Used by: splitTokens, applyMigration
 */

import type { TransformOptions } from '../types';
import { loadJsonFile, saveJsonFile } from '../files';

/**
 * Token entry in legacy format (as stored in JSON files)
 */
export interface TokenFileEntry {
  value: any;
  type: string;
  $variableId: string;
}

/**
 * Get nested value from object using path array
 */
export function getNestedValue(obj: Record<string, any>, pathArray: string[]): any {
  let current = obj;
  for (const key of pathArray) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Set nested value in object using path array
 * Creates intermediate objects as needed
 */
export function setNestedValue(obj: Record<string, any>, pathArray: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < pathArray.length - 1; i++) {
    const key = pathArray[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[pathArray[pathArray.length - 1]] = value;
}

/**
 * Delete nested value from object using path array
 * Cleans up empty parent objects
 */
export function deleteNestedValue(obj: Record<string, any>, pathArray: string[]): boolean {
  if (pathArray.length === 0) return false;

  if (pathArray.length === 1) {
    if (pathArray[0] in obj) {
      delete obj[pathArray[0]];
      return true;
    }
    return false;
  }

  const parentPath = pathArray.slice(0, -1);
  const key = pathArray[pathArray.length - 1];
  const parent = getNestedValue(obj, parentPath);

  if (parent && typeof parent === 'object' && key in parent) {
    delete parent[key];

    // Clean up empty parent objects
    if (Object.keys(parent).length === 0) {
      deleteNestedValue(obj, parentPath);
    }
    return true;
  }

  return false;
}

/**
 * Update a single token in a JSON file
 */
export function updateTokenInFile(
  filePath: string,
  tokenPath: string[],
  token: TokenFileEntry
): { success: boolean; created: boolean } {
  const data = loadJsonFile(filePath);
  const existed = getNestedValue(data, tokenPath) !== undefined;

  setNestedValue(data, tokenPath, token);
  saveJsonFile(filePath, data);

  return { success: true, created: !existed };
}

/**
 * Delete a token from a JSON file
 */
export function deleteTokenFromFile(
  filePath: string,
  tokenPath: string[]
): { success: boolean; existed: boolean } {
  const data = loadJsonFile(filePath);
  const existed = getNestedValue(data, tokenPath) !== undefined;

  if (existed) {
    deleteNestedValue(data, tokenPath);
    saveJsonFile(filePath, data);
  }

  return { success: existed, existed };
}

/**
 * Rename a token in a JSON file (or across files)
 */
export function renameTokenInFile(
  oldFilePath: string,
  oldTokenPath: string[],
  newFilePath: string,
  newTokenPath: string[],
  newValue?: TokenFileEntry
): { success: boolean; movedAcrossFiles: boolean } {
  const movedAcrossFiles = oldFilePath !== newFilePath;

  // Get existing value if new value not provided
  let tokenValue = newValue;
  if (!tokenValue) {
    const oldData = loadJsonFile(oldFilePath);
    tokenValue = getNestedValue(oldData, oldTokenPath);
    if (!tokenValue) {
      return { success: false, movedAcrossFiles };
    }
  }

  // Delete from old location
  deleteTokenFromFile(oldFilePath, oldTokenPath);

  // Add to new location
  updateTokenInFile(newFilePath, newTokenPath, tokenValue);

  return { success: true, movedAcrossFiles };
}

/**
 * Bulk update multiple tokens in a single file
 * More efficient than calling updateTokenInFile multiple times
 */
export function bulkUpdateTokensInFile(
  filePath: string,
  tokens: Array<{ path: string[]; token: TokenFileEntry }>
): { success: boolean; count: number } {
  const data = loadJsonFile(filePath);

  for (const { path: tokenPath, token } of tokens) {
    setNestedValue(data, tokenPath, token);
  }

  saveJsonFile(filePath, data);

  return { success: true, count: tokens.length };
}

/**
 * Transform W3C DTCG token to file format
 */
export function toFileFormat(
  token: { $type: string; $value: any; $variableId: string },
  options?: TransformOptions
): TokenFileEntry {
  const useDollar = options?.useDollarPrefix ?? false;
  const typeOverrides = options?.typeOverrides ?? {};

  let typeValue = token.$type;
  if (typeOverrides[typeValue]) {
    typeValue = typeOverrides[typeValue];
  }

  if (useDollar) {
    return {
      value: token.$value,
      type: typeValue,
      $variableId: token.$variableId,
    } as any; // W3C format uses $type, $value
  }

  return {
    value: token.$value,
    type: typeValue,
    $variableId: token.$variableId,
  };
}

/**
 * Find token by $variableId in a JSON file
 * Returns the path to the token if found
 */
export function findTokenByVariableId(
  filePath: string,
  variableId: string
): { found: boolean; path: string[] | null } {
  const data = loadJsonFile(filePath);

  function searchRecursive(obj: any, currentPath: string[]): string[] | null {
    if (obj && typeof obj === 'object') {
      // Check if this is a token with matching variableId
      if (obj.$variableId === variableId) {
        return currentPath;
      }

      // Recurse into children
      for (const [key, value] of Object.entries(obj)) {
        const result = searchRecursive(value, [...currentPath, key]);
        if (result) return result;
      }
    }
    return null;
  }

  const path = searchRecursive(data, []);
  return { found: path !== null, path };
}

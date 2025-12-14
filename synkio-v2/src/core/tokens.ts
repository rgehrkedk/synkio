import { BaselineEntry } from '../types/index.js';

/**
 * The raw token structure received from the Figma plugin
 */
export type RawTokens = Record<string, BaselineEntry>;

/**
 * The result of splitting tokens, a map of file names to their content.
 */
export type SplitTokens = Map<string, any>;

/**
 * Configuration for how to split collections
 */
export interface CollectionSplitOptions {
  [collectionName: string]: {
    splitModes?: boolean; // true = separate files per mode (default), false = single file with modes as nested keys
  };
}

// A simple utility to set a nested property on an object
function set(obj: any, path: string[], value: any) {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        current = current[key] = current[key] || {};
    }
    current[path[path.length - 1]] = value;
}

/**
 * Splits the raw, flat token data into a map of file names to nested token objects.
 * 
 * By default, multi-mode collections are split into separate files (e.g., theme.light.json, theme.dark.json).
 * Use the `options` parameter to control splitting behavior per collection.
 * 
 * @param rawTokens - The flat token data from Figma
 * @param options - Optional configuration for collection splitting
 * @returns Map of file names to their token content
 * 
 * @example
 * // Default: split modes into separate files
 * splitTokens(tokens) // -> theme.light.json, theme.dark.json
 * 
 * // Merge modes into single file
 * splitTokens(tokens, { theme: { splitModes: false } }) // -> theme.json with { light: {...}, dark: {...} }
 */
export function splitTokens(rawTokens: RawTokens, options: CollectionSplitOptions = {}): SplitTokens {
    const files = new Map<string, any>();
    
    for (const entry of Object.values(rawTokens)) {
        const pathParts = entry.path.split('.');
        if (pathParts.length < 1) continue;

        const collection = pathParts[0]; // e.g., "theme" or "base"
        const collectionConfig = options[collection];
        const shouldSplitModes = collectionConfig?.splitModes !== false; // default true
        
        let fileKey: string;
        let nestedPath: string[];
        
        if (shouldSplitModes) {
            // Split by collection.mode -> theme.light.json, theme.dark.json
            // Use first two parts as file key if they exist (collection.mode)
            if (pathParts.length >= 2) {
                fileKey = `${pathParts[0]}.${pathParts[1]}`; // e.g., "theme.light"
                nestedPath = pathParts.slice(2); // Rest of the path
            } else {
                fileKey = pathParts[0];
                nestedPath = [];
            }
        } else {
            // Don't split: use only collection name as file key
            // Keep mode as part of nested path
            fileKey = collection; // e.g., "theme"
            nestedPath = pathParts.slice(1); // mode + rest of path
        }
        
        if (!files.has(fileKey)) {
            files.set(fileKey, {});
        }

        const fileContent = files.get(fileKey);
        
        // If there's a nested path, create the nested structure.
        // Otherwise, this is a top-level property on the file.
        if (nestedPath.length > 0) {
            set(fileContent, nestedPath, { value: entry.value });
        } else {
            // Edge case: no nested path, use the last part of the original path
            const lastKey = pathParts[pathParts.length - 1];
            fileContent[lastKey] = { value: entry.value };
        }
    }
    
    const result = new Map<string, any>();
    for (const [key, value] of files.entries()) {
        result.set(`${key}.json`, value);
    }
    return result;
}

export function parseVariableId(prefixedId: string): { varId: string; mode: string } {
  const parts = prefixedId.split(':');
  if (parts.length < 2) {
    return { varId: prefixedId, mode: 'default' };
  }
  const mode = parts.pop()!;
  const varId = parts.join(':');
  return { varId, mode };
}

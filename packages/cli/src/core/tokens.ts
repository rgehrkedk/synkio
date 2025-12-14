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
    splitModes?: boolean;  // true = separate files per mode (default), false = single file with modes as nested keys
    includeMode?: boolean; // true = include mode as first-level key even when splitting (default: true)
  };
}

/**
 * Token entry from the new Synkio plugin format
 */
interface SynkioTokenEntry {
  variableId: string;
  collection: string;
  mode: string;
  path: string;
  value: any;
  type: string;
  // Optional metadata
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

/**
 * Raw data from the Synkio plugin
 */
interface SynkioPluginData {
  version: string;
  timestamp: string;
  tokens: SynkioTokenEntry[];
}

/**
 * Normalize data from either plugin format into the baseline format
 * Supports:
 * - New Synkio format: { version, timestamp, tokens: [...] }
 * - Legacy token_vault format: { baseline: { ... }, registry: { ... } }
 */
export function normalizePluginData(rawData: any): RawTokens {
  // New Synkio plugin format
  if (rawData.tokens && Array.isArray(rawData.tokens)) {
    const data = rawData as SynkioPluginData;
    const result: RawTokens = {};
    
    for (const token of data.tokens) {
      // Create a unique key for each token entry
      const key = `${token.variableId}:${token.mode}`;
      const entry: any = {
        variableId: token.variableId,
        collection: token.collection,
        mode: token.mode,
        path: token.path,
        value: token.value,
        type: token.type,
      };
      
      // Copy optional metadata if present
      if (token.description) entry.description = token.description;
      if (token.scopes) entry.scopes = token.scopes;
      if (token.codeSyntax) entry.codeSyntax = token.codeSyntax;
      
      result[key] = entry;
    }
    
    return result;
  }
  
  // Legacy token_vault format (already in correct structure)
  if (rawData.baseline && typeof rawData.baseline === 'object') {
    return rawData.baseline;
  }
  
  // Legacy format: might be the baseline directly
  if (typeof rawData === 'object' && !rawData.tokens && !rawData.baseline) {
    // Check if it looks like a baseline (has entries with path, value, etc.)
    const firstKey = Object.keys(rawData)[0];
    if (firstKey && rawData[firstKey]?.path !== undefined) {
      return rawData;
    }
  }
  
  throw new Error('Unrecognized plugin data format. Run the Synkio plugin in Figma first.');
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
 * Options for splitTokens function
 */
export interface SplitTokensOptions {
  collections?: CollectionSplitOptions;
  dtcg?: boolean;             // Use DTCG format with $value, $type (default: true)
  includeVariableId?: boolean; // Include Figma variableId in output (default: false)
  extensions?: {
    description?: boolean;    // Include variable descriptions (default: false)
    scopes?: boolean;         // Include usage scopes (default: false)
    codeSyntax?: boolean;     // Include code syntax for platforms (default: false)
  };
}

/**
 * Splits the raw, flat token data into a map of file names to nested token objects.
 * 
 * By default, multi-mode collections are split into separate files (e.g., theme.light.json, theme.dark.json).
 * Use the `options` parameter to control splitting behavior per collection.
 * 
 * @param rawTokens - The flat token data from Figma
 * @param options - Optional configuration for splitting and output format
 * @returns Map of file names to their token content
 * 
 * @example
 * // Default: split modes into separate files with DTCG format
 * splitTokens(tokens) // -> theme.light.json with { "$value": ... }
 * 
 * // Merge modes into single file
 * splitTokens(tokens, { collections: { theme: { splitModes: false } } })
 * 
 * // Disable DTCG format (use "value" instead of "$value")
 * splitTokens(tokens, { dtcg: false })
 */
export function splitTokens(rawTokens: RawTokens, options: SplitTokensOptions = {}): SplitTokens {
    const files = new Map<string, any>();
    const collectionOptions = options.collections || {};
    const useDtcg = options.dtcg !== false; // default true
    const includeVariableId = options.includeVariableId === true; // default false
    const extensions = options.extensions || {};
    const valueKey = useDtcg ? '$value' : 'value';
    const typeKey = useDtcg ? '$type' : 'type';
    const extensionsKey = useDtcg ? '$extensions' : 'extensions';
    const descriptionKey = useDtcg ? '$description' : 'description';
    
    for (const entry of Object.values(rawTokens)) {
        // Use explicit collection/mode fields if available (new Synkio format)
        // Fall back to parsing from path (legacy format)
        const collection = entry.collection || entry.path.split('.')[0];
        const mode = entry.mode || entry.path.split('.')[1] || 'value';
        const pathParts = entry.path.split('.');
        
        const collectionConfig = collectionOptions[collection];
        const shouldSplitModes = collectionConfig?.splitModes !== false; // default true
        const shouldIncludeMode = collectionConfig?.includeMode !== false; // default true
        
        let fileKey: string;
        let nestedPath: string[];
        
        if (shouldSplitModes) {
            // Split by collection.mode -> theme.light.json, theme.dark.json
            fileKey = `${collection}.${mode}`;
            // Include mode as first-level key if configured
            nestedPath = shouldIncludeMode ? [mode, ...pathParts] : pathParts;
        } else {
            // Don't split: use only collection name as file key
            // Include mode as top-level key in the file
            fileKey = collection;
            nestedPath = [mode, ...pathParts]; // mode + path
        }
        
        if (!files.has(fileKey)) {
            files.set(fileKey, {});
        }

        const fileContent = files.get(fileKey);
        
        // Build token object with DTCG or legacy format
        const tokenObj: Record<string, any> = {
            [valueKey]: entry.value,
            [typeKey]: entry.type,
        };
        
        // Optionally include description (DTCG uses $description)
        if (extensions.description && entry.description) {
            tokenObj[descriptionKey] = entry.description;
        }
        
        // Build extensions object for variableId, scopes, codeSyntax
        const figmaExtensions: Record<string, any> = {};
        
        if (includeVariableId && entry.variableId) {
            figmaExtensions.variableId = entry.variableId;
        }
        
        if (extensions.scopes && entry.scopes && entry.scopes.length > 0) {
            figmaExtensions.scopes = entry.scopes;
        }
        
        if (extensions.codeSyntax && entry.codeSyntax && Object.keys(entry.codeSyntax).length > 0) {
            figmaExtensions.codeSyntax = entry.codeSyntax;
        }
        
        // Only add extensions if there's something to include
        if (Object.keys(figmaExtensions).length > 0) {
            tokenObj[extensionsKey] = { 'com.figma': figmaExtensions };
        }
        
        // Create nested structure for the token
        if (nestedPath.length > 0) {
            set(fileContent, nestedPath, tokenObj);
        } else {
            // Edge case: no nested path
            fileContent[entry.path] = tokenObj;
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

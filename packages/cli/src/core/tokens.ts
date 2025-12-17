import { BaselineEntry } from '../types/index.js';
import { SynkioPluginDataSchema, SynkioTokenEntrySchema } from '../types/schemas.js';

/**
 * The raw token structure received from the Figma plugin
 */
export type RawTokens = Record<string, BaselineEntry>;

/**
 * The result of splitting tokens, a map of file names to their content and metadata.
 */
export interface SplitTokenFile {
  content: any;
  collection: string;
  dir?: string;  // Custom output directory for this file (relative to cwd)
}

export type SplitTokens = Map<string, SplitTokenFile>;

/**
 * Configuration for how to split collections
 */
export interface CollectionSplitOptions {
  [collectionName: string]: {
    dir?: string;          // Output directory for this collection (relative to cwd)
    file?: string;         // Custom filename base (e.g., "colors" → "colors.json", or with modes: "theme" → "theme.light.json")
    splitModes?: boolean;  // true = separate files per mode (default), false = single file with modes as nested keys
    includeMode?: boolean; // true = include mode as first-level key even when splitting (default: true)
  };
}

/**
 * Map Figma types to DTCG canonical types
 * Also considers the path to infer better types (e.g., spacing.xs with type 'float' -> 'dimension')
 */
export function mapToDTCGType(type: string, path?: string): string {
  const typeMap: Record<string, string> = {
    'color': 'color',
    'float': 'number',
    'number': 'number',
    'boolean': 'boolean',
    'string': 'string',
    'dimension': 'dimension',
    'fontfamily': 'fontFamily',
    'fontweight': 'fontWeight',
    'fontsize': 'dimension',
    'lineheight': 'number',
    'letterspacing': 'dimension',
    'shadow': 'shadow',
    'border': 'border',
    'duration': 'duration',
    'cubicbezier': 'cubicBezier',
    'gradient': 'gradient',
    'typography': 'typography',
  };
  
  const baseType = typeMap[type.toLowerCase()] || type.toLowerCase();
  
  // Infer dimension type from path for float/number types
  if ((type.toLowerCase() === 'float' || type.toLowerCase() === 'number') && path) {
    const pathLower = path.toLowerCase();
    const dimensionPatterns = ['spacing', 'space', 'radius', 'size', 'width', 'height', 'gap', 'padding', 'margin', 'border'];
    if (dimensionPatterns.some(pattern => pathLower.includes(pattern))) {
      return 'dimension';
    }
  }
  
  return baseType;
}

/**
 * Normalize token values for DTCG format
 */
function normalizeValue(value: unknown, type: string, path?: string, dtcgType?: string): unknown {
  // Handle Figma color objects { r, g, b, a }
  if (type.toLowerCase() === 'color' && typeof value === 'object' && value !== null) {
    const v = value as { r?: number; g?: number; b?: number; a?: number };
    if ('r' in v && 'g' in v && 'b' in v) {
      const r = Math.round((v.r ?? 0) * 255);
      const g = Math.round((v.g ?? 0) * 255);
      const b = Math.round((v.b ?? 0) * 255);
      const a = v.a ?? 1;
      
      if (a === 1) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  
  // Add px suffix for dimension types (spacing, radius, size, etc.)
  if (dtcgType === 'dimension' && typeof value === 'number') {
    return `${value}px`;
  }
  
  return value;
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
    // Validate the data with Zod
    const validationResult = SynkioPluginDataSchema.safeParse(rawData);

    if (!validationResult.success) {
      // Format user-friendly error message
      const zodError = validationResult.error;
      const errorDetails = zodError.issues.map((err: any) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      }).join('\n');

      throw new Error(
        `Invalid data from Figma plugin.

This could mean:
  - The Synkio plugin has not been run on this Figma file
  - The plugin data is corrupted or incomplete
  - You are using an incompatible plugin version

Please run the Synkio plugin in Figma and try again.

Technical details:
${errorDetails}`
      );
    }

    const data = validationResult.data;
    const result: RawTokens = {};

    for (const token of data.tokens) {
      // Create a unique key for each token entry: VariableID:X:X:collection.mode
      const key = `${token.variableId}:${token.collection}.${token.mode}`;
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
    const files = new Map<string, { content: any; collection: string }>();
    const collectionOptions = options.collections || {};
    const useDtcg = options.dtcg !== false; // default true
    const includeVariableId = options.includeVariableId === true; // default false
    const extensions = options.extensions || {};
    const valueKey = useDtcg ? '$value' : 'value';
    const typeKey = useDtcg ? '$type' : 'type';
    const extensionsKey = useDtcg ? '$extensions' : 'extensions';
    const descriptionKey = useDtcg ? '$description' : 'description';
    
    // Build a lookup map from VariableID to path for resolving references
    const variableIdToPath = new Map<string, string>();
    for (const entry of Object.values(rawTokens)) {
        if (entry.variableId && entry.path) {
            variableIdToPath.set(entry.variableId, entry.path);
        }
    }
    
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
            files.set(fileKey, { content: {}, collection });
        }

        const fileData = files.get(fileKey)!;
        
        // Determine the DTCG type (may be inferred from path)
        const dtcgType = mapToDTCGType(entry.type, entry.path);
        
        // Resolve value - convert VariableID references to DTCG path references
        let resolvedValue = entry.value;
        if (entry.value && typeof entry.value === 'object' && entry.value.$ref) {
            const refVariableId = entry.value.$ref;
            const refPath = variableIdToPath.get(refVariableId);
            if (refPath) {
                // DTCG format: wrap path in curly braces
                resolvedValue = `{${refPath}}`;
            } else {
                // Fallback: keep original reference if path not found
                console.warn(`Warning: Could not resolve reference ${refVariableId} for token ${entry.path}`);
                resolvedValue = entry.value;
            }
        } else {
            // Normalize the value (add px for dimensions, convert colors, etc.)
            resolvedValue = normalizeValue(entry.value, entry.type, entry.path, dtcgType);
        }
        
        // Build token object with DTCG or legacy format
        const tokenObj: Record<string, any> = {
            [valueKey]: resolvedValue,
            [typeKey]: dtcgType,
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
            set(fileData.content, nestedPath, tokenObj);
        } else {
            // Edge case: no nested path
            fileData.content[entry.path] = tokenObj;
        }
    }
    
    const result: SplitTokens = new Map();
    for (const [key, fileData] of files.entries()) {
        const collectionConfig = collectionOptions[fileData.collection];
        
        // Determine the filename
        // key format is either "collection.mode" (split) or "collection" (merged)
        let fileName: string;
        if (collectionConfig?.file) {
            // Custom filename specified
            const keyParts = key.split('.');
            if (keyParts.length > 1) {
                // Has mode suffix (e.g., "theme.light" → use custom file + mode)
                const mode = keyParts.slice(1).join('.');
                fileName = `${collectionConfig.file}.${mode}.json`;
            } else {
                // No mode suffix
                fileName = `${collectionConfig.file}.json`;
            }
        } else {
            // Default: use key as-is
            fileName = `${key}.json`;
        }
        
        result.set(fileName, {
            content: fileData.content,
            collection: fileData.collection,
            dir: collectionConfig?.dir,
        });
    }
    return result;
}

/**
 * Parse a prefixed variable ID into its components
 * Supports both formats:
 * - New format: VariableID:X:X:collection.mode
 * - Legacy format: VariableID:X:X:mode
 */
export function parseVariableId(prefixedId: string): { varId: string; collection: string; mode: string } {
  const parts = prefixedId.split(':');
  if (parts.length < 2) {
    return { varId: prefixedId, collection: 'unknown', mode: 'default' };
  }
  
  const lastPart = parts.pop()!;
  const varId = parts.join(':');
  
  // Check if lastPart contains collection.mode (new format)
  if (lastPart.includes('.')) {
    const dotIndex = lastPart.indexOf('.');
    const collection = lastPart.substring(0, dotIndex);
    const mode = lastPart.substring(dotIndex + 1);
    return { varId, collection, mode };
  }
  
  // Legacy format: just mode
  return { varId, collection: 'unknown', mode: lastPart };
}

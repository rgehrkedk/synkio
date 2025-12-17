/**
 * Parser for Figma's native JSON variable export format.
 *
 * Figma can export variables directly to JSON without a plugin.
 * This parser converts that format to Synkio's baseline format.
 *
 * Example Figma native export:
 * ```json
 * {
 *   "bg": {
 *     "primary": {
 *       "$type": "color",
 *       "$value": { "hex": "#FAFAFA" },
 *       "$extensions": {
 *         "com.figma.variableId": "VariableID:2:64",
 *         "com.figma.scopes": ["ALL_SCOPES"],
 *         "com.figma.aliasData": { ... }
 *       }
 *     }
 *   },
 *   "$extensions": {
 *     "com.figma.modeName": "light"
 *   }
 * }
 * ```
 */

import { BaselineEntry } from '../types/index.js';

/**
 * Figma native token structure
 */
interface FigmaNativeToken {
  $type: string;
  $value: FigmaNativeValue;
  $extensions?: {
    'com.figma.variableId'?: string;
    'com.figma.scopes'?: string[];
    'com.figma.aliasData'?: {
      targetVariableId?: string;
      targetVariableName?: string;
      targetVariableSetId?: string;
      targetVariableSetName?: string;
    };
  };
}

/**
 * Figma native value can be a color object or primitive
 */
interface FigmaNativeColorValue {
  colorSpace?: string;
  components?: number[];
  alpha?: number;
  hex?: string;
}

type FigmaNativeValue = FigmaNativeColorValue | string | number | boolean;

/**
 * Root-level extensions in Figma native export
 */
interface FigmaNativeRootExtensions {
  'com.figma.modeName'?: string;
  'com.figma.collectionName'?: string;
}

/**
 * Result of parsing a single Figma native JSON file
 */
export interface ParsedFigmaNativeFile {
  tokens: BaselineEntry[];
  modeName: string;
  collectionName?: string;
}

/**
 * Options for parsing Figma native exports
 */
export interface ParseFigmaNativeOptions {
  /** Collection name (required if not in file) */
  collection?: string;
  /** Mode name override (uses file's modeName if not specified) */
  mode?: string;
}

/**
 * Check if an object is a Figma native token (has $type and $value)
 */
function isToken(obj: unknown): obj is FigmaNativeToken {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    '$type' in obj &&
    '$value' in obj
  );
}

/**
 * Normalize Figma native color value to hex string
 */
function normalizeColorValue(value: FigmaNativeValue): string {
  if (typeof value === 'object' && value !== null && 'hex' in value) {
    return (value as FigmaNativeColorValue).hex || '#000000';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '#000000';
}

/**
 * Normalize any Figma native value to our format
 */
function normalizeValue(value: FigmaNativeValue, type: string): unknown {
  // Handle color values
  if (type === 'color') {
    return normalizeColorValue(value);
  }

  // Handle other types - extract primitive value if wrapped
  if (typeof value === 'object' && value !== null) {
    // Some types might have nested value structures
    if ('value' in value) {
      return (value as any).value;
    }
  }

  return value;
}

/**
 * Recursively traverse the JSON and extract tokens
 */
function extractTokens(
  obj: unknown,
  path: string[],
  collection: string,
  mode: string,
  tokens: BaselineEntry[]
): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  // Skip the root $extensions key
  if (path.length === 1 && path[0] === '$extensions') {
    return;
  }

  // Check if this is a token
  if (isToken(obj)) {
    const variableId = obj.$extensions?.['com.figma.variableId'];
    const tokenPath = path.join('.');

    const entry: BaselineEntry = {
      path: tokenPath,
      value: normalizeValue(obj.$value, obj.$type),
      type: obj.$type,
      collection,
      mode,
    };

    // Add variableId if present
    if (variableId) {
      entry.variableId = variableId;
    }

    // Add scopes if present
    if (obj.$extensions?.['com.figma.scopes']) {
      entry.scopes = obj.$extensions['com.figma.scopes'];
    }

    tokens.push(entry);
    return;
  }

  // Recurse into nested objects
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Skip $extensions at any level (already processed or not a token)
    if (key === '$extensions') {
      continue;
    }

    extractTokens(value, [...path, key], collection, mode, tokens);
  }
}

/**
 * Parse a single Figma native JSON export file
 *
 * @param json - The parsed JSON content from a Figma native export
 * @param options - Parsing options (collection name, mode override)
 * @returns Parsed tokens and metadata
 *
 * @example
 * ```typescript
 * import { readFile } from 'fs/promises';
 *
 * const json = JSON.parse(await readFile('theme.light.json', 'utf-8'));
 * const result = parseFigmaNativeExport(json, { collection: 'theme' });
 * // result.tokens: BaselineEntry[]
 * // result.modeName: 'light'
 * ```
 */
export function parseFigmaNativeExport(
  json: unknown,
  options: ParseFigmaNativeOptions = {}
): ParsedFigmaNativeFile {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid Figma native export: expected an object');
  }

  const root = json as Record<string, unknown>;

  // Extract mode name from root $extensions
  const rootExtensions = root.$extensions as FigmaNativeRootExtensions | undefined;
  const modeName = options.mode || rootExtensions?.['com.figma.modeName'] || 'default';
  const collectionName = options.collection || rootExtensions?.['com.figma.collectionName'];

  if (!collectionName) {
    throw new Error(
      'Collection name not found in file and not provided.\n' +
      'Use --collection=<name> to specify the collection name.'
    );
  }

  const tokens: BaselineEntry[] = [];

  // Extract all tokens from the JSON
  extractTokens(root, [], collectionName, modeName, tokens);

  return {
    tokens,
    modeName,
    collectionName,
  };
}

/**
 * Parse multiple Figma native JSON files into a unified baseline
 *
 * @param files - Array of { content, filename } objects
 * @param options - Parsing options
 * @returns Combined baseline entries keyed by variableId:collection.mode
 *
 * @example
 * ```typescript
 * const files = [
 *   { content: lightJson, filename: 'theme.light.json' },
 *   { content: darkJson, filename: 'theme.dark.json' },
 * ];
 * const baseline = parseFigmaNativeFiles(files, { collection: 'theme' });
 * ```
 */
export function parseFigmaNativeFiles(
  files: Array<{ content: unknown; filename: string }>,
  options: ParseFigmaNativeOptions = {}
): Record<string, BaselineEntry> {
  const baseline: Record<string, BaselineEntry> = {};

  for (const { content, filename } of files) {
    // Try to infer collection/mode from filename if not provided
    // Expected formats: "collection.mode.json" or "mode.tokens.json"
    const inferredOptions = { ...options };

    if (!inferredOptions.collection || !inferredOptions.mode) {
      const baseName = filename.replace(/\.json$/i, '').replace(/\.tokens$/i, '');
      const parts = baseName.split('.');

      if (parts.length >= 2 && !inferredOptions.collection) {
        // If filename is "theme.light.json", use "theme" as collection
        // But if it's "light.tokens.json", we can't infer collection
        inferredOptions.collection = inferredOptions.collection || options.collection;
      }

      // Last part before .json is likely the mode
      if (parts.length >= 1 && !inferredOptions.mode) {
        inferredOptions.mode = parts[parts.length - 1];
      }
    }

    const parsed = parseFigmaNativeExport(content, inferredOptions);

    for (const token of parsed.tokens) {
      // Create unique key matching our baseline format
      const key = token.variableId
        ? `${token.variableId}:${token.collection}.${token.mode}`
        : `${token.path}:${token.collection}.${token.mode}`;

      baseline[key] = token;
    }
  }

  return baseline;
}

/**
 * Detect if a JSON object is in Figma native export format
 */
export function isFigmaNativeFormat(json: unknown): boolean {
  if (!json || typeof json !== 'object') {
    return false;
  }

  const root = json as Record<string, unknown>;

  // Check for root $extensions with com.figma.modeName
  if (root.$extensions && typeof root.$extensions === 'object') {
    const ext = root.$extensions as Record<string, unknown>;
    if ('com.figma.modeName' in ext) {
      return true;
    }
  }

  // Check if any nested object has $type and $value with com.figma.variableId
  function hasToken(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;

    if (isToken(obj) && obj.$extensions?.['com.figma.variableId']) {
      return true;
    }

    for (const value of Object.values(obj as Record<string, unknown>)) {
      if (hasToken(value)) return true;
    }

    return false;
  }

  return hasToken(root);
}

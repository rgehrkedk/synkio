import { BaselineEntry, RawStyles, StyleBaselineEntry } from '../types/index.js';
import { SynkioPluginDataSchema, StyleEntry } from '../types/schemas.js';
import type { SplitBy } from './config.js';
import { setNestedPath } from './utils/index.js';
import {
  determineSplitStrategy,
  buildVariableIdLookup,
  resolveReference,
  isReference,
  buildTokenObject,
  generateFilename,
} from './tokens/index.js';

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
    file?: string;         // Custom filename base (e.g., "colors" -> "colors.json", or with modes: "theme" -> "theme.light.json")
    splitBy?: SplitBy;     // "mode" = separate files per mode, "group" = separate files per top-level group, "none" = single file
    includeMode?: boolean; // true = include mode as first-level key even when splitting (default: true)
    names?: Record<string, string>; // Rename modes or groups in output files (e.g., { "light": "day" } or { "colors": "palette" })
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
        collectionId: token.collectionId,
        modeId: token.modeId,
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

/**
 * Options for splitTokens function
 */
export interface SplitTokensOptions {
  collections?: CollectionSplitOptions;
  dtcg?: boolean;             // Use DTCG format with $value, $type (default: true)
  includeVariableId?: boolean; // Include Figma variableId in output (default: false)
  splitBy?: SplitBy;          // Default split strategy: "mode" (per mode), "group" (per top-level group), "none" (single file)
  includeMode?: boolean;      // Default for includeMode across all collections (default: false)
  extensions?: {
    description?: boolean;    // Include variable descriptions (default: false)
    scopes?: boolean;         // Include usage scopes (default: false)
    codeSyntax?: boolean;     // Include code syntax for platforms (default: false)
  };
}

/**
 * Splits the raw, flat token data into a map of file names to nested token objects.
 *
 * Use the `splitBy` option to control how tokens are organized into files:
 * - "mode": Separate files per mode (e.g., theme.light.json, theme.dark.json) - default
 * - "group": Separate files per top-level token group (e.g., color.json, spacing.json)
 * - "none": Single file per collection
 *
 * @param rawTokens - The flat token data from Figma
 * @param options - Optional configuration for splitting and output format
 * @returns Map of file names to their token content
 *
 * @example
 * // Default: split by mode with DTCG format
 * splitTokens(tokens) // -> theme.light.json, theme.dark.json
 *
 * // Split by top-level group (e.g., color, spacing)
 * splitTokens(tokens, { collections: { globals: { splitBy: 'group' } } }) // -> color.json, spacing.json
 *
 * // Single file per collection
 * splitTokens(tokens, { collections: { theme: { splitBy: 'none' } } }) // -> theme.json
 *
 * // Disable DTCG format (use "value" instead of "$value")
 * splitTokens(tokens, { dtcg: false })
 */
export function splitTokens(rawTokens: RawTokens, options: SplitTokensOptions = {}): SplitTokens {
  const files = new Map<string, { content: any; collection: string; group?: string }>();
  const collectionOptions = options.collections || {};
  const useDtcg = options.dtcg !== false; // default true
  const includeVariableId = options.includeVariableId === true; // default false
  const defaultSplitBy: SplitBy = options.splitBy ?? 'mode';
  const defaultIncludeMode = options.includeMode === true; // default false
  const extensions = options.extensions || {};

  // Build lookup map for resolving references
  const variableIdToPath = buildVariableIdLookup(rawTokens);

  // Process each token entry
  for (const entry of Object.values(rawTokens)) {
    const collection = entry.collection || entry.path.split('.')[0];
    const mode = entry.mode || entry.path.split('.')[1] || 'value';
    const pathParts = entry.path.split('.');
    const collectionConfig = collectionOptions[collection];

    // Determine split strategy
    const { fileKey, nestedPath, group } = determineSplitStrategy({
      collection,
      mode,
      pathParts,
      collectionConfig,
      defaultSplitBy,
      defaultIncludeMode,
    });

    // Initialize file if needed
    if (!files.has(fileKey)) {
      files.set(fileKey, { content: {}, collection, group });
    }

    const fileData = files.get(fileKey)!;

    // Determine DTCG type
    const dtcgType = mapToDTCGType(entry.type, entry.path);

    // Resolve value (handle references)
    let resolvedValue: unknown;
    if (isReference(entry.value)) {
      resolvedValue = resolveReference(entry.value, variableIdToPath, entry.path);
      // If still a reference (not resolved), keep as-is
      if (isReference(resolvedValue)) {
        resolvedValue = entry.value;
      }
    } else {
      resolvedValue = normalizeValue(entry.value, entry.type, entry.path, dtcgType);
    }

    // Build token object
    const tokenObj = buildTokenObject({
      value: resolvedValue,
      dtcgType,
      useDtcg,
      includeVariableId,
      extensions,
      entry,
    });

    // Create nested structure
    if (nestedPath.length > 0) {
      setNestedPath(fileData.content, nestedPath, tokenObj);
    } else {
      fileData.content[entry.path] = tokenObj;
    }
  }

  // Generate final result with filenames
  const result: SplitTokens = new Map();
  for (const [key, fileData] of files.entries()) {
    const collectionConfig = collectionOptions[fileData.collection];
    const splitBy: SplitBy = collectionConfig?.splitBy ?? defaultSplitBy;

    const fileName = generateFilename(
      key,
      fileData,
      collectionConfig,
      splitBy,
      defaultSplitBy
    );

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

// =============================================================================
// Style Normalization Functions (v3.0.0+)
// =============================================================================

/**
 * Normalize style data from plugin format to baseline format
 * @param rawData - Raw data from Figma plugin (must have styles array)
 * @returns Normalized styles as a flat map keyed by styleId:type
 */
export function normalizeStyleData(rawData: any): RawStyles {
  if (!rawData.styles || !Array.isArray(rawData.styles)) {
    return {};
  }

  const result: RawStyles = {};

  for (const style of rawData.styles as StyleEntry[]) {
    // Key format: {styleId}:{type}
    const key = `${style.styleId}:${style.type}`;

    const entry: StyleBaselineEntry = {
      styleId: style.styleId,
      type: style.type,
      path: style.path,
      value: style.value,
      description: style.description,
    };

    result[key] = entry;
  }

  return result;
}

/**
 * Check if plugin data contains styles (v3.0.0+ format)
 */
export function hasStyles(rawData: any): boolean {
  return Boolean(rawData.styles && Array.isArray(rawData.styles) && rawData.styles.length > 0);
}

/**
 * Get style count from raw plugin data
 */
export function getStyleCount(rawData: any): { paint: number; text: number; effect: number; total: number } {
  if (!rawData.styles || !Array.isArray(rawData.styles)) {
    return { paint: 0, text: 0, effect: 0, total: 0 };
  }

  const counts = { paint: 0, text: 0, effect: 0, total: 0 };

  for (const style of rawData.styles) {
    if (style.type === 'paint') counts.paint++;
    else if (style.type === 'text') counts.text++;
    else if (style.type === 'effect') counts.effect++;
    counts.total++;
  }

  return counts;
}

// =============================================================================
// Style Output Functions (v3.0.0+)
// =============================================================================

/**
 * Merge target for styles - specifies which collection/group to merge styles into
 */
export interface MergeInto {
  collection: string;  // Target collection name (e.g., "globals")
  group?: string;      // Target group within collection (e.g., "font") - used with splitBy: "group"
}

/**
 * Style type union - used across style-related interfaces
 */
export type StyleType = 'paint' | 'text' | 'effect';

/**
 * The result of splitting styles, a map of file names to their content and metadata.
 */
export interface SplitStyleFile {
  content: any;
  styleType: StyleType;
  dir?: string;       // Custom output directory for this file (relative to cwd)
  mergeInto?: MergeInto;  // If set, merge into this collection/group instead of standalone file
}

export type SplitStyles = Map<string, SplitStyleFile>;

/**
 * Configuration for style type output
 */
export interface StyleTypeConfig {
  enabled?: boolean;      // Whether this style type is enabled (default: true)
  dir?: string;           // Output directory (defaults to parent tokens.dir)
  file?: string;          // Custom filename (without extension)
  mergeInto?: MergeInto;  // Merge styles into a variable collection file instead of separate file
}

/**
 * Configuration for how to split styles
 */
export interface StylesSplitOptions {
  enabled?: boolean;           // Master toggle for styles (default: true)
  paint?: StyleTypeConfig;     // Paint styles config
  text?: StyleTypeConfig;      // Text styles config
  effect?: StyleTypeConfig;    // Effect styles config
}

/**
 * Default filenames for each style type
 */
const DEFAULT_STYLE_FILENAMES: Record<StyleType, string> = {
  paint: 'paint-styles',
  text: 'text-styles',
  effect: 'effect-styles',
};

/**
 * Splits normalized style data into a map of file names to nested style objects.
 * Groups styles by type (paint, text, effect) and outputs in DTCG format.
 *
 * @param rawStyles - Normalized style data from normalizeStyleData()
 * @param options - Configuration for splitting and output
 * @returns Map of file names to their style content
 *
 * @example
 * // Default: one file per style type
 * splitStyles(styles) // -> paint-styles.json, text-styles.json, effect-styles.json
 *
 * // Custom filenames
 * splitStyles(styles, { paint: { file: 'colors' } }) // -> colors.json
 */
export function splitStyles(rawStyles: RawStyles, options: StylesSplitOptions = {}): SplitStyles {
  const result: SplitStyles = new Map();

  // Master toggle
  if (options.enabled === false) {
    return result;
  }

  // Group styles by type
  const stylesByType: Record<StyleType, StyleBaselineEntry[]> = {
    paint: [],
    text: [],
    effect: [],
  };

  for (const entry of Object.values(rawStyles)) {
    stylesByType[entry.type]?.push(entry);
  }

  // Process each style type
  for (const styleType of ['paint', 'text', 'effect'] as const) {
    const styles = stylesByType[styleType];
    const typeConfig = options[styleType];

    // Skip if no styles of this type
    if (styles.length === 0) {
      continue;
    }

    // Skip if explicitly disabled
    if (typeConfig?.enabled === false) {
      continue;
    }

    // Build nested content from styles
    const content: any = {};

    for (const style of styles) {
      // Use the path to create nested structure
      const pathParts = style.path.split('.');

      // The value is already in DTCG format from the plugin
      // Just nest it at the correct path
      setNestedPath(content, pathParts, style.value);
    }

    // Determine filename
    const filename = typeConfig?.file
      ? `${typeConfig.file}.json`
      : `${DEFAULT_STYLE_FILENAMES[styleType]}.json`;

    result.set(filename, {
      content,
      styleType,
      dir: typeConfig?.dir,
      mergeInto: typeConfig?.mergeInto,
    });
  }

  return result;
}

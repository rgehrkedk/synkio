/**
 * Baseline Builder Module
 *
 * Builds the export baseline structure from parsed tokens.
 * Handles both code-first (no IDs) and roundtrip (with IDs) scenarios.
 */

import type { ParsedToken } from './token-parser.js';
import type { DiscoveredFile } from './file-discoverer.js';

/**
 * Baseline entry structure (matches sync baseline format)
 */
export interface BaselineEntry {
  /** Figma variable ID (optional - only in roundtrip) */
  variableId?: string;
  /** Figma collection ID (optional - only in roundtrip) */
  collectionId?: string;
  /** Figma mode ID (optional - only in roundtrip) */
  modeId?: string;
  /** Collection name */
  collection: string;
  /** Mode name */
  mode: string;
  /** Token path (dot-separated) */
  path: string;
  /** Token value */
  value: unknown;
  /** DTCG token type */
  type: string;
  /** Optional description */
  description?: string;
  /** Optional scopes */
  scopes?: string[];
  /** Optional code syntax */
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

/**
 * Style baseline entry structure (matches sync baseline styles format)
 */
export interface StyleBaselineEntry {
  /** Figma style ID */
  styleId: string;
  /** Style type (paint, text, effect) */
  type: 'paint' | 'text' | 'effect';
  /** Style path (dot-separated) */
  path: string;
  /** Style value in DTCG format ($type/$value) */
  value: {
    $type: string;
    $value: unknown;
  };
  /** Optional description */
  description?: string;
}

/**
 * Export baseline structure (matches baseline.json format)
 */
export interface ExportBaseline {
  /** Baseline entries keyed by composite key */
  baseline: Record<string, BaselineEntry>;
  /** Style entries keyed by styleId:type */
  styles: Record<string, StyleBaselineEntry>;
  /** Metadata about the export */
  metadata: {
    /** ISO timestamp of export */
    syncedAt: string;
    /** Source type (always 'export' for this flow) */
    source: 'export';
  };
}

/**
 * Style types that should be placed in the styles section
 */
const STYLE_TYPES = new Set(['gradient', 'shadow', 'blur', 'typography']);

/**
 * Check if a token is a style token (should go in styles section)
 */
export function isStyleToken(token: ParsedToken): boolean {
  return STYLE_TYPES.has(token.type);
}

/**
 * Map DTCG token type to Figma style type
 */
export function mapToFigmaStyleType(dtcgType: string): 'paint' | 'effect' | 'text' {
  switch (dtcgType) {
    case 'gradient':
      return 'paint';
    case 'shadow':
    case 'blur':
      return 'effect';
    case 'typography':
      return 'text';
    default:
      throw new Error(`Unknown style type: ${dtcgType}`);
  }
}

/**
 * Build baseline key for a token
 *
 * With variableId:    "VariableID:1:31:theme.light"
 * Without variableId: "colors.primary:theme.light"
 *
 * @param token - Parsed token
 * @param collection - Collection name
 * @param mode - Mode name
 * @returns Baseline key string
 */
export function buildBaselineKey(
  token: ParsedToken,
  collection: string,
  mode: string
): string {
  const suffix = `${collection}.${mode}`;

  if (token.variableId) {
    return `${token.variableId}:${suffix}`;
  }

  return `${token.path}:${suffix}`;
}

/**
 * Normalize token value for Figma import
 *
 * Figma expects:
 * - Dimension values as raw numbers (no units): 16 instead of "16px"
 * - Color values as hex strings: "#FF0000"
 * - Number values as numbers: 400, 1.5
 *
 * This is ONLY used for export-baseline (code → Figma flow).
 * The sync pipeline (Figma → code) does the opposite transformation.
 *
 * @param value - Token value from DTCG file
 * @param type - DTCG token type
 * @returns Normalized value for Figma
 */
function normalizeFigmaValue(value: unknown, type: string): unknown {
  // Strip units from dimension values (e.g., "16px" → 16, "1.5rem" → 1.5)
  if (type === 'dimension' && typeof value === 'string') {
    const match = value.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%)?$/);
    if (match) {
      return Number.parseFloat(match[1]);
    }
  }

  return value;
}

/**
 * Build baseline entry from parsed token
 *
 * @param token - Parsed token
 * @param collection - Collection name
 * @param mode - Mode name
 * @returns Baseline entry
 */
export function buildBaselineEntry(
  token: ParsedToken,
  collection: string,
  mode: string
): BaselineEntry {
  const entry: BaselineEntry = {
    collection,
    mode,
    path: token.path,
    value: normalizeFigmaValue(token.value, token.type),
    type: token.type,
  };

  // Include IDs if present (roundtrip scenario)
  if (token.variableId) {
    entry.variableId = token.variableId;
  }

  // Include optional metadata
  if (token.description) {
    entry.description = token.description;
  }
  if (token.scopes && token.scopes.length > 0) {
    entry.scopes = token.scopes;
  }

  return entry;
}

/**
 * Style configuration for a style type (paint, text, effect)
 */
export interface StyleTypeConfig {
  /** Merge styles into a variable collection instead of separate file */
  mergeInto?: {
    collection: string;
    group?: string;
  };
  /** Output directory */
  dir?: string;
  /** Output file name */
  file?: string;
}

/**
 * Styles configuration
 */
export interface StylesConfig {
  paint?: StyleTypeConfig;
  text?: StyleTypeConfig;
  effect?: StyleTypeConfig;
}

/**
 * Options for building export baseline
 */
export interface BuildExportBaselineOptions {
  /** Style configuration from synkio.config.json */
  stylesConfig?: StylesConfig;
  /** Style lookup function to get styleId from existing baseline */
  getStyleId?: (path: string, figmaType: 'paint' | 'text' | 'effect') => string | undefined;
  /** Variable lookup function to get full metadata from existing baseline */
  getVariableMetadata?: (path: string, collection: string, mode: string) => {
    variableId?: string;
    collectionId?: string;
    modeId?: string;
    scopes?: string[];
    codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
  } | undefined;
}

/**
 * Get the merge group prefix for a style type from config
 */
function getMergeGroupPrefix(dtcgType: string, stylesConfig?: StylesConfig): string | undefined {
  if (!stylesConfig) return undefined;

  const figmaType = mapToFigmaStyleType(dtcgType);
  const typeConfig = stylesConfig[figmaType];

  return typeConfig?.mergeInto?.group;
}

/**
 * Get the standalone file name for a style type from config
 * When styles have a `file` config but no `mergeInto`, they're in a standalone file
 */
function getStandaloneFileName(dtcgType: string, stylesConfig?: StylesConfig): string | undefined {
  if (!stylesConfig) return undefined;

  const figmaType = mapToFigmaStyleType(dtcgType);
  const typeConfig = stylesConfig[figmaType];

  // If style has mergeInto, it's not standalone
  if (typeConfig?.mergeInto) return undefined;

  // Return the file name without extension
  return typeConfig?.file;
}

/**
 * Strip merge group prefix from style path
 *
 * For styles with mergeInto: strip the merge group prefix
 * For standalone styles with file config: the path already starts with the file name,
 * but when parsing from collection with splitBy: "group", we may have added a duplicate prefix
 *
 * When styles are merged into a collection with a group (e.g., mergeInto.group: "font"),
 * the sync writes them INTO that group in the file. So the file structure has the group
 * as a top-level key (e.g., { "font": { "Body 1": {...} } }).
 * When reading back:
 * 1. We parse the file and get path: "font.Body 1.Light"
 * 2. We add filename group prefix: "font.font.Body 1.Light"
 * 3. We need to strip both "font." prefixes to get the original path
 */
export function stripMergeGroupPrefix(path: string, dtcgType: string, stylesConfig?: StylesConfig): string {
  // Check for merge group prefix
  const groupPrefix = getMergeGroupPrefix(dtcgType, stylesConfig);
  if (groupPrefix) {
    const prefix = groupPrefix + '.';
    const doublePrefix = groupPrefix + '.' + groupPrefix + '.';

    // Handle double prefix case (from filename + file structure)
    // e.g., "font.font.Body 1.Light" -> "Body 1.Light"
    if (path.startsWith(doublePrefix)) {
      return path.slice(doublePrefix.length);
    }

    // Handle single prefix case
    if (path.startsWith(prefix)) {
      return path.slice(prefix.length);
    }
  }

  // For standalone style files, check if path has a duplicate prefix
  // e.g., "effects.effects.blur.xs" -> "effects.blur.xs"
  const standaloneFile = getStandaloneFileName(dtcgType, stylesConfig);
  if (standaloneFile) {
    const doublePrefix = standaloneFile + '.' + standaloneFile + '.';
    if (path.startsWith(doublePrefix)) {
      // Strip one level of the duplicate prefix
      return path.slice((standaloneFile + '.').length);
    }
  }

  return path;
}

/**
 * Build style key for a style token
 * Format: "styleId:type" or "path:type" if no styleId
 */
export function buildStyleKey(styleId: string | undefined, path: string, figmaType: 'paint' | 'text' | 'effect'): string {
  if (styleId) {
    return `${styleId}:${figmaType}`;
  }
  // Fallback: use path as key (for new styles not yet in Figma)
  return `${path}:${figmaType}`;
}

/**
 * Build style baseline entry from parsed token
 */
export function buildStyleBaselineEntry(
  token: ParsedToken,
  strippedPath: string,
  figmaType: 'paint' | 'text' | 'effect',
  styleId: string
): StyleBaselineEntry {
  const entry: StyleBaselineEntry = {
    styleId,
    type: figmaType,
    path: strippedPath,
    value: {
      $type: token.type,
      $value: token.value,
    },
  };

  if (token.description) {
    entry.description = token.description;
  }

  return entry;
}

/**
 * Build complete export baseline from all parsed files
 *
 * @param parsedFiles - Array of parsed file results
 * @param options - Build options including style configuration
 * @returns Complete export baseline
 * @throws Error if duplicate tokens are found
 */
export function buildExportBaseline(
  parsedFiles: Array<{
    file: DiscoveredFile;
    tokens: ParsedToken[];
    mode: string;
  }>,
  options: BuildExportBaselineOptions = {}
): ExportBaseline {
  const baseline: Record<string, BaselineEntry> = {};
  const styles: Record<string, StyleBaselineEntry> = {};

  for (const { file, tokens, mode } of parsedFiles) {
    for (const token of tokens) {
      // Check if this is a style token
      if (isStyleToken(token)) {
        const figmaType = mapToFigmaStyleType(token.type);
        const strippedPath = stripMergeGroupPrefix(token.path, token.type, options.stylesConfig);

        // Get styleId from lookup function if available
        const styleId = options.getStyleId?.(strippedPath, figmaType) || '';

        // Build style key and entry
        const key = buildStyleKey(styleId, strippedPath, figmaType);

        // Skip duplicates for styles (first mode wins)
        if (styles[key]) {
          continue;
        }

        const entry = buildStyleBaselineEntry(token, strippedPath, figmaType, styleId);
        styles[key] = entry;
      } else {
        // Regular variable token
        const key = buildBaselineKey(token, file.collection, mode);

        // Check for duplicates
        if (baseline[key]) {
          throw new Error(
            `Duplicate token: "${token.path}" in collection "${file.collection}" mode "${mode}"`
          );
        }

        const entry = buildBaselineEntry(token, file.collection, mode);

        // Enrich with metadata from existing baseline if available
        if (options.getVariableMetadata) {
          const metadata = options.getVariableMetadata(token.path, file.collection, mode);
          if (metadata) {
            if (metadata.variableId && !entry.variableId) {
              entry.variableId = metadata.variableId;
            }
            if (metadata.collectionId) {
              entry.collectionId = metadata.collectionId;
            }
            if (metadata.modeId) {
              entry.modeId = metadata.modeId;
            }
            if (metadata.scopes) {
              entry.scopes = metadata.scopes;
            }
            if (metadata.codeSyntax) {
              entry.codeSyntax = metadata.codeSyntax;
            }
          }
        }

        baseline[key] = entry;
      }
    }
  }

  return {
    baseline,
    styles,
    metadata: {
      syncedAt: new Date().toISOString(),
      source: 'export',
    },
  };
}

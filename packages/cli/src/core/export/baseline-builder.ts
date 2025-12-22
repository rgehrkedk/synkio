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
}

/**
 * Export baseline structure (matches baseline.json format)
 */
export interface ExportBaseline {
  /** Baseline entries keyed by composite key */
  baseline: Record<string, BaselineEntry>;
  /** Metadata about the export */
  metadata: {
    /** ISO timestamp of export */
    syncedAt: string;
    /** Source type (always 'export' for this flow) */
    source: 'export';
  };
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
 * Build complete export baseline from all parsed files
 *
 * @param parsedFiles - Array of parsed file results
 * @returns Complete export baseline
 * @throws Error if duplicate tokens are found
 */
export function buildExportBaseline(
  parsedFiles: Array<{
    file: DiscoveredFile;
    tokens: ParsedToken[];
    mode: string;
  }>
): ExportBaseline {
  const baseline: Record<string, BaselineEntry> = {};

  for (const { file, tokens, mode } of parsedFiles) {
    for (const token of tokens) {
      const key = buildBaselineKey(token, file.collection, mode);
      const entry = buildBaselineEntry(token, file.collection, mode);

      // Check for duplicates
      if (baseline[key]) {
        throw new Error(
          `Duplicate token: "${token.path}" in collection "${file.collection}" mode "${mode}"`
        );
      }

      baseline[key] = entry;
    }
  }

  return {
    baseline,
    metadata: {
      syncedAt: new Date().toISOString(),
      source: 'export',
    },
  };
}

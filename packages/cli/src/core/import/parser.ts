/**
 * Parser Module
 *
 * Parses import files and builds baseline from them.
 */

import { parseFigmaNativeFiles } from '../figma-native.js';
import type { BaselineData, BaselineEntry } from '../../types/index.js';
import type { ImportFile } from './source-resolver.js';

/**
 * Options for parsing import files
 */
export interface ParseOptions {
  /** Mode name override (uses file's modeName if not specified) */
  mode?: string;
}

/**
 * Result of parsing import files
 */
export interface ParseResult {
  /** Parsed baseline entries */
  baseline: Record<string, BaselineEntry>;
  /** Number of token entries */
  tokenCount: number;
  /** Unique collection names found */
  collections: Set<string>;
  /** Unique mode names found */
  modes: Set<string>;
}

/**
 * Group import files by collection
 *
 * @param files - Array of import files
 * @returns Map of collection name to files
 */
export function groupFilesByCollection(
  files: ImportFile[]
): Map<string, Array<{ content: unknown; filename: string }>> {
  const filesByCollection = new Map<string, Array<{ content: unknown; filename: string }>>();

  for (const { content, filename, collection } of files) {
    if (!filesByCollection.has(collection)) {
      filesByCollection.set(collection, []);
    }
    filesByCollection.get(collection)!.push({ content, filename });
  }

  return filesByCollection;
}

/**
 * Parse import files into baseline entries
 *
 * @param files - Array of import files with collection assignments
 * @param options - Parsing options (mode override)
 * @returns Parsed baseline with metadata
 *
 * @example
 * ```typescript
 * const files = [
 *   { content: lightJson, filename: 'light.json', collection: 'theme' },
 *   { content: darkJson, filename: 'dark.json', collection: 'theme' },
 * ];
 *
 * const result = parseImportFiles(files);
 * // result.baseline: Record<string, BaselineEntry>
 * // result.tokenCount: 42
 * // result.collections: Set { 'theme' }
 * // result.modes: Set { 'light', 'dark' }
 * ```
 */
export function parseImportFiles(
  files: ImportFile[],
  options: ParseOptions = {}
): ParseResult {
  let baseline: Record<string, BaselineEntry> = {};

  // Group files by collection for parsing
  const filesByCollection = groupFilesByCollection(files);

  // Parse each collection's files
  for (const [collectionName, collectionFiles] of filesByCollection) {
    const collectionBaseline = parseFigmaNativeFiles(collectionFiles, {
      collection: collectionName,
      mode: options.mode,
    });
    baseline = { ...baseline, ...collectionBaseline };
  }

  // Extract metadata from parsed baseline
  const collections = new Set<string>();
  const modes = new Set<string>();

  for (const entry of Object.values(baseline)) {
    collections.add(entry.collection);
    modes.add(entry.mode);
  }

  return {
    baseline,
    tokenCount: Object.keys(baseline).length,
    collections,
    modes,
  };
}

/**
 * Build complete BaselineData from parsed baseline entries
 *
 * @param baseline - Parsed baseline entries
 * @returns Complete BaselineData structure for storage
 *
 * @example
 * ```typescript
 * const { baseline } = parseImportFiles(files);
 * const baselineData = buildBaselineData(baseline);
 * await writeBaseline(baselineData);
 * ```
 */
export function buildBaselineData(
  baseline: Record<string, BaselineEntry>
): BaselineData {
  return {
    baseline,
    metadata: {
      syncedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get summary info from baseline for display
 *
 * @param baseline - Baseline entries
 * @returns Collection and mode counts
 */
export function getBaselineSummary(
  baseline: Record<string, BaselineEntry>
): { collections: string[]; modes: string[] } {
  const collections = new Set<string>();
  const modes = new Set<string>();

  for (const entry of Object.values(baseline)) {
    collections.add(entry.collection);
    modes.add(entry.mode);
  }

  return {
    collections: Array.from(collections),
    modes: Array.from(modes),
  };
}

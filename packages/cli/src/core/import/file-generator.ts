/**
 * File Generator Module
 *
 * Handles output file generation for import command.
 * Generates token files, CSS, and documentation.
 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { splitTokens, type SplitTokensOptions } from '../tokens.js';
import { writeTokenFiles } from '../sync/file-writer.js';
import {
  generateIntermediateFromBaseline,
  generateDocsFromBaseline,
  generateCssFromBaseline,
} from '../output.js';
import type { BaselineData, BaselineEntry } from '../../types/index.js';
import type { Config } from '../config.js';

/**
 * Result of file generation
 */
export interface GenerateFilesResult {
  /** Number of token files written */
  filesWritten: number;
  /** Number of CSS files written */
  cssFilesWritten: number;
  /** Number of docs files written */
  docsFilesWritten: number;
  /** Output directory path */
  outDir: string;
}

/**
 * Build split options from config
 *
 * @param config - Synkio config
 * @returns Options for splitTokens function
 */
export function buildSplitOptions(config: Config): SplitTokensOptions {
  return {
    collections: config.tokens.collections || {},
    dtcg: config.tokens.dtcg !== false,
    includeVariableId: config.tokens.includeVariableId === true,
    splitBy: config.tokens.splitBy,
    includeMode: config.tokens.includeMode,
    extensions: config.tokens.extensions || {},
  };
}

/**
 * Build filesByDir map from processed tokens
 *
 * @param processedTokens - Map of filename to file data from splitTokens
 * @param defaultOutDir - Default output directory
 * @returns Map of directory to Map of filename to content
 */
export function buildFilesByDirectory(
  processedTokens: Map<string, { content: any; dir?: string }>,
  defaultOutDir: string
): Map<string, Map<string, any>> {
  const filesByDir = new Map<string, Map<string, any>>();

  for (const [fileName, fileData] of processedTokens) {
    const outDir = fileData.dir
      ? resolve(process.cwd(), fileData.dir)
      : defaultOutDir;

    if (!filesByDir.has(outDir)) {
      filesByDir.set(outDir, new Map());
    }
    filesByDir.get(outDir)!.set(fileName, fileData.content);
  }

  return filesByDir;
}

/**
 * Format extras string for success message
 *
 * @param cssFilesWritten - Number of CSS files written
 * @param docsFilesWritten - Number of docs files written
 * @returns Formatted extras string like "(+ 2 CSS, docs)"
 */
export function formatExtrasString(
  cssFilesWritten: number,
  docsFilesWritten: number
): string {
  const extras: string[] = [];
  if (cssFilesWritten > 0) extras.push(`${cssFilesWritten} CSS`);
  if (docsFilesWritten > 0) extras.push('docs');
  return extras.length > 0 ? ` (+ ${extras.join(', ')})` : '';
}

/**
 * Generate all output files from baseline
 *
 * Handles:
 * - Token files (JSON in DTCG format)
 * - Intermediate format (for docs and other tools)
 * - CSS files (if enabled in config)
 * - Documentation files (if enabled in config)
 *
 * @param baseline - Baseline entries to process
 * @param newBaseline - Full BaselineData with metadata
 * @param config - Synkio config
 * @returns Generation result with file counts
 */
export async function generateOutputFiles(
  baseline: Record<string, BaselineEntry>,
  newBaseline: BaselineData,
  config: Config
): Promise<GenerateFilesResult> {
  // Split tokens using config structure
  const splitOptions = buildSplitOptions(config);
  const processedTokens = splitTokens(baseline, splitOptions);

  // Build filesByDir map
  const defaultOutDir = resolve(process.cwd(), config.tokens.dir);
  await mkdir(defaultOutDir, { recursive: true });
  const filesByDir = buildFilesByDirectory(processedTokens, defaultOutDir);

  // Write token files
  const filesWritten = await writeTokenFiles(filesByDir);

  // Always generate intermediate format (used by docs and other tools)
  await generateIntermediateFromBaseline(newBaseline, config);

  // Generate CSS if enabled
  let cssFilesWritten = 0;
  if (config.build?.css?.enabled) {
    const cssResult = await generateCssFromBaseline(newBaseline, config);
    cssFilesWritten = cssResult.files.length;
  }

  // Generate docs if enabled
  let docsFilesWritten = 0;
  if (config.docsPages?.enabled) {
    const docsResult = await generateDocsFromBaseline(newBaseline, config);
    docsFilesWritten = docsResult.files.length;
  }

  return {
    filesWritten,
    cssFilesWritten,
    docsFilesWritten,
    outDir: config.tokens.dir,
  };
}

/**
 * Regenerate Module
 *
 * Handles regenerating token and style files from an existing baseline.
 * Used when --regenerate flag is passed to skip Figma fetch.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BaselineData } from '../../types/index.js';
import { splitTokens, splitStyles } from '../tokens.js';
import type { SplitTokensOptions, StylesSplitOptions } from '../tokens.js';
import { generateIntermediateFromBaseline, generateDocsFromBaseline } from '../output.js';
import { mergeStylesIntoTokens } from './style-merger.js';

/**
 * Options for regeneration
 */
export interface RegenerateOptions {
  defaultOutDir: string;
}

/**
 * Result of regeneration
 */
export interface RegenerateResult {
  filesWritten: number;
  styleFilesWritten: number;
  docsFilesWritten: number;
  filesByDir: Map<string, Map<string, any>>;
}

/**
 * Build a map of files organized by output directory
 *
 * @param processedTokens - Map of filename to file data from splitTokens
 * @param defaultOutDir - Default output directory (resolved path)
 * @returns Map of directory path to Map of filename to content
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
 * Write all token files from filesByDir map
 *
 * @param filesByDir - Map of directory to Map of filename to content
 * @returns Number of files written
 */
async function writeTokenFiles(filesByDir: Map<string, Map<string, any>>): Promise<number> {
  let filesWritten = 0;

  for (const [outDir, filesInDir] of filesByDir) {
    await mkdir(outDir, { recursive: true });
    for (const [fileName, content] of filesInDir) {
      const filePath = resolve(outDir, fileName);
      await writeFile(filePath, JSON.stringify(content, null, 2));
      filesWritten++;
    }
  }

  return filesWritten;
}

/**
 * Write standalone style files that could not be merged
 *
 * @param standaloneStyleFiles - Array of standalone style files to write
 * @param defaultOutDir - Default output directory
 * @returns Number of style files written
 */
async function writeStandaloneStyleFiles(
  standaloneStyleFiles: Array<{ fileName: string; content: any; dir?: string }>,
  defaultOutDir: string
): Promise<number> {
  let styleFilesWritten = 0;

  for (const { fileName, content, dir } of standaloneStyleFiles) {
    const outDir = dir
      ? resolve(process.cwd(), dir)
      : defaultOutDir;

    await mkdir(outDir, { recursive: true });
    const filePath = resolve(outDir, fileName);
    await writeFile(filePath, JSON.stringify(content, null, 2));
    styleFilesWritten++;
  }

  return styleFilesWritten;
}

/**
 * Regenerate token and style files from an existing baseline
 *
 * This is used when --regenerate is passed to skip Figma fetch
 * and just regenerate output files using the current config.
 *
 * @param baseline - The existing baseline data
 * @param config - The loaded configuration
 * @param options - Regeneration options
 * @returns Result containing file counts
 */
export async function regenerateFromBaseline(
  baseline: BaselineData,
  config: any,
  options: RegenerateOptions
): Promise<RegenerateResult> {
  const { defaultOutDir } = options;
  const normalizedTokens = baseline.baseline;

  // Split tokens using config structure
  const splitOptions: SplitTokensOptions = {
    collections: config.tokens.collections || {},
    dtcg: config.tokens.dtcg !== false,
    includeVariableId: config.tokens.includeVariableId === true,
    splitBy: config.tokens.splitBy,
    includeMode: config.tokens.includeMode,
    extensions: config.tokens.extensions || {},
  };
  const processedTokens = splitTokens(normalizedTokens, splitOptions);

  // Build map of files per directory
  const filesByDir = buildFilesByDirectory(processedTokens, defaultOutDir);

  // Process style files (may merge into token files)
  let styleFilesWritten = 0;
  const standaloneStyleFiles: Array<{ fileName: string; content: any; dir?: string }> = [];

  if (baseline.styles && Object.keys(baseline.styles).length > 0) {
    const stylesConfig = config.tokens.styles;

    if (stylesConfig?.enabled !== false) {
      const styleSplitOptions: StylesSplitOptions = {
        enabled: stylesConfig?.enabled,
        paint: stylesConfig?.paint,
        text: stylesConfig?.text,
        effect: stylesConfig?.effect,
      };

      const processedStyles = splitStyles(baseline.styles, styleSplitOptions);

      // Use the consolidated style merger
      const mergeResult = mergeStylesIntoTokens(processedStyles, filesByDir, config, defaultOutDir);
      standaloneStyleFiles.push(...mergeResult.standaloneStyleFiles);
    }
  }

  // Write all token files (with merged styles if applicable)
  const filesWritten = await writeTokenFiles(filesByDir);

  // Write standalone style files
  styleFilesWritten = await writeStandaloneStyleFiles(standaloneStyleFiles, defaultOutDir);

  // Always generate intermediate format (used by docs and other tools)
  await generateIntermediateFromBaseline(baseline, config);

  // Generate docs if enabled
  let docsFilesWritten = 0;
  if (config.docsPages?.enabled) {
    const docsResult = await generateDocsFromBaseline(baseline, config);
    docsFilesWritten = docsResult.files.length;
  }

  return {
    filesWritten,
    styleFilesWritten,
    docsFilesWritten,
    filesByDir,
  };
}

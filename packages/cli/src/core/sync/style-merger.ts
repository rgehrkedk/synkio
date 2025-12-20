/**
 * Style Merger Module
 *
 * Consolidates the duplicated style merging logic from sync.ts.
 * This module handles merging style files into token files based on
 * the mergeInto configuration.
 *
 * Previously this logic was duplicated:
 * - Regenerate flow: sync.ts lines 247-350
 * - Main sync flow: sync.ts lines 739-847
 *
 * This consolidation saves ~150 LOC and ensures consistent behavior.
 */

import { resolve } from 'node:path';
import { deepMerge } from '../utils/index.js';
import type { SplitStyles, MergeInto } from '../tokens.js';

/**
 * Result of merging styles into tokens
 */
export interface MergeResult {
  /** Style files that could not be merged and need to be written standalone */
  standaloneStyleFiles: Array<{ fileName: string; content: any; dir?: string }>;
  /** Number of successful merges */
  mergedCount: number;
}

/**
 * Standalone style file to be written
 */
export interface StandaloneStyleFile {
  fileName: string;
  content: any;
  dir?: string;
}

/**
 * Collection configuration subset used for style merging
 */
interface CollectionConfig {
  splitBy?: 'mode' | 'group' | 'none';
  file?: string;
  dir?: string;
  names?: Record<string, string>;
}

/**
 * Determine the target filename for merging styles based on splitBy strategy
 *
 * @param mergeInto - The merge target configuration
 * @param collectionConfig - Configuration for the target collection
 * @param splitBy - The split strategy in effect
 * @param namesMapping - Names mapping for renaming groups/modes
 * @param targetDir - The target directory path
 * @returns Target filename, or null if mode-splitting (handled separately)
 */
export function determineTargetFile(
  mergeInto: MergeInto,
  collectionConfig: CollectionConfig | undefined,
  splitBy: 'mode' | 'group' | 'none',
  namesMapping: Record<string, string>,
  targetDir: string
): string | null {
  const { collection, group } = mergeInto;

  if (splitBy === 'group') {
    // For group splitting, use the group name if specified (with names mapping)
    const targetGroup = group || collection;
    const mappedGroup = namesMapping[targetGroup] || targetGroup;
    return `${mappedGroup}.json`;
  }

  if (splitBy === 'none') {
    // Single file per collection
    const fileBase = collectionConfig?.file || collection;
    return `${fileBase}.json`;
  }

  // For mode splitting, return null - handled by mergeIntoModeFiles
  return null;
}

/**
 * Merge style content into all mode files for a collection
 *
 * @param filesByDir - Map of directory to files
 * @param targetDir - Directory containing the mode files
 * @param collectionPrefix - Prefix for matching collection files
 * @param content - Style content to merge
 * @param group - Optional group path to merge into
 * @returns Number of files merged into
 */
function mergeIntoModeFiles(
  filesByDir: Map<string, Map<string, any>>,
  targetDir: string,
  collectionPrefix: string,
  content: any,
  group?: string
): number {
  let mergedCount = 0;
  const filesInTargetDir = filesByDir.get(targetDir);

  if (!filesInTargetDir) {
    return mergedCount;
  }

  for (const [existingFileName, existingContent] of filesInTargetDir) {
    // Match files like "theme.light.json", "theme.dark.json"
    if (existingFileName.startsWith(`${collectionPrefix}.`) && existingFileName.endsWith('.json')) {
      if (group) {
        // Merge into the specified group path
        if (!existingContent[group]) {
          existingContent[group] = {};
        }
        deepMerge(existingContent[group], content);
      } else {
        deepMerge(existingContent, content);
      }
      mergedCount++;
    }
  }

  return mergedCount;
}

/**
 * Merge style content into a single target file
 *
 * @param filesByDir - Map of directory to files
 * @param targetDir - Directory containing the target file
 * @param targetFileName - Name of the target file
 * @param content - Style content to merge
 * @param group - Optional group path to merge into
 * @returns true if merge was successful, false if target not found
 */
function mergeIntoSingleFile(
  filesByDir: Map<string, Map<string, any>>,
  targetDir: string,
  targetFileName: string,
  content: any,
  group?: string
): boolean {
  const filesInTargetDir = filesByDir.get(targetDir);

  if (!filesInTargetDir?.has(targetFileName)) {
    return false;
  }

  const targetContent = filesInTargetDir.get(targetFileName);

  if (group) {
    // Merge into the specified group path within the file
    if (!targetContent[group]) {
      targetContent[group] = {};
    }
    deepMerge(targetContent[group], content);
  } else {
    // Merge at root level
    deepMerge(targetContent, content);
  }

  return true;
}

/**
 * Merge processed styles into token files based on mergeInto configuration
 *
 * This is the consolidated logic that was previously duplicated in sync.ts.
 * It handles:
 * - Mode splitting: Merges into all mode files (theme.light.json, theme.dark.json)
 * - Group splitting: Merges into the specific group file
 * - None splitting: Merges into the single collection file
 * - Standalone fallback: Queues files that cannot be merged
 *
 * @param processedStyles - Map of style files from splitStyles()
 * @param filesByDir - Map of directory to Map of filename to content (mutated)
 * @param config - The loaded configuration
 * @param defaultOutDir - Default output directory (resolved path)
 * @returns MergeResult with standalone files and merge count
 */
export function mergeStylesIntoTokens(
  processedStyles: SplitStyles,
  filesByDir: Map<string, Map<string, any>>,
  config: any,
  defaultOutDir: string
): MergeResult {
  const standaloneStyleFiles: StandaloneStyleFile[] = [];
  let mergedCount = 0;

  for (const [fileName, fileData] of processedStyles) {
    if (!fileData.mergeInto) {
      // No mergeInto - queue as standalone style file
      standaloneStyleFiles.push({
        fileName,
        content: fileData.content,
        dir: fileData.dir,
      });
      continue;
    }

    const { collection, group } = fileData.mergeInto;
    const collectionConfig: CollectionConfig | undefined = config.tokens.collections?.[collection];
    const splitBy = collectionConfig?.splitBy ?? config.tokens.splitBy ?? 'mode';
    const namesMapping = collectionConfig?.names || {};

    // Determine target directory
    const targetDir = collectionConfig?.dir
      ? resolve(process.cwd(), collectionConfig.dir)
      : defaultOutDir;

    // Handle mode splitting - merge into ALL mode files
    if (splitBy === 'mode') {
      const collectionPrefix = collectionConfig?.file || collection;
      const count = mergeIntoModeFiles(filesByDir, targetDir, collectionPrefix, fileData.content, group);

      if (count > 0) {
        mergedCount += count;
      } else {
        // No mode files found - queue as standalone
        standaloneStyleFiles.push({
          fileName,
          content: fileData.content,
          dir: fileData.dir,
        });
      }
      continue;
    }

    // Handle group and none splitting - single target file
    const targetFileName = determineTargetFile(
      fileData.mergeInto,
      collectionConfig,
      splitBy,
      namesMapping,
      targetDir
    );

    if (targetFileName) {
      const merged = mergeIntoSingleFile(
        filesByDir,
        targetDir,
        targetFileName,
        fileData.content,
        group
      );

      if (merged) {
        mergedCount++;
      } else {
        // Target file doesn't exist - queue as standalone
        standaloneStyleFiles.push({
          fileName,
          content: fileData.content,
          dir: fileData.dir,
        });
      }
    }
  }

  return {
    standaloneStyleFiles,
    mergedCount,
  };
}

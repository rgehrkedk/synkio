/**
 * Token Split Logic
 *
 * Functions for splitting baseline tokens into separate files.
 */

import fs from 'fs';
import path from 'path';

import type {
  BaselineData,
  TokensConfig,
  CollectionSplitConfig,
  CollectionData,
  CollectionInfo,
} from '../types';

import { countTokens } from './parser';
import { transformNestedTokens } from './transform';

/**
 * Extract nested collections from baseline (ignore flat "baseline" section and $metadata)
 */
export function extractCollections(baseline: BaselineData): { [collectionName: string]: CollectionData } {
  const collections: { [collectionName: string]: CollectionData } = {};

  for (const [key, value] of Object.entries(baseline)) {
    if (key.startsWith('$') || key === 'baseline') {
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      collections[key] = value as CollectionData;
    }
  }

  return collections;
}

/**
 * Analyze collections to extract structure info (modes and groups with token counts)
 */
export function analyzeCollections(collections: { [collectionName: string]: CollectionData }): CollectionInfo[] {
  const result: CollectionInfo[] = [];

  for (const [collectionName, collectionData] of Object.entries(collections)) {
    const info: CollectionInfo = {
      name: collectionName,
      modes: [],
      groups: {},
    };

    for (const [modeName, modeData] of Object.entries(collectionData)) {
      info.modes.push(modeName);
      info.groups[modeName] = {};

      for (const [groupName, groupData] of Object.entries(modeData)) {
        const tokenCount = countTokens(groupData);
        if (tokenCount > 0) {
          info.groups[modeName][groupName] = tokenCount;
        }
      }
    }

    result.push(info);
  }

  return result;
}

/**
 * Write tokens to file with directory creation
 */
function writeTokenFile(filePath: string, data: any): void {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

export interface SplitResult {
  filesWritten: number;
  tokensProcessed: number;
  files: { path: string; tokenCount: number }[];
}

/**
 * Split tokens from baseline according to config
 */
export function splitTokens(
  baseline: BaselineData,
  config: TokensConfig,
  options?: { silent?: boolean }
): SplitResult {
  const collections = extractCollections(baseline);
  const collectionsInfo = analyzeCollections(collections);

  const filesWritten: { [path: string]: any } = {};
  let totalTokensProcessed = 0;
  const fileDetails: { path: string; tokenCount: number }[] = [];

  for (const info of collectionsInfo) {
    const splitConfig = config.split?.[info.name];
    if (!splitConfig) {
      if (!options?.silent) {
        console.warn(`  Warning: No configuration found for collection: ${info.name}`);
      }
      continue;
    }

    const collectionData = collections[info.name];

    if (splitConfig.strategy === 'byMode') {
      // Split by mode - each mode becomes a separate file
      for (const modeName of info.modes) {
        // Use explicit file path from config
        const filePath = splitConfig.files?.[modeName];
        if (!filePath) {
          if (!options?.silent) {
            console.warn(`  Warning: No file path configured for mode: ${modeName}`);
          }
          continue;
        }

        const modeData = collectionData[modeName];

        // Transform tokens (remove $ prefix for Style Dictionary)
        const transformedData = transformNestedTokens(modeData);
        filesWritten[filePath] = transformedData;

        const tokenCount = countTokens(modeData);
        totalTokensProcessed += tokenCount;
        fileDetails.push({ path: filePath, tokenCount });
      }
    } else if (splitConfig.strategy === 'byGroup') {
      // Split by group - groups within the first mode become separate files
      const mode = info.modes[0]; // Use first mode for primitives
      const modeData = collectionData[mode];

      if (!modeData) {
        if (!options?.silent) {
          console.warn(`  Warning: No mode data found for collection: ${info.name}`);
        }
        continue;
      }

      for (const [groupName, groupData] of Object.entries(modeData)) {
        // Use explicit file path from config
        const filePath = splitConfig.files?.[groupName];
        if (!filePath) continue;

        const tokenCount = countTokens(groupData);

        if (!filesWritten[filePath]) {
          filesWritten[filePath] = {};
        }

        // Transform and add to file
        const transformedData = transformNestedTokens(groupData);
        filesWritten[filePath][groupName] = transformedData;
        totalTokensProcessed += tokenCount;
      }

      // Add file details after processing all groups
      for (const filePath of Object.keys(filesWritten)) {
        const existingDetail = fileDetails.find(f => f.path === filePath);
        if (!existingDetail) {
          fileDetails.push({ path: filePath, tokenCount: countTokens(filesWritten[filePath]) });
        }
      }
    }
  }

  // Write all files
  for (const [filePath, data] of Object.entries(filesWritten)) {
    writeTokenFile(filePath, data);
    if (!options?.silent) {
      const tokenCount = countTokens(data);
      console.log(`  ✓ ${filePath} (${tokenCount} tokens)`);
    }
  }

  return {
    filesWritten: Object.keys(filesWritten).length,
    tokensProcessed: totalTokensProcessed,
    files: fileDetails,
  };
}

/**
 * Get list of files that would be written (without writing)
 */
export function previewSplit(
  baseline: BaselineData,
  config: TokensConfig
): { path: string; tokenCount: number }[] {
  const collections = extractCollections(baseline);
  const collectionsInfo = analyzeCollections(collections);

  const files: { path: string; tokenCount: number }[] = [];

  for (const info of collectionsInfo) {
    const splitConfig = config.split?.[info.name];
    if (!splitConfig) continue;

    const collectionData = collections[info.name];

    if (splitConfig.strategy === 'byMode') {
      for (const modeName of info.modes) {
        const filePath = splitConfig.files?.[modeName];
        if (!filePath) continue;

        const modeData = collectionData[modeName];
        const tokenCount = countTokens(modeData);
        files.push({ path: filePath, tokenCount });
      }
    } else if (splitConfig.strategy === 'byGroup') {
      const mode = info.modes[0];
      const modeData = collectionData[mode];
      if (!modeData) continue;

      for (const [groupName, groupData] of Object.entries(modeData)) {
        const filePath = splitConfig.files?.[groupName];
        if (!filePath) continue;

        const tokenCount = countTokens(groupData);
        files.push({ path: filePath, tokenCount });
      }
    }
  }

  return files;
}

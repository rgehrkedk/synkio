/**
 * File Discoverer Module
 *
 * Discovers token files based on collection configuration.
 * Maps files to collections and determines split strategies.
 */

import { readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

/**
 * Represents a discovered token file with collection metadata
 */
export interface DiscoveredFile {
  /** Absolute path to the file */
  path: string;
  /** Filename without directory */
  filename: string;
  /** Collection name from config */
  collection: string;
  /** Split strategy for this collection */
  splitBy: 'mode' | 'group' | 'none';
}

/**
 * Result of file discovery process
 */
export interface DiscoveryResult {
  /** Successfully discovered files */
  files: DiscoveredFile[];
  /** Discovery errors (non-fatal) */
  errors: string[];
}

/**
 * Collection configuration from synkio.config.json
 */
export interface CollectionConfig {
  /** Directory for this collection (optional) */
  dir?: string;
  /** Split strategy for this collection (optional) */
  splitBy?: 'mode' | 'group' | 'none';
  [key: string]: unknown;
}

/**
 * Discover token files for all collections in config
 *
 * @param collections - Collection configurations from synkio.config.json
 * @param baseDir - Base directory for token files (usually process.cwd())
 * @returns Discovery result with files and errors
 *
 * @example
 * ```typescript
 * const collections = {
 *   theme: { dir: 'tokens/theme', splitBy: 'mode' },
 *   globals: { dir: 'tokens/globals', splitBy: 'group' }
 * };
 *
 * const result = await discoverTokenFiles(collections, process.cwd());
 * // result.files: [{ path: '/abs/path/tokens/theme/light.json', ... }, ...]
 * // result.errors: ['No JSON files found in /abs/path/tokens/missing']
 * ```
 */
export async function discoverTokenFiles(
  collections: Record<string, CollectionConfig>,
  baseDir: string
): Promise<DiscoveryResult> {
  const files: DiscoveredFile[] = [];
  const errors: string[] = [];

  for (const [name, config] of Object.entries(collections)) {
    const collectionDir = resolve(baseDir, config.dir || name);
    const splitBy = config.splitBy || 'none';

    try {
      const entries = await readdir(collectionDir);
      const jsonFiles = entries.filter(f => f.endsWith('.json'));

      if (jsonFiles.length === 0) {
        errors.push(`No JSON files found in ${collectionDir}`);
        continue;
      }

      for (const filename of jsonFiles) {
        files.push({
          path: resolve(collectionDir, filename),
          filename,
          collection: name,
          splitBy,
        });
      }
    } catch (err) {
      errors.push(`Cannot read directory ${collectionDir}: ${(err as Error).message}`);
    }
  }

  return { files, errors };
}

/**
 * Extract mode name from filename based on splitBy strategy
 *
 * @param file - Discovered file with metadata
 * @param defaultMode - Default mode name if extraction fails (default: 'value')
 * @returns Extracted mode name or default
 *
 * @example
 * ```typescript
 * const file = {
 *   filename: 'theme.light.json',
 *   splitBy: 'mode',
 *   // ... other fields
 * };
 *
 * const mode = extractModeFromFile(file);
 * // mode: 'light'
 * ```
 */
export function extractModeFromFile(
  file: DiscoveredFile,
  defaultMode: string = 'value'
): string {
  if (file.splitBy !== 'mode') {
    return defaultMode;
  }

  const baseName = file.filename.replace(/\.json$/i, '');
  const parts = baseName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

/**
 * Extract group name from filename for splitBy: "group"
 *
 * @param file - Discovered file with metadata
 * @returns Extracted group name or null if not splitBy: "group"
 *
 * @example
 * ```typescript
 * const file = {
 *   filename: 'globals.colors.json',
 *   splitBy: 'group',
 *   // ... other fields
 * };
 *
 * const group = extractGroupFromFile(file);
 * // group: 'colors'
 * ```
 */
export function extractGroupFromFile(file: DiscoveredFile): string | null {
  if (file.splitBy !== 'group') {
    return null;
  }

  const baseName = file.filename.replace(/\.json$/i, '');
  const parts = baseName.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

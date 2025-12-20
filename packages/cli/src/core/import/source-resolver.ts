/**
 * Source Resolver Module
 *
 * Resolves import sources from CLI paths or config.
 * Handles both file and directory imports.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import type { Config } from '../config.js';

/**
 * Represents a file to be imported with its collection assignment
 */
export interface ImportFile {
  /** Parsed JSON content */
  content: unknown;
  /** Original filename */
  filename: string;
  /** Target collection name */
  collection: string;
}

/**
 * Options for resolving import sources
 */
export interface ResolveSourcesOptions {
  /** Path to JSON file or directory */
  path?: string;
  /** Collection name override */
  collection?: string;
}

/**
 * Result of source resolution
 */
export interface ResolveSourcesResult {
  /** Successfully resolved files */
  files: ImportFile[];
  /** Error message if resolution failed */
  error?: string;
}

/**
 * Resolve import sources from a CLI path (file or directory)
 *
 * @param inputPath - Absolute path to file or directory
 * @param collection - Collection name to assign (defaults to 'default')
 * @returns Resolved import files or error
 */
export async function resolveFromPath(
  inputPath: string,
  collection: string = 'default'
): Promise<ResolveSourcesResult> {
  const files: ImportFile[] = [];

  const inputStat = await stat(inputPath).catch(() => null);

  if (!inputStat) {
    return { files: [], error: `Path not found: ${inputPath}` };
  }

  if (inputStat.isDirectory()) {
    // Read all JSON files in directory
    const dirEntries = await readdir(inputPath);
    const jsonFiles = dirEntries.filter(f => extname(f).toLowerCase() === '.json');

    if (jsonFiles.length === 0) {
      return { files: [], error: `No JSON files found in: ${inputPath}` };
    }

    for (const filename of jsonFiles) {
      const content = JSON.parse(await readFile(resolve(inputPath, filename), 'utf-8'));
      files.push({ content, filename, collection });
    }
  } else {
    // Single file
    const content = JSON.parse(await readFile(inputPath, 'utf-8'));
    files.push({
      content,
      filename: basename(inputPath),
      collection,
    });
  }

  return { files };
}

/**
 * Resolve import sources from config import.sources
 *
 * @param config - Synkio config with import.sources defined
 * @returns Resolved import files or error
 */
export async function resolveFromConfig(
  config: Config
): Promise<ResolveSourcesResult> {
  const files: ImportFile[] = [];

  const sources = config.import?.sources;
  if (!sources || Object.keys(sources).length === 0) {
    return { files: [], error: 'No import sources defined in config' };
  }

  const defaultDir = config.import?.dir || 'figma-exports';

  for (const [collectionName, source] of Object.entries(sources)) {
    const sourceDir = source.dir || defaultDir;
    const sourceDirPath = resolve(process.cwd(), sourceDir);

    // Check if source directory exists
    const dirStat = await stat(sourceDirPath).catch(() => null);
    if (!dirStat || !dirStat.isDirectory()) {
      return { files: [], error: `Import source directory not found: ${sourceDir}` };
    }

    // Get files to import for this collection
    let filenames: string[];
    if (source.files?.length) {
      // Explicit file list
      filenames = source.files;
    } else {
      // All JSON files in directory
      const dirEntries = await readdir(sourceDirPath);
      filenames = dirEntries.filter(f => extname(f).toLowerCase() === '.json');
    }

    if (filenames.length === 0) {
      // Warn but continue - this is not a fatal error
      continue;
    }

    for (const filename of filenames) {
      const filePath = resolve(sourceDirPath, filename);
      const fileStat = await stat(filePath).catch(() => null);

      if (!fileStat) {
        return { files: [], error: `File not found: ${filename} (in ${sourceDir})` };
      }

      const content = JSON.parse(await readFile(filePath, 'utf-8'));
      files.push({ content, filename, collection: collectionName });
    }
  }

  if (files.length === 0) {
    return { files: [], error: 'No files to import. Check your import.sources config.' };
  }

  return { files };
}

/**
 * Resolve import sources from options (CLI path or config)
 *
 * @param options - CLI options with path and collection
 * @param config - Synkio config (can be null)
 * @returns Resolved import files or error with usage message
 */
export async function resolveImportSources(
  options: ResolveSourcesOptions,
  config: Config | null
): Promise<ResolveSourcesResult> {
  if (options.path) {
    // CLI path provided - use it directly
    const inputPath = resolve(process.cwd(), options.path);
    return resolveFromPath(inputPath, options.collection || 'default');
  }

  if (config?.import?.sources && Object.keys(config.import.sources).length > 0) {
    // Use config-based import sources
    return resolveFromConfig(config);
  }

  // No path and no config - return usage error
  return {
    files: [],
    error:
      'No import source specified.\n\n' +
      '  Usage:\n' +
      '    synkio import <path> --collection=<name>   Import from path\n' +
      '    synkio import                              Import using config\n\n' +
      '  To use config-based import, add to synkio.config.json:\n' +
      '    "import": {\n' +
      '      "dir": "figma-exports",\n' +
      '      "sources": {\n' +
      '        "theme": { "files": ["light.tokens.json", "dark.tokens.json"] }\n' +
      '      }\n' +
      '    }',
  };
}

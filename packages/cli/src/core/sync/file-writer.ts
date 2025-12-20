/**
 * File Writer Module
 *
 * Handles file writing operations for sync, including
 * token files, style files, and stale file cleanup.
 */

import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Standalone style file to be written
 */
export interface StandaloneStyleFile {
  fileName: string;
  content: any;
  dir?: string;
}

/**
 * Write all token files from filesByDir map
 *
 * @param filesByDir - Map of directory to Map of filename to content
 * @returns Number of files written
 */
export async function writeTokenFiles(
  filesByDir: Map<string, Map<string, any>>
): Promise<number> {
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
 * Clean up stale JSON files that are no longer needed
 *
 * Removes any .json files in the directory that are not in the new file set.
 *
 * @param outDir - Output directory to clean
 * @param newFileNames - Set of new file names to keep
 */
export async function cleanupStaleFiles(
  outDir: string,
  newFileNames: Set<string>
): Promise<void> {
  try {
    const existingFiles = await readdir(outDir);

    for (const file of existingFiles) {
      if (file.endsWith('.json') && !newFileNames.has(file)) {
        await unlink(resolve(outDir, file));
      }
    }
  } catch {
    // Ignore errors if directory doesn't exist yet
  }
}

/**
 * Clean up stale files in all output directories
 *
 * @param filesByDir - Map of directory to files
 */
export async function cleanupAllStaleFiles(
  filesByDir: Map<string, Map<string, any>>
): Promise<void> {
  for (const [outDir, filesInDir] of filesByDir) {
    const newFileNames = new Set(filesInDir.keys());
    await cleanupStaleFiles(outDir, newFileNames);
  }
}

/**
 * Write standalone style files that could not be merged
 *
 * @param styleFiles - Array of standalone style files to write
 * @param defaultOutDir - Default output directory
 * @returns Number of style files written
 */
export async function writeStandaloneStyleFiles(
  styleFiles: StandaloneStyleFile[],
  defaultOutDir: string
): Promise<number> {
  let styleFilesWritten = 0;

  for (const { fileName, content, dir } of styleFiles) {
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
 * Ensure all output directories exist
 *
 * @param outputDirs - Set of directory paths to create
 */
export async function ensureDirectories(outputDirs: Set<string>): Promise<void> {
  for (const dir of outputDirs) {
    await mkdir(dir, { recursive: true });
  }
}

import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BaselineData } from '../types/index.js';

// =============================================================================
// Path Constants
// =============================================================================

const SYNKIO_DIR = 'synkio';
const COMPARE_DIR = resolve(process.cwd(), SYNKIO_DIR, 'compare');
const BASELINE_PATH = resolve(process.cwd(), SYNKIO_DIR, 'baseline.json');

// Compare directory files for Figma sync
const LATEST_FIGMA_PATH = resolve(COMPARE_DIR, 'latest-figma-baseline.json');
const PREV_FIGMA_PATH = resolve(COMPARE_DIR, 'prev-figma-baseline.json');

// Compare directory files for Code sync
const LATEST_CODE_PATH = resolve(COMPARE_DIR, 'latest-code-baseline.json');
const PREV_CODE_PATH = resolve(COMPARE_DIR, 'prev-code-baseline.json');

// =============================================================================
// Read Functions
// =============================================================================

/**
 * Read the main baseline.json file (source of truth)
 */
export async function readBaseline(): Promise<BaselineData | undefined> {
  return readBaselineFile(BASELINE_PATH);
}

/**
 * Read the latest Figma baseline from compare directory
 */
export async function readLatestFigmaBaseline(): Promise<BaselineData | undefined> {
  return readBaselineFile(LATEST_FIGMA_PATH);
}

/**
 * Read the previous Figma baseline from compare directory
 */
export async function readPrevFigmaBaseline(): Promise<BaselineData | undefined> {
  return readBaselineFile(PREV_FIGMA_PATH);
}

/**
 * Read the latest Code baseline from compare directory
 */
export async function readLatestCodeBaseline(): Promise<BaselineData | undefined> {
  return readBaselineFile(LATEST_CODE_PATH);
}

/**
 * Read the previous Code baseline from compare directory
 */
export async function readPrevCodeBaseline(): Promise<BaselineData | undefined> {
  return readBaselineFile(PREV_CODE_PATH);
}

/**
 * Helper to read a baseline file
 */
async function readBaselineFile(path: string): Promise<BaselineData | undefined> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as BaselineData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

// =============================================================================
// Write Function
// =============================================================================

/**
 * Write baseline data to the appropriate files based on source.
 *
 * This function:
 * 1. Ensures synkio/ and synkio/compare/ directories exist
 * 2. Rotates the previous "latest" file to "prev" (if exists)
 * 3. Writes baseline.json with source in metadata
 * 4. Writes the appropriate latest-{source}-baseline.json
 *
 * @param data - The baseline data to write
 * @param source - Whether this baseline came from 'figma', 'code', or 'init' (bootstrap)
 */
export async function writeBaseline(
  data: BaselineData,
  source: 'figma' | 'code' | 'init'
): Promise<void> {
  // Ensure directories exist
  await mkdir(resolve(process.cwd(), SYNKIO_DIR), { recursive: true });

  // Add source to metadata
  const dataWithSource: BaselineData = {
    ...data,
    metadata: {
      ...data.metadata,
      source,
    },
  };

  const jsonContent = JSON.stringify(dataWithSource, null, 2);

  // Write main baseline.json (source of truth)
  await writeFile(BASELINE_PATH, jsonContent);

  // For 'init' source, skip compare directory files (no rotation needed)
  // The 'init' baseline is a one-time bootstrap that gets replaced on first pull
  if (source === 'init') {
    return;
  }

  // Ensure compare directory exists for figma/code sources
  await mkdir(COMPARE_DIR, { recursive: true });

  // Determine which compare files to use based on source
  const latestPath = source === 'figma' ? LATEST_FIGMA_PATH : LATEST_CODE_PATH;
  const prevPath = source === 'figma' ? PREV_FIGMA_PATH : PREV_CODE_PATH;

  // Rotate: copy current "latest" to "prev" (if exists)
  try {
    await copyFile(latestPath, prevPath);
  } catch (error) {
    // Ignore if latest doesn't exist yet (first sync)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  // Write to the appropriate compare file
  await writeFile(latestPath, jsonContent);
}

// =============================================================================
// Path Exports (for commands that need to reference paths)
// =============================================================================

export const PATHS = {
  SYNKIO_DIR,
  COMPARE_DIR,
  BASELINE: BASELINE_PATH,
  LATEST_FIGMA: LATEST_FIGMA_PATH,
  PREV_FIGMA: PREV_FIGMA_PATH,
  LATEST_CODE: LATEST_CODE_PATH,
  PREV_CODE: PREV_CODE_PATH,
};

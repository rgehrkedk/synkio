import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BaselineData } from '../types/index.js';

const SYNKIO_DIR = '.synkio';
const BASELINE_PATH = resolve(process.cwd(), SYNKIO_DIR, 'baseline.json');
const PREV_BASELINE_PATH = resolve(process.cwd(), SYNKIO_DIR, 'baseline.prev.json');

export async function readBaseline(): Promise<BaselineData | undefined> {
  try {
    const content = await readFile(BASELINE_PATH, 'utf-8');
    return JSON.parse(content) as BaselineData;
  } catch (error) {
    // If the file doesn't exist, return undefined
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

export async function writeBaseline(data: BaselineData) {
  // Ensure .synkio directory exists
  await mkdir(resolve(process.cwd(), SYNKIO_DIR), { recursive: true });

  // Before writing a new baseline, move the current one to .prev
  try {
    const currentBaseline = await readBaseline();
    if (currentBaseline) {
      await writeFile(PREV_BASELINE_PATH, JSON.stringify(currentBaseline, null, 2));
    }
  } catch {
    // Ignore if there's no current baseline to move
  }

  await writeFile(BASELINE_PATH, JSON.stringify(data, null, 2));
}

// This function is needed for the rollback command
export async function readPreviousBaseline(): Promise<BaselineData | undefined> {
    try {
        const content = await readFile(PREV_BASELINE_PATH, 'utf-8');
        return JSON.parse(content) as BaselineData;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }
}

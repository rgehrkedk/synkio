/**
 * File Loader Utilities
 *
 * Functions for loading and saving JSON/text files.
 */

import fs from 'fs';
import path from 'path';
import type { BaselineData, MigrationManifest } from '../types';
import type { TokensConfig, LegacyTokenSplitConfig, LegacyMigrationConfig } from '../types/config';
import {
  BASELINE_FILE,
  BASELINE_PREV_FILE,
  CONFIG_FILE,
  FIGMA_DIR,
  FIGMA_CONFIG_DIR,
  FIGMA_DATA_DIR,
  FIGMA_REPORTS_DIR,
  LEGACY_BASELINE_FILE,
  LEGACY_TOKEN_SPLIT_CONFIG_FILE,
  LEGACY_MIGRATION_CONFIG_FILE,
} from './paths';

// ============================================================================
// Config Loading
// ============================================================================

/**
 * Load unified config from .tokensrc.json
 * Resolves environment variables like ${FIGMA_TOKEN}
 */
export function loadConfig(filePath?: string): TokensConfig | null {
  const targetPath = path.join(process.cwd(), filePath || CONFIG_FILE);

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    const config = JSON.parse(content) as TokensConfig;

    // Resolve environment variables in accessToken
    if (config.figma?.accessToken?.startsWith('${') && config.figma.accessToken.endsWith('}')) {
      const envVar = config.figma.accessToken.slice(2, -1);
      config.figma.accessToken = process.env[envVar] || '';
    }

    return config;
  } catch {
    return null;
  }
}

/**
 * Load config or throw if not found
 */
export function loadConfigOrThrow(filePath?: string): TokensConfig {
  const config = loadConfig(filePath);
  if (!config) {
    throw new Error(`Config file not found: ${filePath || CONFIG_FILE}\nRun 'npm run figma:setup' to create one.`);
  }
  return config;
}

/**
 * Save config to file
 */
export function saveConfig(config: TokensConfig, filePath?: string): void {
  const targetPath = filePath || CONFIG_FILE;
  saveJsonFile(targetPath, config);
}

// ============================================================================
// Baseline Loading
// ============================================================================

/**
 * Load baseline data from file
 */
export function loadBaseline(filePath?: string): BaselineData | null {
  const targetPath = path.join(process.cwd(), filePath || BASELINE_FILE);

  if (!fs.existsSync(targetPath)) {
    // Try legacy path
    const legacyPath = path.join(process.cwd(), LEGACY_BASELINE_FILE);
    if (fs.existsSync(legacyPath)) {
      const content = fs.readFileSync(legacyPath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load baseline data, throw if not found
 */
export function loadBaselineOrThrow(filePath?: string): BaselineData {
  const data = loadBaseline(filePath);
  if (!data) {
    const file = filePath || BASELINE_FILE;
    throw new Error(`Baseline file not found: ${file}\nRun 'npm run figma:sync' to fetch from Figma.`);
  }
  return data;
}

/**
 * Load previous baseline (for comparison/rollback)
 */
export function loadBaselinePrev(filePath?: string): BaselineData | null {
  const targetPath = path.join(process.cwd(), filePath || BASELINE_PREV_FILE);

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Backup current baseline to prev
 */
export function backupBaseline(): boolean {
  const baselinePath = path.join(process.cwd(), BASELINE_FILE);
  const prevPath = path.join(process.cwd(), BASELINE_PREV_FILE);

  if (!fs.existsSync(baselinePath)) {
    return false;
  }

  try {
    // Ensure .figma directory exists
    const figmaDir = path.join(process.cwd(), FIGMA_DIR);
    if (!fs.existsSync(figmaDir)) {
      fs.mkdirSync(figmaDir, { recursive: true });
    }

    fs.copyFileSync(baselinePath, prevPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore previous baseline
 */
export function restoreBaseline(): boolean {
  const baselinePath = path.join(process.cwd(), BASELINE_FILE);
  const prevPath = path.join(process.cwd(), BASELINE_PREV_FILE);

  if (!fs.existsSync(prevPath)) {
    return false;
  }

  try {
    fs.copyFileSync(prevPath, baselinePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Legacy Config Loading (for migration)
// ============================================================================

/**
 * Load legacy token split config
 */
export function loadLegacyTokenSplitConfig(): LegacyTokenSplitConfig | null {
  const targetPath = path.join(process.cwd(), LEGACY_TOKEN_SPLIT_CONFIG_FILE);

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load legacy migration config
 */
export function loadLegacyMigrationConfig(): LegacyMigrationConfig | null {
  const targetPath = path.join(process.cwd(), LEGACY_MIGRATION_CONFIG_FILE);

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ============================================================================
// Migration Manifest Loading
// ============================================================================

/**
 * Load migration manifest from file
 */
export function loadMigrationManifest(filePath?: string): MigrationManifest | null {
  const targetPath = path.join(process.cwd(), filePath || '.figma/migration.json');

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ============================================================================
// Generic File Operations
// ============================================================================

/**
 * Load JSON from file, returns empty object if not found
 */
export function loadJsonFile(filePath: string): Record<string, any> {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Save JSON to file
 */
export function saveJsonFile(filePath: string, data: any): void {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Save text to file
 */
export function saveTextFile(filePath: string, content: string): void {
  const fullPath = path.join(process.cwd(), filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Check if file exists (relative to cwd)
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

/**
 * Get absolute path from relative
 */
export function getAbsolutePath(filePath: string): string {
  return path.join(process.cwd(), filePath);
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string): void {
  const fullPath = path.join(process.cwd(), dirPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

/**
 * Ensure .figma directory structure exists
 */
export function ensureFigmaDir(): void {
  ensureDir(FIGMA_DIR);
  ensureDir(FIGMA_CONFIG_DIR);
  ensureDir(FIGMA_DATA_DIR);
  ensureDir(FIGMA_REPORTS_DIR);
}

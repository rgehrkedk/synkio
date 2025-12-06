/**
 * File Loader Utilities
 *
 * Functions for loading and saving JSON/text files.
 * All functions use the context system for path resolution.
 */

import fs from 'fs';
import path from 'path';
import type { BaselineData, MigrationManifest } from '../types/index.js';
import type { TokensConfig, LegacyTokenSplitConfig, LegacyMigrationConfig } from '../types/config.js';
import { getContext, type Context } from '../context.js';
import {
  getBaselinePath,
  getBaselinePrevPath,
  getConfigPath,
  getFigmaDir,
  getConfigDir,
  getDataDir,
  getReportsDir,
  LEGACY_BASELINE_FILE,
  LEGACY_TOKEN_SPLIT_CONFIG_FILE,
  LEGACY_MIGRATION_CONFIG_FILE,
} from './paths.js';

// ============================================================================
// Config File Discovery
// ============================================================================

/**
 * Find config file by checking multiple file names
 * Checks in order: tokensrc.json → .synkiorc → synkio.config.json
 *
 * @param rootDir - Root directory to search in
 * @returns Path to config file or null if not found
 */
export function findConfigFile(rootDir: string): string | null {
  const configNames = ['tokensrc.json', '.synkiorc', 'synkio.config.json'];

  for (const name of configNames) {
    const configPath = path.join(rootDir, name);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

// ============================================================================
// Environment Variable Interpolation
// ============================================================================

/**
 * Interpolate environment variables in config
 * Replaces ${VAR_NAME} with process.env.VAR_NAME
 *
 * @param config - Config object with potential env vars
 * @returns Config with env vars replaced
 */
export function interpolateEnvVars<T extends Record<string, any>>(config: T): T {
  const interpolated = JSON.parse(JSON.stringify(config)) as T;

  function interpolateValue(value: any): any {
    if (typeof value === 'string') {
      // Match ${VAR_NAME} pattern
      const match = value.match(/^\$\{([A-Z_][A-Z0-9_]*)\}$/);
      if (match) {
        const varName = match[1];
        const envValue = process.env[varName];
        if (!envValue) {
          console.warn(`Warning: Environment variable ${varName} not found, using empty string`);
          return '';
        }
        return envValue;
      }
      return value;
    } else if (Array.isArray(value)) {
      return value.map(interpolateValue);
    } else if (value !== null && typeof value === 'object') {
      return interpolateObject(value);
    }
    return value;
  }

  function interpolateObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateValue(value);
    }
    return result;
  }

  return interpolateObject(interpolated) as T;
}

// ============================================================================
// Config Validation
// ============================================================================

/**
 * Validate config and return list of errors
 *
 * @param config - Config to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateConfig(config: Partial<TokensConfig>): string[] {
  const errors: string[] = [];

  // Check version
  if (!config.version) {
    errors.push('Missing required field: version');
  }

  // Check figma config
  if (!config.figma) {
    errors.push('Missing required section: figma');
  } else {
    if (!config.figma.fileId) {
      errors.push('Missing required field: figma.fileId - Run \'synkio init\' to configure');
    }
    if (!config.figma.accessToken) {
      errors.push('Missing required field: figma.accessToken - Set FIGMA_ACCESS_TOKEN environment variable');
    }
  }

  // Check paths config
  if (!config.paths) {
    errors.push('Missing required section: paths');
  } else {
    const requiredPaths = ['data', 'baseline', 'baselinePrev', 'reports', 'tokens', 'styles'];
    for (const pathKey of requiredPaths) {
      if (!(config.paths as any)[pathKey]) {
        errors.push(`Missing required field: paths.${pathKey}`);
      }
    }
  }

  // Check collections config
  // Collections are optional in Phase 1B
  if (false && !config.collections) {
    errors.push('Missing required section: collections - Can be empty {} for default behavior');
  }

  return errors;
}

// ============================================================================
// Default Config
// ============================================================================

/**
 * Get default config with smart defaults
 *
 * @param ctx - Optional context (uses global if not provided)
 * @returns Default config
 */
export function getDefaultConfig(ctx?: Context): TokensConfig {
  const context = ctx || getContext();

  return {
    version: '2.0.0',
    figma: {
      fileId: '',
      accessToken: '',
    },
    paths: {
      root: context.rootDir,
      data: '.figma',
      baseline: '.figma/baseline.json',
      baselinePrev: '.figma/baseline.prev.json',
      reports: '.figma/reports',
      tokens: 'tokens',
      styles: 'styles/tokens',
    },
    collections: {},
  };
}

// ============================================================================
// Config Loading (Updated with new features)
// ============================================================================

/**
 * Load unified config from tokensrc.json
 * - Discovers config file if not specified
 * - Resolves environment variables like ${FIGMA_TOKEN}
 * - Resolves relative paths from config directory
 *
 * @param filePath - Optional custom config file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadConfig(filePath?: string, ctx?: Context): TokensConfig | null {
  const context = ctx || getContext();

  console.log(`[DEBUG] loadConfig - rootDir: ${context.rootDir}`);
  console.log(`[DEBUG] loadConfig - filePath: ${filePath || 'not specified'}`);

  // Discover config file if not specified
  let targetPath = filePath;
  if (!targetPath) {
    const discovered = findConfigFile(context.rootDir);
    console.log(`[DEBUG] loadConfig - discovered: ${discovered || 'null'}`);
    if (!discovered) {
      return null;
    }
    targetPath = discovered;
  }

  console.log(`[DEBUG] loadConfig - targetPath: ${targetPath}`);
  console.log(`[DEBUG] loadConfig - exists: ${fs.existsSync(targetPath)}`);

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    console.log(`[DEBUG] loadConfig - content length: ${content.length}`);

    let config = JSON.parse(content) as TokensConfig;
    console.log(`[DEBUG] loadConfig - parsed config:`, JSON.stringify(config, null, 2));

    // Interpolate environment variables
    config = interpolateEnvVars(config);
    console.log(`[DEBUG] loadConfig - after interpolation:`, JSON.stringify(config, null, 2));

    // Resolve relative paths from config directory
    const configDir = path.dirname(targetPath);
    if (config.paths) {
      const paths = config.paths;
      for (const [key, value] of Object.entries(paths)) {
        if (value && typeof value === 'string' && !path.isAbsolute(value)) {
          (paths as any)[key] = path.resolve(configDir, value);
        }
      }
    }

    console.log(`[DEBUG] loadConfig - returning config successfully`);
    return config;
  } catch (error) {
    console.error('[DEBUG] Error loading config:', error);
    return null;
  }
}

/**
 * Load config or throw if not found
 *
 * @param filePath - Optional custom config file path
 * @param ctx - Optional context (uses global if not provided)
 * @throws Error if config file not found
 */
export function loadConfigOrThrow(filePath?: string, ctx?: Context): TokensConfig {
  const context = ctx || getContext();
  const config = loadConfig(filePath, context);

  if (!config) {
    const configPath = filePath || findConfigFile(context.rootDir) || 'tokensrc.json';
    throw new Error(
      `Config file not found: ${configPath}\n` +
      "Run 'synkio init' to create one."
    );
  }

  // Validate config
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(
      `Invalid configuration:\n${errors.map(e => `  - ${e}`).join('\n')}\n` +
      "Run 'synkio init' to reconfigure."
    );
  }

  return config;
}

/**
 * Save config to file
 *
 * @param config - Config object to save
 * @param filePath - Optional custom config file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function saveConfig(config: TokensConfig, filePath?: string, ctx?: Context): void {
  const context = ctx || getContext();
  const targetPath = filePath || path.join(context.rootDir, 'tokensrc.json');
  saveJsonFile(targetPath, config);
}

// ============================================================================
// Baseline Loading
// ============================================================================

/**
 * Load baseline data from file
 *
 * @param filePath - Optional custom baseline file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadBaseline(filePath?: string, ctx?: Context): BaselineData | null {
  const context = ctx || getContext();
  const targetPath = filePath || getBaselinePath(context);

  if (!fs.existsSync(targetPath)) {
    // Try legacy path
    const legacyPath = path.join(context.rootDir, LEGACY_BASELINE_FILE);
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
 *
 * @param filePath - Optional custom baseline file path
 * @param ctx - Optional context (uses global if not provided)
 * @throws Error if baseline file not found
 */
export function loadBaselineOrThrow(filePath?: string, ctx?: Context): BaselineData {
  const context = ctx || getContext();
  const data = loadBaseline(filePath, context);
  const baselinePath = filePath || getBaselinePath(context);

  if (!data) {
    throw new Error(
      `Baseline file not found: ${baselinePath}\n` +
      "Run 'synkio sync' to fetch from Figma."
    );
  }
  return data;
}

/**
 * Load previous baseline (for comparison/rollback)
 *
 * @param filePath - Optional custom baseline prev file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadBaselinePrev(filePath?: string, ctx?: Context): BaselineData | null {
  const context = ctx || getContext();
  const targetPath = filePath || getBaselinePrevPath(context);

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
 *
 * @param ctx - Optional context (uses global if not provided)
 */
export function backupBaseline(ctx?: Context): boolean {
  const context = ctx || getContext();
  const baselinePath = getBaselinePath(context);
  const prevPath = getBaselinePrevPath(context);

  if (!fs.existsSync(baselinePath)) {
    return false;
  }

  try {
    // Ensure data directory exists
    const dataDir = getDataDir(context);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.copyFileSync(baselinePath, prevPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore previous baseline
 *
 * @param ctx - Optional context (uses global if not provided)
 */
export function restoreBaseline(ctx?: Context): boolean {
  const context = ctx || getContext();
  const baselinePath = getBaselinePath(context);
  const prevPath = getBaselinePrevPath(context);

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
 *
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadLegacyTokenSplitConfig(ctx?: Context): LegacyTokenSplitConfig | null {
  const context = ctx || getContext();
  const targetPath = path.join(context.rootDir, LEGACY_TOKEN_SPLIT_CONFIG_FILE);

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
 *
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadLegacyMigrationConfig(ctx?: Context): LegacyMigrationConfig | null {
  const context = ctx || getContext();
  const targetPath = path.join(context.rootDir, LEGACY_MIGRATION_CONFIG_FILE);

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
 *
 * @param filePath - Optional custom manifest file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadMigrationManifest(filePath?: string, ctx?: Context): MigrationManifest | null {
  const context = ctx || getContext();
  const targetPath = filePath || path.join(getFigmaDir(context), 'migration.json');

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
 *
 * @param filePath - File path (absolute or relative to context rootDir)
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadJsonFile(filePath: string, ctx?: Context): Record<string, any> {
  const context = ctx || getContext();
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(context.rootDir, filePath);

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
 *
 * @param filePath - File path (absolute or relative to context rootDir)
 * @param data - Data to save
 * @param ctx - Optional context (uses global if not provided)
 */
export function saveJsonFile(filePath: string, data: any, ctx?: Context): void {
  const context = ctx || getContext();
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(context.rootDir, filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Save text to file
 *
 * @param filePath - File path (absolute or relative to context rootDir)
 * @param content - Text content to save
 * @param ctx - Optional context (uses global if not provided)
 */
export function saveTextFile(filePath: string, content: string, ctx?: Context): void {
  const context = ctx || getContext();
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(context.rootDir, filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, 'utf-8');
}

/**
 * Check if file exists (relative to context rootDir)
 *
 * @param filePath - File path (absolute or relative to context rootDir)
 * @param ctx - Optional context (uses global if not provided)
 */
export function fileExists(filePath: string, ctx?: Context): boolean {
  const context = ctx || getContext();
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(context.rootDir, filePath);
  return fs.existsSync(fullPath);
}

/**
 * Get absolute path from relative
 *
 * @param filePath - Relative file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function getAbsolutePath(filePath: string, ctx?: Context): string {
  const context = ctx || getContext();
  return path.join(context.rootDir, filePath);
}

/**
 * Ensure directory exists
 *
 * @param dirPath - Directory path (absolute or relative to context rootDir)
 * @param ctx - Optional context (uses global if not provided)
 */
export function ensureDir(dirPath: string, ctx?: Context): void {
  const context = ctx || getContext();
  const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(context.rootDir, dirPath);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

/**
 * Ensure .figma directory structure exists
 *
 * @param ctx - Optional context (uses global if not provided)
 */
export function ensureFigmaDir(ctx?: Context): void {
  const context = ctx || getContext();
  ensureDir(getFigmaDir(context), context);
  ensureDir(getConfigDir(context), context);
  ensureDir(getDataDir(context), context);
  ensureDir(getReportsDir(context), context);
}

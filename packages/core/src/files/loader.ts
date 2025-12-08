/**
 * File Loader Utilities
 *
 * Functions for loading and saving JSON/text files.
 * All functions use the context system for path resolution.
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type { BaselineData, MigrationManifest, TokenMap } from '../types/index.js';
import type { TokensConfig, LegacyTokenSplitConfig, LegacyMigrationConfig } from '../types/config.js';
import { tokensConfigSchema, transformZodError, type ResolvedConfig } from './config-schema.js';
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
 * @param options - Options for interpolation
 * @returns Config with env vars replaced
 */
export function interpolateEnvVars<T extends Record<string, any>>(
  config: T,
  options: { silent?: boolean } = {}
): T {
  const interpolated = JSON.parse(JSON.stringify(config)) as T;

  function interpolateValue(value: any): any {
    if (typeof value === 'string') {
      // Match ${VAR_NAME} pattern
      const match = value.match(/^\$\{([A-Z_][A-Z0-9_]*)\}$/);
      if (match) {
        const varName = match[1];
        const envValue = process.env[varName];
        if (!envValue) {
          if (!options.silent) {
            console.warn(`Warning: Environment variable ${varName} not found, using empty string`);
          }
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
// Config Loading with Zod Validation
// ============================================================================

/**
 * Load unified config from tokensrc.json
 * - Discovers config file if not specified
 * - Resolves environment variables like ${FIGMA_TOKEN}
 * - Validates with Zod schema
 * - Resolves relative paths from config directory
 *
 * @param filePath - Optional custom config file path
 * @param ctx - Optional context (uses global if not provided)
 * @param options - Options for config loading
 */
export function loadConfig(
  filePath?: string,
  ctx?: Context,
  options: { silent?: boolean } = {}
): ResolvedConfig | null {
  const context = ctx || getContext();

  // Discover config file if not specified
  let targetPath = filePath;
  if (!targetPath) {
    const discovered = findConfigFile(context.rootDir);
    if (!discovered) {
      return null;
    }
    targetPath = discovered;
  }

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    let config = JSON.parse(content);

    // Interpolate environment variables BEFORE validation
    config = interpolateEnvVars(config, { silent: options.silent });

    // Validate with Zod schema
    const parsed = tokensConfigSchema.safeParse(config);
    if (!parsed.success) {
      const errors = transformZodError(parsed.error);
      throw new Error(
        `Invalid configuration in ${targetPath}:\n${errors.map(e => `  • ${e}`).join('\n')}\n\n` +
        'Run "synkio init" to fix or check https://synkio.io/docs/config'
      );
    }

    const validatedConfig = parsed.data;

    // Resolve relative paths from config directory
    const configDir = path.dirname(targetPath);
    if (validatedConfig.paths) {
      const paths = validatedConfig.paths;
      for (const [key, value] of Object.entries(paths)) {
        if (value && typeof value === 'string' && !path.isAbsolute(value)) {
          (paths as any)[key] = path.resolve(configDir, value);
        }
      }
    }

    return validatedConfig;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid configuration')) {
      throw error;
    }
    return null;
  }
}

/**
 * Load config or throw if not found
 *
 * @param filePath - Optional custom config file path
 * @param ctx - Optional context (uses global if not provided)
 * @throws Error if config file not found or invalid
 */
export function loadConfigOrThrow(filePath?: string, ctx?: Context): ResolvedConfig {
  const context = ctx || getContext();
  const config = loadConfig(filePath, context);

  if (!config) {
    const configPath = filePath || findConfigFile(context.rootDir) || 'tokensrc.json';
    throw new Error(
      `Config file not found: ${configPath}\n` +
      "Run 'synkio init' to create one."
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
    return null;
  }

  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content) as BaselineData;
  } catch (error) {
    return null;
  }
}

/**
 * Load baseline or throw if not found
 *
 * @param filePath - Optional custom baseline file path
 * @param ctx - Optional context (uses global if not provided)
 * @throws Error if baseline not found
 */
export function loadBaselineOrThrow(filePath?: string, ctx?: Context): BaselineData {
  const baseline = loadBaseline(filePath, ctx);

  if (!baseline) {
    const context = ctx || getContext();
    const targetPath = filePath || getBaselinePath(context);
    throw new Error(
      `Baseline not found: ${targetPath}\n` +
      "Run 'synkio sync' first to fetch baseline from Figma."
    );
  }

  return baseline;
}

/**
 * Save baseline data to file
 *
 * @param baseline - Baseline data to save
 * @param filePath - Optional custom baseline file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function saveBaseline(baseline: BaselineData, filePath?: string, ctx?: Context): void {
  const context = ctx || getContext();
  const targetPath = filePath || getBaselinePath(context);
  saveJsonFile(targetPath, baseline, context);
}

/**
 * Backup current baseline to baseline-prev.json
 *
 * @param ctx - Optional context (uses global if not provided)
 * @returns True if backup was created, false if no baseline existed
 */
export function backupBaseline(ctx?: Context): boolean {
  const context = ctx || getContext();
  const baselinePath = getBaselinePath(context);
  const prevPath = getBaselinePrevPath(context);

  if (!fs.existsSync(baselinePath)) {
    return false;
  }

  fs.copyFileSync(baselinePath, prevPath);
  return true;
}

// ============================================================================
// Token Map Loading
// ============================================================================

/**
 * Load token map (mapping of token paths to output files)
 *
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadTokenMap(config: ResolvedConfig, ctx?: Context): TokenMap | null {
  const context = ctx || getContext();

  // Use configured path or default
  const tokenMapPath = config.paths.tokenMap
    ? path.resolve(context.rootDir, config.paths.tokenMap)
    : path.resolve(context.rootDir, getDataDir(context), 'token-map.json');

  if (!fs.existsSync(tokenMapPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(tokenMapPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save token map to file
 *
 * @param tokenMap - Token map to save
 * @param config - Configuration with tokenMap path
 * @param ctx - Optional context (uses global if not provided)
 */
export function saveTokenMap(tokenMap: TokenMap, config: ResolvedConfig, ctx?: Context): void {
  const context = ctx || getContext();

  const tokenMapPath = config.paths.tokenMap
    ? path.resolve(context.rootDir, config.paths.tokenMap)
    : path.resolve(context.rootDir, getDataDir(context), 'token-map.json');

  saveJsonFile(tokenMapPath, tokenMap, context);
}

// ============================================================================
// Migration Manifest Loading
// ============================================================================

/**
 * Load migration manifest (plan for migrating renamed/deleted tokens)
 *
 * @param filePath - Migration manifest file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadMigrationManifest(filePath: string, ctx?: Context): MigrationManifest | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as MigrationManifest;
  } catch (error) {
    return null;
  }
}

/**
 * Save migration manifest to file
 *
 * @param manifest - Migration manifest to save
 * @param filePath - Migration manifest file path
 * @param ctx - Optional context (uses global if not provided)
 */
export function saveMigrationManifest(manifest: MigrationManifest, filePath: string, ctx?: Context): void {
  const context = ctx || getContext();
  saveJsonFile(filePath, manifest, context);
}

// ============================================================================
// Legacy Config Migration
// ============================================================================

/**
 * Check if legacy config files exist (pre-tokensrc.json era)
 *
 * @param ctx - Optional context (uses global if not provided)
 * @returns True if any legacy files exist
 */
export function hasLegacyConfig(ctx?: Context): boolean {
  const context = ctx || getContext();
  const figmaDir = getFigmaDir(context);

  return (
    fs.existsSync(path.join(figmaDir, LEGACY_BASELINE_FILE)) ||
    fs.existsSync(path.join(figmaDir, LEGACY_TOKEN_SPLIT_CONFIG_FILE)) ||
    fs.existsSync(path.join(figmaDir, LEGACY_MIGRATION_CONFIG_FILE))
  );
}

/**
 * Load legacy token split config
 *
 * @param ctx - Optional context (uses global if not provided)
 */
export function loadLegacyTokenSplitConfig(ctx?: Context): LegacyTokenSplitConfig | null {
  const context = ctx || getContext();
  const configPath = path.join(getFigmaDir(context), LEGACY_TOKEN_SPLIT_CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as LegacyTokenSplitConfig;
  } catch (error) {
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
  const configPath = path.join(getFigmaDir(context), LEGACY_MIGRATION_CONFIG_FILE);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as LegacyMigrationConfig;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Generic JSON/Text File Operations
// ============================================================================

/**
 * Save JSON data to file with pretty formatting
 *
 * @param filePath - Target file path
 * @param data - Data to save
 * @param ctx - Optional context (for path resolution)
 */
export function saveJsonFile(filePath: string, data: any, ctx?: Context): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Save text content to file
 *
 * @param filePath - Target file path
 * @param content - Text content to save
 * @param ctx - Optional context (for path resolution)
 */
export function saveTextFile(filePath: string, content: string, ctx?: Context): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Load text file content
 *
 * @param filePath - Source file path
 * @returns File content or null if not found
 */
export function loadTextFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return null;
  }
}

/**
 * Load the previous baseline file
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
 * Restore the previous baseline to current baseline
 */
export function restoreBaseline(ctx?: Context): boolean {
  const context = ctx || getContext();
  const currentPath = getBaselinePath(context);
  const prevPath = getBaselinePrevPath(context);

  if (!fs.existsSync(prevPath)) {
    return false;
  }

  try {
    const prevContent = fs.readFileSync(prevPath, 'utf-8');
    fs.writeFileSync(currentPath, prevContent, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Generic JSON file loader
 */
export function loadJsonFile(filePath: string, ctx?: Context): Record<string, any> {
  const context = ctx || getContext();
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(context.rootDir, filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string, ctx?: Context): boolean {
  const context = ctx || getContext();
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(context.rootDir, filePath);

  return fs.existsSync(absolutePath);
}

/**
 * Get absolute path from relative path
 */
export function getAbsolutePath(filePath: string, ctx?: Context): string {
  const context = ctx || getContext();

  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.join(context.rootDir, filePath);
}

/**
 * Ensure directory exists
 */
export function ensureDir(dirPath: string, ctx?: Context): void {
  const context = ctx || getContext();
  const absolutePath = path.isAbsolute(dirPath)
    ? dirPath
    : path.join(context.rootDir, dirPath);

  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }
}

/**
 * Ensure .figma directory exists
 */
export function ensureFigmaDir(ctx?: Context): void {
  const context = ctx || getContext();
  const dataDir = getDataDir(context);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

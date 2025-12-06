/**
 * Environment Variable Loading
 *
 * Lazy environment variable loading with no side effects at import time.
 * Loads from standard locations: .env → .env.local → custom path → process.env
 *
 * Priority order (later overrides earlier):
 * 1. .env (project root)
 * 2. .env.local (project root, gitignored)
 * 3. Custom path from config (if configured)
 * 4. Process environment (system/CI)
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

// ============================================================================
// State
// ============================================================================

let envLoaded = false;
let cachedEnv: Record<string, string | undefined> = {};

// ============================================================================
// Environment Loading
// ============================================================================

/**
 * Load environment variables from standard locations.
 * Safe to call multiple times - loads only once and caches.
 *
 * @param customPath - Optional custom .env file path from config
 *
 * @example
 * ```typescript
 * loadEnv();
 * const token = getFigmaToken();
 * ```
 */
export function loadEnv(customPath?: string): void {
  if (envLoaded) {
    return; // Already loaded, use cached values
  }

  // Load from standard locations in priority order
  // Later loads override earlier ones for conflicts
  const rootDir = process.cwd();

  // 1. Load .env (project root)
  const envPath = path.join(rootDir, '.env');
  if (existsSync(envPath)) {
    config({ path: envPath });
  }

  // 2. Load .env.local (project root, higher priority)
  const envLocalPath = path.join(rootDir, '.env.local');
  if (existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: true });
  }

  // 3. Load custom path if provided (highest priority from config)
  if (customPath) {
    const customFullPath = path.isAbsolute(customPath)
      ? customPath
      : path.join(rootDir, customPath);

    if (existsSync(customFullPath)) {
      config({ path: customFullPath, override: true });
    }
  }

  // Cache environment variables
  cachedEnv = { ...process.env };
  envLoaded = true;
}

/**
 * Reset environment loading state (for testing)
 * @internal
 */
export function resetEnv(): void {
  envLoaded = false;
  cachedEnv = {};
}

// ============================================================================
// Token Helpers
// ============================================================================

/**
 * Get Figma access token from environment.
 * Prefers FIGMA_ACCESS_TOKEN over FIGMA_TOKEN.
 * Auto-loads environment if not already loaded.
 *
 * @returns Figma access token or undefined
 *
 * @example
 * ```typescript
 * const token = getFigmaToken();
 * if (!token) {
 *   throw new Error('FIGMA_ACCESS_TOKEN not found');
 * }
 * ```
 */
export function getFigmaToken(): string | undefined {
  // Auto-load environment on first access
  if (!envLoaded) {
    loadEnv();
  }

  // Prefer FIGMA_ACCESS_TOKEN over FIGMA_TOKEN
  return process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;
}

/**
 * Validate that Figma access token is available.
 * Throws actionable error if missing.
 *
 * @throws Error if token not found
 *
 * @example
 * ```typescript
 * validateFigmaToken();
 * // Token is guaranteed to be available after this call
 * ```
 */
export function validateFigmaToken(): void {
  const token = getFigmaToken();

  if (!token) {
    throw new Error(
      'FIGMA_ACCESS_TOKEN not found.\n' +
      'Set it in .env, .env.local, or as an environment variable.\n' +
      "Run 'synkio init' to configure your project."
    );
  }
}

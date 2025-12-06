/**
 * Figma Constants
 *
 * Environment variables and plugin constants for Figma API access.
 *
 * Credential loading priority:
 * 1. figma-sync/.figma/.env (package-local, gitignored)
 * 2. .env.local (project-level)
 * 3. .env (project-level)
 * 4. Process environment (CI/system)
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';

// Load environment variables in priority order (last loaded wins for conflicts)
// So we load in reverse priority: .env -> .env.local -> package .env
config(); // .env
config({ path: '.env.local' }); // .env.local

// Package-local .env (highest priority for the access token)
const packageEnvPath = 'figma-sync/.figma/.env';
if (existsSync(packageEnvPath)) {
  config({ path: packageEnvPath, override: true });
}

// Figma API credentials (loaded from environment)
// Note: fileId and nodeId come from tokensrc.json config, not environment
export const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;

// Legacy exports (for backwards compatibility - prefer config file values)
export const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;
export const FIGMA_REGISTRY_NODE = process.env.FIGMA_REGISTRY_NODE;

// Plugin identifiers (must match Token Vault Figma plugin manifest)
export const PLUGIN_ID = 'token-vault';
export const PLUGIN_NAMESPACE = 'token_vault';
export const REGISTRY_NODE_NAME = '_token_registry';

/**
 * Validate Figma access token is available
 */
export function validateFigmaCredentials(): void {
  if (!FIGMA_ACCESS_TOKEN) {
    throw new Error(
      'FIGMA_ACCESS_TOKEN not found.\n' +
      'Set it in figma-sync/.figma/.env or as an environment variable.'
    );
  }
}

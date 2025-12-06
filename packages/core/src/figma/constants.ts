/**
 * Figma Constants
 *
 * Environment variables and plugin constants for Figma API access.
 *
 * Note: Environment variables are loaded lazily via env.ts (no side effects at import).
 * Credentials are loaded from .env → .env.local → process.env
 */

import { getFigmaToken } from '../env';

// ============================================================================
// Figma API Credentials
// ============================================================================

/**
 * Get Figma access token from environment.
 * Lazy-loaded from .env files via env.ts
 *
 * Priority:
 * 1. FIGMA_ACCESS_TOKEN
 * 2. FIGMA_TOKEN (fallback)
 *
 * @returns Figma access token or undefined
 */
export function getFigmaAccessToken(): string | undefined {
  return getFigmaToken();
}

/**
 * Legacy: Get FIGMA_ACCESS_TOKEN directly.
 * @deprecated Use getFigmaAccessToken() or getFigmaToken() from env.ts instead
 */
export const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;

// ============================================================================
// Legacy Environment Variables
// ============================================================================

/**
 * @deprecated Use config file (tokensrc.json) figma.fileId instead
 */
export const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;

/**
 * @deprecated Use config file (tokensrc.json) figma.nodeId instead
 */
export const FIGMA_REGISTRY_NODE = process.env.FIGMA_REGISTRY_NODE;

// ============================================================================
// Plugin Identifiers
// ============================================================================

/**
 * Plugin ID (must match Token Vault Figma plugin manifest)
 */
export const PLUGIN_ID = 'token-vault';

/**
 * Plugin namespace for data storage
 */
export const PLUGIN_NAMESPACE = 'token_vault';

/**
 * Registry node name in Figma file
 */
export const REGISTRY_NODE_NAME = '_token_registry';

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate Figma access token is available.
 * Throws actionable error if missing.
 *
 * @throws Error if token not found
 */
export function validateFigmaCredentials(): void {
  const token = getFigmaAccessToken();

  if (!token) {
    throw new Error(
      'FIGMA_ACCESS_TOKEN not found.\n' +
      'Set it in .env, .env.local, or as an environment variable.\n' +
      "Run 'synkio init' to configure your project."
    );
  }
}

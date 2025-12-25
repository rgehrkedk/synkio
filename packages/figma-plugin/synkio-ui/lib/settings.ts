/**
 * Plugin Settings Storage Module
 * Manages remote sync configuration using figma.clientStorage
 */

import { sanitizeString, sanitizeUrl, sanitizeToken, sanitizePath } from './sanitize';

// =============================================================================
// Types
// =============================================================================

export interface RemoteGitHubSettings {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token?: string;  // For private repos
}

export interface RemoteSettings {
  enabled: boolean;
  type: 'url' | 'github' | 'localhost';
  url?: string;
  github?: RemoteGitHubSettings;
  localhostUrl?: string;    // Full URL (e.g., ngrok tunnel)
  localhostToken?: string;  // For localhost authentication
}

export interface PluginSettings {
  remote: RemoteSettings;
  autoCheckOnOpen: boolean;
}

// =============================================================================
// Storage Keys (prefixed with synkio_)
// =============================================================================

const STORAGE_KEYS = {
  REMOTE_ENABLED: 'synkio_remote_enabled',
  REMOTE_TYPE: 'synkio_remote_type',
  REMOTE_URL: 'synkio_remote_url',
  GITHUB_OWNER: 'synkio_github_owner',
  GITHUB_REPO: 'synkio_github_repo',
  GITHUB_BRANCH: 'synkio_github_branch',
  GITHUB_PATH: 'synkio_github_path',
  GITHUB_TOKEN: 'synkio_github_token',
  LOCALHOST_URL: 'synkio_localhost_url',
  LOCALHOST_TOKEN: 'synkio_localhost_token',
  AUTO_CHECK: 'synkio_auto_check',
  LAST_FETCH: 'synkio_last_fetch',
  LAST_REMOTE_HASH: 'synkio_last_remote_hash',
} as const;

// =============================================================================
// Validation Constants
// =============================================================================

const MIN_PORT = 1;
const MAX_PORT = 65535;
const DEFAULT_LOCALHOST_PORT = 3847;

// =============================================================================
// Default Settings
// =============================================================================

export function getDefaultSettings(): PluginSettings {
  return {
    remote: {
      enabled: false,
      type: 'github',
      github: {
        owner: '',
        repo: '',
        branch: 'main',
        path: '.synkio/export-baseline.json',
      },
      localhostUrl: '',
    },
    autoCheckOnOpen: true,
  };
}

// =============================================================================
// Storage Helper Functions
// =============================================================================

/**
 * Validate port number, returning default if invalid
 */
function validatePort(value: unknown): number {
  if (value === undefined || value === null) {
    return DEFAULT_LOCALHOST_PORT;
  }

  const port = typeof value === 'string' ? parseInt(value, 10) : Number(value);

  if (isNaN(port) || port < MIN_PORT || port > MAX_PORT) {
    return DEFAULT_LOCALHOST_PORT;
  }

  return port;
}

// =============================================================================
// URL Validation Functions
// =============================================================================

/**
 * URL validation result
 */
interface UrlValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validate and normalize a URL for remote fetch
 */
export function validateRemoteUrl(url: string): UrlValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Check for valid URL format
  try {
    const parsed = new URL(trimmed);

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use http or https protocol' };
    }

    // Warn about http (not https)
    if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return {
        valid: true,
        normalized: trimmed,
        error: 'Warning: Using HTTP instead of HTTPS. Data may be transmitted insecurely.',
      };
    }

    return { valid: true, normalized: trimmed };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate GitHub settings
 */
export function validateGitHubSettings(github: RemoteGitHubSettings): UrlValidationResult {
  if (!github.owner || github.owner.trim().length === 0) {
    return { valid: false, error: 'GitHub owner/organization is required' };
  }

  if (!github.repo || github.repo.trim().length === 0) {
    return { valid: false, error: 'GitHub repository name is required' };
  }

  // Validate owner format (alphanumeric, hyphens)
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(github.owner)) {
    return { valid: false, error: 'Invalid GitHub owner format' };
  }

  // Validate repo format
  if (!/^[a-zA-Z0-9._-]+$/.test(github.repo)) {
    return { valid: false, error: 'Invalid GitHub repository format' };
  }

  // Validate branch (no spaces, common branch chars)
  if (github.branch && !/^[a-zA-Z0-9._/-]+$/.test(github.branch)) {
    return { valid: false, error: 'Invalid branch name format' };
  }

  // Validate path (no path traversal)
  if (github.path) {
    if (github.path.includes('..')) {
      return { valid: false, error: 'Path cannot contain ".."' };
    }
    if (github.path.startsWith('/')) {
      return { valid: false, error: 'Path should not start with "/"' };
    }
  }

  return { valid: true };
}

/**
 * Get a value from clientStorage with fallback
 */
async function getStorageValue(key: string, defaultValue: string = ''): Promise<string> {
  const value = await figma.clientStorage.getAsync(key);
  return value !== undefined ? value : defaultValue;
}

/**
 * Get a boolean value from clientStorage
 */
async function getStorageBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await figma.clientStorage.getAsync(key);
  if (value === undefined) return defaultValue;
  return value === 'true';
}

/**
 * Get a number value from clientStorage
 */
async function getStorageNumber(key: string, defaultValue: number): Promise<number> {
  const value = await figma.clientStorage.getAsync(key);
  if (value === undefined) return defaultValue;

  const parsed = parseInt(value, 10);

  // Validate port range if this is a port key
  if (key === STORAGE_KEYS.LOCALHOST_PORT) {
    return validatePort(parsed);
  }

  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Set a value in clientStorage
 */
async function setStorageValue(key: string, value: string | number | boolean): Promise<void> {
  await figma.clientStorage.setAsync(key, String(value));
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get all settings with defaults
 */
export async function getSettings(): Promise<PluginSettings> {
  const defaults = getDefaultSettings();

  // Read remote settings
  const remoteEnabled = await getStorageBoolean(STORAGE_KEYS.REMOTE_ENABLED, defaults.remote.enabled);
  const remoteType = await getStorageValue(STORAGE_KEYS.REMOTE_TYPE, defaults.remote.type) as 'url' | 'github' | 'localhost';

  // Read GitHub settings
  const githubOwner = await getStorageValue(STORAGE_KEYS.GITHUB_OWNER, defaults.remote.github!.owner);
  const githubRepo = await getStorageValue(STORAGE_KEYS.GITHUB_REPO, defaults.remote.github!.repo);
  const githubBranch = await getStorageValue(STORAGE_KEYS.GITHUB_BRANCH, defaults.remote.github!.branch);
  const githubPath = await getStorageValue(STORAGE_KEYS.GITHUB_PATH, defaults.remote.github!.path);
  const githubToken = await getStorageValue(STORAGE_KEYS.GITHUB_TOKEN, '');

  // Read other remote settings
  const remoteUrl = await getStorageValue(STORAGE_KEYS.REMOTE_URL, '');
  const localhostUrl = await getStorageValue(STORAGE_KEYS.LOCALHOST_URL, '');
  const localhostToken = await getStorageValue(STORAGE_KEYS.LOCALHOST_TOKEN, '');

  // Read general settings
  const autoCheckOnOpen = await getStorageBoolean(STORAGE_KEYS.AUTO_CHECK, defaults.autoCheckOnOpen);

  return {
    remote: {
      enabled: remoteEnabled,
      type: remoteType,
      url: remoteUrl || undefined,
      github: {
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
        path: githubPath,
        token: githubToken || undefined,
      },
      localhostUrl: localhostUrl || undefined,
      localhostToken: localhostToken || undefined,
    },
    autoCheckOnOpen: autoCheckOnOpen,
  };
}

/**
 * Save partial settings (only updates provided fields)
 */
export async function saveSettings(settings: Partial<PluginSettings>): Promise<void> {
  // Update remote settings
  if (settings.remote) {
    const { remote } = settings;

    if (remote.enabled !== undefined) {
      await setStorageValue(STORAGE_KEYS.REMOTE_ENABLED, remote.enabled);
    }

    if (remote.type !== undefined) {
      await setStorageValue(STORAGE_KEYS.REMOTE_TYPE, remote.type);
    }

    if (remote.url !== undefined) {
      await setStorageValue(STORAGE_KEYS.REMOTE_URL, sanitizeUrl(remote.url));
    }

    if (remote.localhostUrl !== undefined) {
      await setStorageValue(STORAGE_KEYS.LOCALHOST_URL, sanitizeUrl(remote.localhostUrl));
    }

    if (remote.localhostToken !== undefined) {
      await setStorageValue(STORAGE_KEYS.LOCALHOST_TOKEN, sanitizeToken(remote.localhostToken));
    }

    // Update GitHub settings
    if (remote.github) {
      const { github } = remote;

      if (github.owner !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_OWNER, sanitizeString(github.owner, 100));
      }

      if (github.repo !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_REPO, sanitizeString(github.repo, 100));
      }

      if (github.branch !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_BRANCH, sanitizeString(github.branch, 100));
      }

      if (github.path !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_PATH, sanitizePath(github.path));
      }

      if (github.token !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_TOKEN, sanitizeToken(github.token));
      }
    }
  }

  // Update general settings
  if (settings.autoCheckOnOpen !== undefined) {
    await setStorageValue(STORAGE_KEYS.AUTO_CHECK, settings.autoCheckOnOpen);
  }
}

/**
 * Get last fetch metadata
 */
export async function getLastFetchInfo(): Promise<{ timestamp: string | null; hash: string | null }> {
  const timestamp = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_FETCH);
  const hash = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_REMOTE_HASH);

  return {
    timestamp: timestamp || null,
    hash: hash || null,
  };
}

/**
 * Save last fetch metadata
 */
export async function saveLastFetchInfo(timestamp: string, hash: string): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_FETCH, timestamp);
  await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_REMOTE_HASH, hash);
}

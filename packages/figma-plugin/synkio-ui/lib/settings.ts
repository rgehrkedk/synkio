/**
 * Plugin Settings Storage Module
 * Manages remote sync configuration using figma.clientStorage
 */

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
  localhostPort?: number;
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
  LOCALHOST_PORT: 'synkio_localhost_port',
  AUTO_CHECK: 'synkio_auto_check',
  LAST_FETCH: 'synkio_last_fetch',
  LAST_REMOTE_HASH: 'synkio_last_remote_hash',
} as const;

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
      localhostPort: 3847,
    },
    autoCheckOnOpen: true,
  };
}

// =============================================================================
// Storage Helper Functions
// =============================================================================

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
  const localhostPort = await getStorageNumber(STORAGE_KEYS.LOCALHOST_PORT, defaults.remote.localhostPort!);

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
      localhostPort: localhostPort,
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
      await setStorageValue(STORAGE_KEYS.REMOTE_URL, remote.url);
    }

    if (remote.localhostPort !== undefined) {
      await setStorageValue(STORAGE_KEYS.LOCALHOST_PORT, remote.localhostPort);
    }

    // Update GitHub settings
    if (remote.github) {
      const { github } = remote;

      if (github.owner !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_OWNER, github.owner);
      }

      if (github.repo !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_REPO, github.repo);
      }

      if (github.branch !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_BRANCH, github.branch);
      }

      if (github.path !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_PATH, github.path);
      }

      if (github.token !== undefined) {
        await setStorageValue(STORAGE_KEYS.GITHUB_TOKEN, github.token);
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

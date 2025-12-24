/**
 * Remote Fetch Module
 * Fetches baseline data from remote URLs (GitHub, custom URL, localhost)
 */

import { getSettings, saveLastFetchInfo, type PluginSettings } from './settings';
import { buildGitHubRawUrl, buildGitHubApiUrl } from './github';
import type { SyncData, TokenEntry, StyleEntry } from './types';

// =============================================================================
// Types
// =============================================================================

export interface FetchResult {
  success: boolean;
  data?: SyncData;
  error?: string;
  source: string;
  timestamp: string;
  hash: string;
}

/**
 * CLI Baseline format (from baseline.json)
 */
interface CLIBaseline {
  baseline: Record<string, TokenEntry>;
  styles?: Record<string, StyleEntry>;
  metadata: {
    syncedAt: string;
  };
}

// =============================================================================
// URL Building
// =============================================================================

/**
 * Build fetch URL from settings
 * @param settings - Plugin settings
 * @returns URL to fetch baseline from
 */
export function buildFetchUrl(settings: PluginSettings): string {
  const { remote } = settings;

  if (remote.type === 'url') {
    return remote.url || '';
  }

  if (remote.type === 'github') {
    const github = remote.github;
    if (!github || !github.owner || !github.repo) {
      throw new Error('GitHub settings incomplete');
    }

    // Use API URL if token is provided (for private repos), otherwise raw URL
    if (github.token) {
      return buildGitHubApiUrl(github);
    } else {
      return buildGitHubRawUrl(github);
    }
  }

  if (remote.type === 'localhost') {
    const port = remote.localhostPort || 3847;
    return `http://localhost:${port}/baseline`;
  }

  throw new Error(`Unknown remote type: ${remote.type}`);
}

/**
 * Build HTTP headers for fetch request
 * @param settings - Plugin settings
 * @returns Headers object
 */
export function buildHeaders(settings: PluginSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  // Add GitHub authentication if token is provided
  if (settings.remote.type === 'github' && settings.remote.github?.token) {
    headers['Authorization'] = `Bearer ${settings.remote.github.token}`;
    headers['Accept'] = 'application/vnd.github.v3.raw';
  }

  return headers;
}

// =============================================================================
// Hash Function
// =============================================================================

/**
 * Simple hash function for change detection
 * Uses a basic string hash algorithm (djb2)
 * @param content - Content to hash
 * @returns Hash string
 */
export function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) + content.charCodeAt(i); // hash * 33 + c
  }
  // Convert to unsigned 32-bit integer and then to hex
  return (hash >>> 0).toString(16);
}

// =============================================================================
// Baseline Conversion
// =============================================================================

/**
 * Validate and convert CLI baseline format to plugin SyncData format
 * @param cliBaseline - CLI baseline object
 * @returns SyncData or error object
 */
function convertCLIBaselineToSyncData(cliBaseline: any): SyncData | { error: string } {
  // Validate structure
  if (!cliBaseline || typeof cliBaseline !== 'object') {
    return { error: 'Invalid baseline: must be a JSON object' };
  }

  if (!cliBaseline.baseline || typeof cliBaseline.baseline !== 'object') {
    return { error: 'Invalid baseline: missing "baseline" object' };
  }

  if (!cliBaseline.metadata || !cliBaseline.metadata.syncedAt) {
    return { error: 'Invalid baseline: missing "metadata.syncedAt"' };
  }

  // Convert baseline tokens (object to array)
  const tokens: TokenEntry[] = [];
  for (const [key, token] of Object.entries(cliBaseline.baseline)) {
    if (!token || typeof token !== 'object') {
      return { error: `Invalid token entry for key: ${key}` };
    }

    const t = token as any;

    // Validate required fields
    if (!t.collection || !t.mode || !t.path || t.value === undefined || !t.type) {
      return { error: `Invalid token entry: ${key} is missing required fields (collection, mode, path, value, type)` };
    }

    tokens.push(t as TokenEntry);
  }

  // Convert styles if present (object to array)
  let styles: StyleEntry[] | undefined;
  if (cliBaseline.styles && typeof cliBaseline.styles === 'object') {
    styles = [];
    for (const [key, style] of Object.entries(cliBaseline.styles)) {
      if (!style || typeof style !== 'object') {
        return { error: `Invalid style entry for key: ${key}` };
      }

      const s = style as any;

      // Validate required fields
      if (!s.styleId || !s.type || !s.path || !s.value) {
        return { error: `Invalid style entry: ${key} is missing required fields` };
      }

      styles.push(s as StyleEntry);
    }
  }

  return {
    version: '3.0.0',
    timestamp: cliBaseline.metadata.syncedAt,
    tokens,
    styles,
  };
}

// =============================================================================
// Fetch Functions
// =============================================================================

/**
 * Fetch remote baseline from configured source
 * @param settings - Plugin settings
 * @returns Fetch result with data or error
 */
export async function fetchRemoteBaseline(settings: PluginSettings): Promise<FetchResult> {
  const timestamp = new Date().toISOString();

  try {
    // Build URL and headers
    const url = buildFetchUrl(settings);
    const headers = buildHeaders(settings);

    // Fetch from remote
    const response = await fetch(url, { headers });

    // Handle HTTP errors
    if (!response.ok) {
      let errorMessage: string;

      if (response.status === 404) {
        errorMessage = 'Baseline file not found. Run `synkio export-baseline` and push to repository.';
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = 'Access denied. Check your GitHub token for private repositories.';
      } else {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      return {
        success: false,
        error: errorMessage,
        source: url,
        timestamp,
        hash: '',
      };
    }

    // Parse response - handle both direct JSON and GitHub API format
    let responseText = await response.text();
    let parsedData: any;

    try {
      parsedData = JSON.parse(responseText);

      // GitHub API returns base64-encoded content in a wrapper
      if (parsedData.content && parsedData.encoding === 'base64') {
        // Decode base64 content
        const decodedContent = atob(parsedData.content.replace(/\n/g, ''));
        parsedData = JSON.parse(decodedContent);
        responseText = decodedContent; // Update for hash calculation
      }
    } catch (e) {
      return {
        success: false,
        error: 'Invalid JSON response from remote source',
        source: url,
        timestamp,
        hash: '',
      };
    }

    // Validate baseline format
    if (!parsedData.baseline || typeof parsedData.baseline !== 'object') {
      return {
        success: false,
        error: 'Invalid baseline format: missing "baseline" object',
        source: url,
        timestamp,
        hash: '',
      };
    }

    if (!parsedData.metadata || !parsedData.metadata.syncedAt) {
      return {
        success: false,
        error: 'Invalid baseline format: missing "metadata.syncedAt"',
        source: url,
        timestamp,
        hash: '',
      };
    }

    // Convert CLI baseline to SyncData format
    const result = convertCLIBaselineToSyncData(parsedData);

    if ('error' in result) {
      return {
        success: false,
        error: result.error,
        source: url,
        timestamp,
        hash: '',
      };
    }

    // Calculate hash for change detection
    const hash = hashContent(responseText);

    return {
      success: true,
      data: result,
      source: url,
      timestamp,
      hash,
    };

  } catch (error) {
    // Handle network errors
    const message = (error as Error).message || String(error);

    let errorMessage: string;
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      if (settings.remote.type === 'localhost') {
        errorMessage = 'Cannot connect. Is `synkio serve` running?';
      } else {
        errorMessage = 'Network error. Check your internet connection.';
      }
    } else {
      errorMessage = `Fetch error: ${message}`;
    }

    return {
      success: false,
      error: errorMessage,
      source: settings.remote.type === 'url' ? (settings.remote.url || '') : buildFetchUrl(settings),
      timestamp,
      hash: '',
    };
  }
}

/**
 * Check if remote baseline has updates compared to last fetch
 * @param settings - Plugin settings
 * @param lastHash - Hash from last successful fetch (or null)
 * @returns Whether updates are available and any error
 */
export async function checkForUpdates(
  settings: PluginSettings,
  lastHash: string | null
): Promise<{ hasUpdates: boolean; error?: string }> {
  const result = await fetchRemoteBaseline(settings);

  if (!result.success) {
    return {
      hasUpdates: false,
      error: result.error,
    };
  }

  // If no previous hash, there are updates
  if (!lastHash) {
    return { hasUpdates: true };
  }

  // Compare hashes
  const hasUpdates = result.hash !== lastHash;

  return { hasUpdates };
}

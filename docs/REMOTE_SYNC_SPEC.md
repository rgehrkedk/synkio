# Remote Baseline Sync Specification

*Technical spec for URL fetch and GitHub integration in the Synkio Figma plugin*

---

## Overview

This feature enables designers to fetch baseline updates directly from a remote URL (GitHub, CDN, or local dev server) without manually importing JSON files. This streamlines the code → Figma workflow while staying within Figma plugin API constraints.

### User Story

> As a designer, I want to click "Fetch Latest" in the Synkio plugin and see what changed in code, so I can review and apply updates without leaving Figma or handling JSON files.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Developer Workflow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. Developer modifies tokens in code                                   │
│   2. Runs: synkio export-baseline                                        │
│   3. Commits synkio/export-baseline.json to repo                        │
│   4. Pushes to GitHub (or deploys to CDN)                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Designer Workflow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. Opens Synkio plugin in Figma                                        │
│   2. Clicks "Fetch Latest" (or sees "Updates available" badge)           │
│   3. Plugin fetches from configured URL                                  │
│   4. Reviews diff in plugin UI                                           │
│   5. Clicks "Apply to Figma"                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Plugin Settings & Storage

### 1.1 Settings Schema

```typescript
interface PluginSettings {
  // Remote source configuration
  remote: {
    enabled: boolean;
    type: 'url' | 'github' | 'localhost';

    // For type: 'url'
    url?: string;

    // For type: 'github'
    github?: {
      owner: string;        // e.g., "company"
      repo: string;         // e.g., "design-system"
      branch: string;       // e.g., "main"
      path: string;         // e.g., "synkio/export-baseline.json"
      token?: string;       // Optional: for private repos (stored securely)
    };

    // For type: 'localhost'
    localhost?: {
      port: number;         // e.g., 3847
    };
  };

  // Behavior settings
  autoCheckOnOpen: boolean;   // Check for updates when plugin opens
  showNotifications: boolean; // Show Figma notifications for updates
}
```

### 1.2 Storage Keys

Settings stored in `figma.clientStorage` (per-user, persistent):

| Key | Type | Description |
|-----|------|-------------|
| `synkio_remote_enabled` | boolean | Remote fetch enabled |
| `synkio_remote_type` | string | 'url' \| 'github' \| 'localhost' |
| `synkio_remote_url` | string | Custom URL |
| `synkio_github_owner` | string | GitHub owner/org |
| `synkio_github_repo` | string | GitHub repository |
| `synkio_github_branch` | string | Branch name |
| `synkio_github_path` | string | File path in repo |
| `synkio_github_token` | string | Encrypted PAT for private repos |
| `synkio_auto_check` | boolean | Auto-check on plugin open |
| `synkio_last_fetch` | string | ISO timestamp of last fetch |
| `synkio_last_remote_hash` | string | Hash of last fetched content |

### 1.3 Storage Implementation

```typescript
// lib/settings.ts

const STORAGE_KEYS = {
  REMOTE_ENABLED: 'synkio_remote_enabled',
  REMOTE_TYPE: 'synkio_remote_type',
  REMOTE_URL: 'synkio_remote_url',
  GITHUB_OWNER: 'synkio_github_owner',
  GITHUB_REPO: 'synkio_github_repo',
  GITHUB_BRANCH: 'synkio_github_branch',
  GITHUB_PATH: 'synkio_github_path',
  GITHUB_TOKEN: 'synkio_github_token',
  AUTO_CHECK: 'synkio_auto_check',
  LAST_FETCH: 'synkio_last_fetch',
  LAST_REMOTE_HASH: 'synkio_last_remote_hash',
} as const;

async function getSettings(): Promise<PluginSettings> {
  const [
    enabled,
    type,
    url,
    githubOwner,
    githubRepo,
    githubBranch,
    githubPath,
    githubToken,
    autoCheck,
  ] = await Promise.all([
    figma.clientStorage.getAsync(STORAGE_KEYS.REMOTE_ENABLED),
    figma.clientStorage.getAsync(STORAGE_KEYS.REMOTE_TYPE),
    figma.clientStorage.getAsync(STORAGE_KEYS.REMOTE_URL),
    figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_OWNER),
    figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_REPO),
    figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_BRANCH),
    figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_PATH),
    figma.clientStorage.getAsync(STORAGE_KEYS.GITHUB_TOKEN),
    figma.clientStorage.getAsync(STORAGE_KEYS.AUTO_CHECK),
  ]);

  return {
    remote: {
      enabled: enabled ?? false,
      type: type ?? 'github',
      url: url ?? '',
      github: {
        owner: githubOwner ?? '',
        repo: githubRepo ?? '',
        branch: githubBranch ?? 'main',
        path: githubPath ?? 'synkio/export-baseline.json',
        token: githubToken,
      },
      localhost: {
        port: 3847,
      },
    },
    autoCheckOnOpen: autoCheck ?? true,
    showNotifications: true,
  };
}

async function saveSettings(settings: Partial<PluginSettings>): Promise<void> {
  const promises: Promise<void>[] = [];

  if (settings.remote) {
    if (settings.remote.enabled !== undefined) {
      promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.REMOTE_ENABLED, settings.remote.enabled));
    }
    if (settings.remote.type !== undefined) {
      promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.REMOTE_TYPE, settings.remote.type));
    }
    if (settings.remote.url !== undefined) {
      promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.REMOTE_URL, settings.remote.url));
    }
    if (settings.remote.github) {
      const gh = settings.remote.github;
      if (gh.owner !== undefined) promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_OWNER, gh.owner));
      if (gh.repo !== undefined) promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_REPO, gh.repo));
      if (gh.branch !== undefined) promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_BRANCH, gh.branch));
      if (gh.path !== undefined) promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_PATH, gh.path));
      if (gh.token !== undefined) promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.GITHUB_TOKEN, gh.token));
    }
  }

  if (settings.autoCheckOnOpen !== undefined) {
    promises.push(figma.clientStorage.setAsync(STORAGE_KEYS.AUTO_CHECK, settings.autoCheckOnOpen));
  }

  await Promise.all(promises);
}
```

---

## Part 2: URL Fetch Implementation

### 2.1 Fetch Module

```typescript
// lib/remote-fetch.ts

interface FetchResult {
  success: boolean;
  data?: SyncData;
  error?: string;
  source: string;
  timestamp: string;
  hash: string;
}

/**
 * Build the fetch URL based on settings
 */
function buildFetchUrl(settings: PluginSettings): string {
  const { remote } = settings;

  switch (remote.type) {
    case 'url':
      return remote.url!;

    case 'github': {
      const { owner, repo, branch, path } = remote.github!;
      // Use raw.githubusercontent.com for public repos
      // Use api.github.com for private repos (requires token)
      if (remote.github?.token) {
        return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      }
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    }

    case 'localhost':
      return `http://localhost:${remote.localhost?.port || 3847}/baseline`;

    default:
      throw new Error(`Unknown remote type: ${remote.type}`);
  }
}

/**
 * Build headers for the request
 */
function buildHeaders(settings: PluginSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  // Add GitHub token for private repos
  if (settings.remote.type === 'github' && settings.remote.github?.token) {
    headers['Authorization'] = `Bearer ${settings.remote.github.token}`;
    headers['Accept'] = 'application/vnd.github.v3.raw'; // Get raw content directly
  }

  return headers;
}

/**
 * Simple hash function for change detection
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Fetch baseline from remote source
 */
async function fetchRemoteBaseline(settings: PluginSettings): Promise<FetchResult> {
  const url = buildFetchUrl(settings);
  const headers = buildHeaders(settings);
  const timestamp = new Date().toISOString();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'Baseline file not found. Run `synkio export-baseline` and push to repository.',
          source: url,
          timestamp,
          hash: '',
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'Access denied. Check your GitHub token for private repositories.',
          source: url,
          timestamp,
          hash: '',
        };
      }
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        source: url,
        timestamp,
        hash: '',
      };
    }

    const text = await response.text();
    const hash = hashContent(text);

    // Parse and validate
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return {
        success: false,
        error: 'Invalid JSON in baseline file',
        source: url,
        timestamp,
        hash,
      };
    }

    // Convert to SyncData format (reuse existing function)
    const result = convertCLIBaselineToSyncData(parsed);

    if ('error' in result) {
      return {
        success: false,
        error: result.error,
        source: url,
        timestamp,
        hash,
      };
    }

    return {
      success: true,
      data: result,
      source: url,
      timestamp,
      hash,
    };

  } catch (err) {
    // Network errors
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return {
        success: false,
        error: settings.remote.type === 'localhost'
          ? 'Cannot connect. Is `synkio serve` running?'
          : 'Network error. Check your internet connection.',
        source: url,
        timestamp,
        hash: '',
      };
    }

    return {
      success: false,
      error: message,
      source: url,
      timestamp,
      hash: '',
    };
  }
}

/**
 * Check if remote has updates (quick hash comparison)
 */
async function checkForUpdates(settings: PluginSettings): Promise<{
  hasUpdates: boolean;
  error?: string;
}> {
  const lastHash = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_REMOTE_HASH);

  const result = await fetchRemoteBaseline(settings);

  if (!result.success) {
    return { hasUpdates: false, error: result.error };
  }

  return {
    hasUpdates: result.hash !== lastHash,
  };
}
```

### 2.2 Message Handlers

Add to `code.ts`:

```typescript
// Handle remote fetch messages
if (msg.type === 'fetch-remote') {
  const settings = await getSettings();

  if (!settings.remote.enabled) {
    figma.ui.postMessage({
      type: 'fetch-error',
      error: 'Remote sync not configured. Go to Settings to set up.'
    });
    return;
  }

  figma.ui.postMessage({ type: 'fetch-started' });

  const result = await fetchRemoteBaseline(settings);

  if (!result.success) {
    figma.ui.postMessage({
      type: 'fetch-error',
      error: result.error
    });
    return;
  }

  // Save the fetched baseline
  saveBaselineSnapshot(result.data!);

  // Update last fetch metadata
  await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_FETCH, result.timestamp);
  await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_REMOTE_HASH, result.hash);

  // Add to history
  const userName = figma.currentUser?.name ?? 'Unknown';
  const tokenCount = result.data!.tokens.length;
  const styleCount = result.data!.styles?.length ?? 0;
  addToHistory({
    u: userName,
    t: Date.now(),
    c: tokenCount + styleCount,
    p: [`Fetched from ${settings.remote.type}: ${tokenCount} tokens, ${styleCount} styles`],
  });

  // Recalculate diff
  await sendDiffToUI();

  figma.ui.postMessage({
    type: 'fetch-success',
    source: result.source,
    tokenCount,
    styleCount,
  });
}

if (msg.type === 'check-for-updates') {
  const settings = await getSettings();

  if (!settings.remote.enabled) {
    figma.ui.postMessage({ type: 'update-check-result', hasUpdates: false });
    return;
  }

  const result = await checkForUpdates(settings);

  figma.ui.postMessage({
    type: 'update-check-result',
    hasUpdates: result.hasUpdates,
    error: result.error,
  });
}

if (msg.type === 'get-settings') {
  const settings = await getSettings();
  figma.ui.postMessage({ type: 'settings-update', settings });
}

if (msg.type === 'save-settings') {
  await saveSettings(msg.settings);
  figma.ui.postMessage({ type: 'settings-saved' });
  figma.notify('Settings saved');
}
```

---

## Part 3: GitHub Integration

### 3.1 GitHub URL Patterns

| Access | URL Pattern |
|--------|-------------|
| **Public repo** | `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` |
| **Private repo** | `https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}` |

### 3.2 GitHub Token Handling

For private repositories, users need a GitHub Personal Access Token (PAT) with `repo` or `contents:read` scope.

**Security considerations:**
- Token stored in `figma.clientStorage` (per-user, not shared)
- Never logged or sent to third parties
- Only used for GitHub API calls

### 3.3 GitHub URL Parser

```typescript
// lib/github.ts

interface GitHubInfo {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

/**
 * Parse a GitHub URL into components
 * Supports:
 * - https://github.com/owner/repo/blob/branch/path/to/file.json
 * - https://raw.githubusercontent.com/owner/repo/branch/path/to/file.json
 * - owner/repo (assumes main branch, default path)
 */
function parseGitHubUrl(input: string): GitHubInfo | null {
  // Raw URL pattern
  const rawMatch = input.match(
    /raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/
  );
  if (rawMatch) {
    return {
      owner: rawMatch[1],
      repo: rawMatch[2],
      branch: rawMatch[3],
      path: rawMatch[4],
    };
  }

  // GitHub blob URL pattern
  const blobMatch = input.match(
    /github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/
  );
  if (blobMatch) {
    return {
      owner: blobMatch[1],
      repo: blobMatch[2],
      branch: blobMatch[3],
      path: blobMatch[4],
    };
  }

  // GitHub repo URL (no file)
  const repoMatch = input.match(
    /github\.com\/([^\/]+)\/([^\/]+)\/?$/
  );
  if (repoMatch) {
    return {
      owner: repoMatch[1],
      repo: repoMatch[2],
      branch: 'main',
      path: 'synkio/export-baseline.json',
    };
  }

  // Short format: owner/repo
  const shortMatch = input.match(/^([^\/]+)\/([^\/]+)$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      branch: 'main',
      path: 'synkio/export-baseline.json',
    };
  }

  return null;
}

/**
 * Validate GitHub connection by attempting to fetch the file
 */
async function validateGitHubConnection(
  info: GitHubInfo,
  token?: string
): Promise<{ valid: boolean; error?: string; isPrivate?: boolean }> {
  // Try public URL first
  const publicUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${info.path}`;

  try {
    const publicResponse = await fetch(publicUrl, { method: 'HEAD' });

    if (publicResponse.ok) {
      return { valid: true, isPrivate: false };
    }

    if (publicResponse.status === 404) {
      // Could be private repo or file doesn't exist
      if (!token) {
        return {
          valid: false,
          error: 'File not found. If this is a private repo, add a GitHub token.',
        };
      }

      // Try with token
      const apiUrl = `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${info.path}?ref=${info.branch}`;
      const privateResponse = await fetch(apiUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3.raw',
        },
      });

      if (privateResponse.ok) {
        return { valid: true, isPrivate: true };
      }

      if (privateResponse.status === 404) {
        return { valid: false, error: 'File not found in repository.' };
      }

      if (privateResponse.status === 401) {
        return { valid: false, error: 'Invalid GitHub token.' };
      }

      return { valid: false, error: `GitHub API error: ${privateResponse.status}` };
    }

    return { valid: false, error: `Unexpected response: ${publicResponse.status}` };

  } catch (err) {
    return { valid: false, error: 'Network error. Check your connection.' };
  }
}
```

---

## Part 4: CLI Enhancements

### 4.1 New Command: `synkio serve`

Runs a local HTTP server that serves the baseline for the plugin to fetch.

```typescript
// src/cli/commands/serve.ts

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../../core/config.js';

interface ServeOptions {
  port?: number;
  config?: string;
}

const DEFAULT_PORT = 3847;
const BASELINE_PATH = 'synkio/export-baseline.json';

export async function serveCommand(options: ServeOptions = {}): Promise<void> {
  const port = options.port ?? DEFAULT_PORT;
  const baselinePath = resolve(process.cwd(), BASELINE_PATH);

  const server = createServer(async (req, res) => {
    // CORS headers for Figma plugin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/baseline' || req.url === '/') {
      try {
        const content = await readFile(baselinePath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content);
        console.log(chalk.dim(`  [${new Date().toLocaleTimeString()}] Served baseline`));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Baseline not found. Run synkio export-baseline first.' }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
      return;
    }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', baseline: baselinePath }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    console.log('');
    console.log(chalk.green('  Synkio baseline server running'));
    console.log('');
    console.log(chalk.dim('  Local:'), `http://localhost:${port}/baseline`);
    console.log(chalk.dim('  Health:'), `http://localhost:${port}/health`);
    console.log('');
    console.log(chalk.cyan('  In the Figma plugin:'));
    console.log(chalk.dim('    1. Go to Settings'));
    console.log(chalk.dim('    2. Select "Local Server"'));
    console.log(chalk.dim(`    3. Port: ${port}`));
    console.log('');
    console.log(chalk.dim('  Press Ctrl+C to stop'));
    console.log('');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.dim('\n  Shutting down...'));
    server.close();
    process.exit(0);
  });
}
```

### 4.2 Enhanced `export-baseline`

Add `--copy` flag for clipboard workflow:

```typescript
// Add to export-baseline.ts

if (options.copy) {
  // Use clipboardy or similar
  const { default: clipboard } = await import('clipboardy');
  await clipboard.write(JSON.stringify(exportData, null, 2));
  spinner.succeed(chalk.green('Baseline copied to clipboard!'));
  console.log('');
  console.log(chalk.cyan('  In the Figma plugin:'));
  console.log(chalk.dim('    1. Click "Import from Clipboard"'));
  console.log(chalk.dim('    2. Review diff and click "Apply"'));
  console.log('');
}
```

### 4.3 Updated Help Text

```typescript
case 'serve':
  console.log('Usage: synkio serve [options]\n');
  console.log('Start a local server for Figma plugin to fetch baseline.\n');
  console.log('Options:');
  console.log('  --port=<number>   Server port (default: 3847)');
  console.log('  --config=<file>   Path to config file\n');
  console.log('The Figma plugin can then fetch from http://localhost:<port>/baseline');
  break;
```

---

## Part 5: Plugin UI/UX

### 5.1 Main View Updates

```
┌─────────────────────────────────────────────────────────────┐
│  Synkio                                        [⚙️] [×]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔄 Fetch Latest                    [↻ Check Now]   │   │
│  │                                                      │   │
│  │  Source: github.com/company/design-system            │   │
│  │  Last fetched: 2 hours ago                           │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  ● 3 updates available                         │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────── Changes ───────────────────           │
│                                                             │
│  ~ colors.brand.primary                                     │
│    #0066CC → #0052A3                                        │
│                                                             │
│  + spacing.2xl                                              │
│    48px                                                     │
│                                                             │
│  - colors.deprecated.old                                    │
│    (removed)                                                │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Apply to Figma]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Settings View

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  REMOTE SYNC                                                │
│  ────────────────────────────────────────────               │
│                                                             │
│  ○ Disabled                                                 │
│  ● GitHub Repository                                        │
│  ○ Custom URL                                               │
│  ○ Local Server                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  GitHub Repository                                   │   │
│  │                                                      │   │
│  │  Repository                                          │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ company/design-system                          │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  Or paste a GitHub URL                               │   │
│  │                                                      │   │
│  │  Branch                                              │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ main                                           │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  File Path                                           │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ synkio/export-baseline.json                   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  │  ▶ Private Repository (optional)                     │   │
│  │                                                      │   │
│  │  [Test Connection]                ✓ Connected        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  BEHAVIOR                                                   │
│  ────────────────────────────────────────────               │
│                                                             │
│  [✓] Check for updates when plugin opens                    │
│  [✓] Show notifications                                     │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [Save Settings]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Private Repo Expanded

```
│  ▼ Private Repository                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │  GitHub Token                                       │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │ ghp_xxxxxxxxxxxxxxxxxxxx                     │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │  ⓘ Create a token at github.com/settings/tokens    │    │
│  │    Required scope: repo (or contents:read)          │    │
│  │                                                     │    │
│  │  🔒 Token stored locally, never shared              │    │
│  └────────────────────────────────────────────────────┘    │
```

### 5.4 State Machine

```
┌─────────────┐
│   IDLE      │◄────────────────────────────────────┐
└──────┬──────┘                                      │
       │ User clicks "Fetch"                         │
       │ or auto-check on open                       │
       ▼                                             │
┌─────────────┐                                      │
│  FETCHING   │                                      │
└──────┬──────┘                                      │
       │                                             │
       ├─── Success ───►┌─────────────┐              │
       │                │  DIFF_READY │──── Apply ───┘
       │                └─────────────┘
       │
       └─── Error ─────►┌─────────────┐
                        │   ERROR     │──── Retry ───► FETCHING
                        └─────────────┘
```

---

## Part 6: Error Handling

### 6.1 Error Messages

| Scenario | User-Friendly Message |
|----------|----------------------|
| Network offline | "Cannot connect. Check your internet connection." |
| File not found (404) | "Baseline file not found. Run `synkio export-baseline` and push to your repository." |
| Private repo, no token | "This appears to be a private repository. Add a GitHub token in Settings." |
| Invalid token (401) | "GitHub token is invalid or expired. Update it in Settings." |
| No permission (403) | "Access denied. Check that your token has the 'repo' scope." |
| Invalid JSON | "The baseline file contains invalid JSON. Check the export." |
| Schema mismatch | "Baseline format not recognized. Ensure you're using the latest Synkio CLI." |
| Rate limited | "GitHub rate limit exceeded. Wait a few minutes and try again." |
| Local server down | "Cannot connect to local server. Is `synkio serve` running?" |

### 6.2 Retry Logic

```typescript
async function fetchWithRetry(
  settings: PluginSettings,
  maxRetries: number = 2
): Promise<FetchResult> {
  let lastError: string = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }

    const result = await fetchRemoteBaseline(settings);

    if (result.success) {
      return result;
    }

    lastError = result.error ?? 'Unknown error';

    // Don't retry for certain errors
    if (result.error?.includes('not found') ||
        result.error?.includes('Invalid') ||
        result.error?.includes('Access denied')) {
      return result;
    }
  }

  return {
    success: false,
    error: `Failed after ${maxRetries + 1} attempts. ${lastError}`,
    source: '',
    timestamp: new Date().toISOString(),
    hash: '',
  };
}
```

---

## Part 7: Security Considerations

### 7.1 Token Storage

- GitHub tokens stored in `figma.clientStorage` (per-user, encrypted by Figma)
- Never transmitted to Synkio servers or third parties
- Never logged to console in production
- Token input field uses `type="password"`

### 7.2 CORS

- Local server (`synkio serve`) includes CORS headers for Figma's plugin origin
- GitHub raw URLs are CORS-friendly
- GitHub API requires Accept header but works from plugin context

### 7.3 Content Validation

- All fetched content is validated against expected schema
- No code execution from fetched content
- JSON.parse wrapped in try-catch
- Type validation before use

---

## Implementation Phases

### Phase 1: Core Fetch (MVP)
- [ ] Settings storage module
- [ ] Basic URL fetch
- [ ] Plugin UI for fetch button
- [ ] Error handling

### Phase 2: GitHub Integration
- [ ] GitHub URL parsing
- [ ] Public repo support
- [ ] Private repo with token
- [ ] Connection testing UI

### Phase 3: Developer Experience
- [ ] `synkio serve` command
- [ ] Auto-check on plugin open
- [ ] "Updates available" badge
- [ ] `--copy` flag for export-baseline

### Phase 4: Polish
- [ ] Retry logic
- [ ] Better error messages
- [ ] Settings validation
- [ ] Loading states

---

## Testing Checklist

### Manual Testing
- [ ] Fetch from public GitHub repo
- [ ] Fetch from private GitHub repo with token
- [ ] Fetch from custom URL
- [ ] Fetch from localhost
- [ ] Handle network offline
- [ ] Handle 404 (file not found)
- [ ] Handle 401 (bad token)
- [ ] Handle invalid JSON
- [ ] Handle schema mismatch
- [ ] Auto-check on plugin open
- [ ] Settings persist across sessions
- [ ] Settings persist across Figma restarts

### Edge Cases
- [ ] Very large baseline file (>1MB)
- [ ] Unicode characters in token values
- [ ] Special characters in GitHub paths
- [ ] Branch names with slashes
- [ ] Rate limiting response
- [ ] Timeout handling

# Remote Sync Improvements Specification

*Technical specification for security, reliability, and performance enhancements to the remote sync feature*

---

## Overview

This document specifies improvements to the remote baseline sync feature across three phases:

1. **Phase 1: Critical Fixes** - Security & reliability issues that should be addressed immediately
2. **Phase 2: Enhanced Security** - Defense-in-depth security measures
3. **Phase 3: Performance & Scalability** - Optimizations for large design systems

---

## Phase 1: Critical Fixes (Security & Reliability)

Priority: **High**
Timeline: Before next release

### 1.1 Request Timeout

**Problem**: Fetch requests have no timeout, potentially hanging indefinitely on slow/unresponsive servers.

**Location**: `packages/figma-plugin/synkio-ui/lib/remote-fetch.ts`

**Current Code**:
```typescript
const response = await fetch(url, { headers });
```

**Solution**:
```typescript
// lib/remote-fetch.ts

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Update fetchRemoteBaseline to use fetchWithTimeout
export async function fetchRemoteBaseline(settings: PluginSettings): Promise<FetchResult> {
  const timestamp = new Date().toISOString();

  try {
    const url = buildFetchUrl(settings);
    const headers = buildHeaders(settings);

    const response = await fetchWithTimeout(url, { headers });

    // ... rest of implementation
  } catch (error) {
    const message = (error as Error).message || String(error);

    // Handle abort error specifically
    if (message.includes('aborted') || (error as Error).name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. The server took too long to respond.',
        source: buildFetchUrl(settings),
        timestamp,
        hash: '',
      };
    }

    // ... rest of error handling
  }
}
```

**Tests**:
- [ ] Request times out after 30 seconds
- [ ] Timeout error shows user-friendly message
- [ ] AbortController properly cleans up

---

### 1.2 Base64 Decoding Error Handling

**Problem**: GitHub API base64 content decoding can throw on malformed data.

**Location**: `packages/figma-plugin/synkio-ui/lib/remote-fetch.ts:227-231`

**Current Code**:
```typescript
if (parsedData.content && parsedData.encoding === 'base64') {
  const decodedContent = atob(parsedData.content.replace(/\n/g, ''));
  parsedData = JSON.parse(decodedContent);
  responseText = decodedContent;
}
```

**Solution**:
```typescript
// Handle GitHub API base64-encoded content
if (parsedData.content && parsedData.encoding === 'base64') {
  try {
    // Remove newlines and decode
    const base64Content = parsedData.content.replace(/\n/g, '');

    // Validate base64 format before decoding
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)) {
      return {
        success: false,
        error: 'Invalid base64 encoding in GitHub response',
        source: url,
        timestamp,
        hash: '',
      };
    }

    const decodedContent = atob(base64Content);

    try {
      parsedData = JSON.parse(decodedContent);
    } catch (jsonError) {
      return {
        success: false,
        error: 'GitHub response contains invalid JSON after decoding',
        source: url,
        timestamp,
        hash: '',
      };
    }

    responseText = decodedContent;
  } catch (decodeError) {
    return {
      success: false,
      error: 'Failed to decode GitHub API response. The file may be corrupted.',
      source: url,
      timestamp,
      hash: '',
    };
  }
}
```

**Tests**:
- [ ] Malformed base64 returns friendly error
- [ ] Invalid JSON after decode returns specific error
- [ ] Valid base64 + valid JSON works correctly

---

### 1.3 Port Number Validation

**Problem**: No validation of port number input in CLI serve command or plugin settings.

**Locations**:
- `packages/cli/src/cli/commands/serve.ts`
- `packages/figma-plugin/synkio-ui/lib/settings.ts`

**Solution - CLI**:
```typescript
// packages/cli/src/cli/commands/serve.ts

const MIN_PORT = 1;
const MAX_PORT = 65535;
const PRIVILEGED_PORT = 1024;

/**
 * Validate and parse port number
 */
function validatePort(port: string | number | undefined): number {
  if (port === undefined) {
    return DEFAULT_PORT;
  }

  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;

  if (isNaN(portNum)) {
    throw new Error(`Invalid port: "${port}" is not a number`);
  }

  if (portNum < MIN_PORT || portNum > MAX_PORT) {
    throw new Error(`Invalid port: ${portNum}. Must be between ${MIN_PORT} and ${MAX_PORT}`);
  }

  if (portNum < PRIVILEGED_PORT) {
    console.warn(chalk.yellow(`  Warning: Port ${portNum} is privileged and may require elevated permissions\n`));
  }

  return portNum;
}

export async function serveCommand(options: ServeOptions = {}): Promise<void> {
  let port: number;

  try {
    port = validatePort(options.port);
  } catch (error: any) {
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    process.exit(1);
  }

  const baselinePath = resolve(process.cwd(), DEFAULT_BASELINE_PATH);
  // ... rest of implementation
}
```

**Solution - Plugin Settings**:
```typescript
// packages/figma-plugin/synkio-ui/lib/settings.ts

const MIN_PORT = 1;
const MAX_PORT = 65535;
const DEFAULT_LOCALHOST_PORT = 3847;

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

// Update getStorageNumber to use validation
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
```

**Tests**:
- [ ] Invalid port string shows error
- [ ] Port 0 rejected
- [ ] Port 70000 rejected
- [ ] Privileged port shows warning
- [ ] Valid port accepted

---

### 1.4 URL Format Validation

**Problem**: Custom URLs are stored without validation, potentially causing runtime errors.

**Location**: `packages/figma-plugin/synkio-ui/lib/settings.ts`

**Solution**:
```typescript
// packages/figma-plugin/synkio-ui/lib/settings.ts

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
```

**Usage in UI**:
```typescript
// In plugin UI validation before save
function validateSettingsBeforeSave(settings: PluginSettings): string | null {
  if (!settings.remote.enabled) {
    return null; // No validation needed if disabled
  }

  if (settings.remote.type === 'url') {
    const result = validateRemoteUrl(settings.remote.url || '');
    if (!result.valid) {
      return result.error!;
    }
  }

  if (settings.remote.type === 'github') {
    const result = validateGitHubSettings(settings.remote.github!);
    if (!result.valid) {
      return result.error!;
    }
  }

  return null; // Valid
}
```

**Tests**:
- [ ] Empty URL rejected
- [ ] Invalid URL format rejected
- [ ] Non-http(s) protocol rejected
- [ ] HTTP to non-localhost shows warning
- [ ] Path traversal (`../`) rejected
- [ ] Valid settings pass validation

---

## Phase 2: Enhanced Security

Priority: **Medium**
Timeline: Next minor release

### 2.1 CORS Restriction for Serve Command

**Problem**: Current implementation allows any origin (`*`), enabling any website to fetch baseline data.

**Location**: `packages/cli/src/cli/commands/serve.ts`

**Solution - Option A: Figma Plugin Origins Only**:
```typescript
// packages/cli/src/cli/commands/serve.ts

/**
 * Known Figma plugin origins
 * Note: Figma plugins run in a sandboxed iframe, but fetch requests
 * may come from various Figma domains
 */
const ALLOWED_ORIGINS = [
  'https://www.figma.com',
  'https://figma.com',
  'null', // Figma plugin sandbox reports null origin
];

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.figma.com');
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
  } else {
    // For local development, also allow localhost origins
    if (origin?.startsWith('http://localhost:') || origin?.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Synkio-Token');
  res.setHeader('Vary', 'Origin');
}
```

**Solution - Option B: Simple Token Authentication**:
```typescript
// packages/cli/src/cli/commands/serve.ts

import { randomBytes } from 'node:crypto';

interface ServeOptions {
  port?: string | number;
  token?: string;    // User-provided token
  noToken?: boolean; // Disable token requirement
}

/**
 * Generate a random access token
 */
function generateToken(): string {
  return randomBytes(16).toString('hex');
}

export async function serveCommand(options: ServeOptions = {}): Promise<void> {
  const port = validatePort(options.port);
  const baselinePath = resolve(process.cwd(), DEFAULT_BASELINE_PATH);

  // Generate or use provided token
  const accessToken = options.noToken ? null : (options.token || generateToken());

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const timestamp = formatTimestamp();
    const method = req.method || 'GET';
    const url = req.url || '/';

    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      handleOptions(res);
      return;
    }

    // Validate token if required
    if (accessToken) {
      const providedToken = req.headers['x-synkio-token'] ||
        new URL(req.url!, `http://localhost`).searchParams.get('token');

      if (providedToken !== accessToken) {
        console.log(chalk.dim(`[${timestamp}]`), chalk.red('Unauthorized'), url);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing token' }));
        return;
      }
    }

    // Log request
    console.log(chalk.dim(`[${timestamp}]`), chalk.cyan(method), url);

    // Route requests
    if (url === '/' || url === '/baseline' || url.startsWith('/baseline?')) {
      await serveBaseline(res, baselinePath);
    } else if (url === '/health') {
      serveHealth(res);
    } else {
      serve404(res);
    }
  });

  // Start server with token info
  server.listen(port, () => {
    console.log('');
    console.log(chalk.cyan.bold('  Synkio baseline server running'));
    console.log('');

    if (accessToken) {
      console.log(chalk.dim('  Token:  '), chalk.yellow(accessToken));
      console.log(chalk.dim('  URL:    '), chalk.blue(`http://localhost:${port}/baseline?token=${accessToken}`));
    } else {
      console.log(chalk.dim('  URL:    '), chalk.blue(`http://localhost:${port}/baseline`));
      console.log(chalk.yellow('  Warning: Token authentication disabled'));
    }

    console.log(chalk.dim('  Health: '), chalk.blue(`http://localhost:${port}/health`));
    console.log('');
    console.log(chalk.cyan('  In the Figma plugin:'));
    console.log(chalk.dim('    1. Go to Settings'));
    console.log(chalk.dim('    2. Select "Local Server"'));
    console.log(chalk.dim(`    3. Port: ${port}`));
    if (accessToken) {
      console.log(chalk.dim(`    4. Token: ${accessToken}`));
    }
    console.log('');
  });
}
```

**Plugin Settings Update**:
```typescript
// packages/figma-plugin/synkio-ui/lib/settings.ts

export interface RemoteSettings {
  enabled: boolean;
  type: 'url' | 'github' | 'localhost';
  url?: string;
  github?: RemoteGitHubSettings;
  localhostPort?: number;
  localhostToken?: string; // New: token for localhost auth
}

// Add storage key
const STORAGE_KEYS = {
  // ... existing keys
  LOCALHOST_TOKEN: 'synkio_localhost_token',
} as const;
```

**Remote Fetch Update**:
```typescript
// packages/figma-plugin/synkio-ui/lib/remote-fetch.ts

export function buildFetchUrl(settings: PluginSettings): string {
  const { remote } = settings;

  if (remote.type === 'localhost') {
    const port = remote.localhostPort || 3847;
    const token = remote.localhostToken;
    const baseUrl = `http://localhost:${port}/baseline`;

    if (token) {
      return `${baseUrl}?token=${encodeURIComponent(token)}`;
    }
    return baseUrl;
  }

  // ... rest of implementation
}
```

**Tests**:
- [ ] Request without token returns 401
- [ ] Request with invalid token returns 401
- [ ] Request with valid token succeeds
- [ ] Token displayed on server start
- [ ] `--no-token` flag disables authentication

---

### 2.2 GitHub Token Scope Validation

**Problem**: Users may provide tokens with excessive permissions (full repo access when only contents:read is needed).

**Location**: `packages/figma-plugin/synkio-ui/lib/remote-fetch.ts`

**Solution**:
```typescript
// packages/figma-plugin/synkio-ui/lib/github.ts

interface TokenInfo {
  valid: boolean;
  scopes?: string[];
  warning?: string;
  error?: string;
}

/**
 * Required minimum scope for reading file contents
 */
const MINIMUM_SCOPE = 'contents:read';
const ACCEPTABLE_SCOPES = ['repo', 'public_repo', 'contents:read'];

/**
 * Check GitHub token validity and scopes
 */
export async function validateGitHubToken(token: string): Promise<TokenInfo> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 401) {
      return { valid: false, error: 'Token is invalid or expired' };
    }

    if (!response.ok) {
      return { valid: false, error: `GitHub API error: ${response.status}` };
    }

    // Check OAuth scopes from response header
    const scopesHeader = response.headers.get('X-OAuth-Scopes');
    const scopes = scopesHeader ? scopesHeader.split(',').map(s => s.trim()) : [];

    // Check for acceptable scope
    const hasAcceptableScope = scopes.some(scope => ACCEPTABLE_SCOPES.includes(scope));

    if (!hasAcceptableScope && scopes.length > 0) {
      return {
        valid: false,
        scopes,
        error: `Token missing required scope. Need one of: ${ACCEPTABLE_SCOPES.join(', ')}`,
      };
    }

    // Warn about overly permissive scopes
    const hasFullRepoAccess = scopes.includes('repo');
    const hasWriteAccess = scopes.some(s =>
      s.includes('write') || s.includes('delete') || s.includes('admin')
    );

    let warning: string | undefined;
    if (hasWriteAccess) {
      warning = 'Token has write permissions. Consider using a read-only token (contents:read) for better security.';
    } else if (hasFullRepoAccess) {
      warning = 'Token has full repo access. Consider using contents:read scope for minimal permissions.';
    }

    return { valid: true, scopes, warning };
  } catch (error) {
    return { valid: false, error: 'Network error validating token' };
  }
}

/**
 * Validate GitHub connection with token scope check
 */
export async function validateGitHubConnection(
  info: GitHubInfo,
  token?: string
): Promise<{
  valid: boolean;
  isPrivate?: boolean;
  error?: string;
  warning?: string;
}> {
  // First, validate token if provided
  if (token) {
    const tokenInfo = await validateGitHubToken(token);

    if (!tokenInfo.valid) {
      return { valid: false, error: tokenInfo.error };
    }

    // Include warning but continue
    if (tokenInfo.warning) {
      // Will be passed through to UI
    }
  }

  // Try to access the file
  const publicUrl = buildGitHubRawUrl(info);

  try {
    const publicResponse = await fetch(publicUrl, { method: 'HEAD' });

    if (publicResponse.ok) {
      return { valid: true, isPrivate: false };
    }

    if (publicResponse.status === 404) {
      if (!token) {
        return {
          valid: false,
          error: 'File not found. If this is a private repo, add a GitHub token.',
        };
      }

      // Try with token
      const apiUrl = buildGitHubApiUrl(info);
      const privateResponse = await fetch(apiUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3.raw',
        },
      });

      if (privateResponse.ok) {
        const tokenInfo = await validateGitHubToken(token);
        return {
          valid: true,
          isPrivate: true,
          warning: tokenInfo.warning,
        };
      }

      if (privateResponse.status === 404) {
        return { valid: false, error: 'File not found in repository' };
      }

      return { valid: false, error: `GitHub API error: ${privateResponse.status}` };
    }

    return { valid: false, error: `Unexpected response: ${publicResponse.status}` };
  } catch (err) {
    return { valid: false, error: 'Network error. Check your connection.' };
  }
}
```

**UI Display**:
```typescript
// In plugin UI, show warning banner when token has excessive permissions
interface ConnectionTestResult {
  success: boolean;
  isPrivate: boolean;
  error?: string;
  warning?: string;
}

function renderConnectionWarning(result: ConnectionTestResult): string {
  if (result.warning) {
    return `
      <div class="warning-banner">
        <span class="warning-icon">⚠️</span>
        <span>${result.warning}</span>
        <a href="https://github.com/settings/tokens/new?scopes=contents:read" target="_blank">
          Create minimal token
        </a>
      </div>
    `;
  }
  return '';
}
```

**Tests**:
- [ ] Token without any scopes shows error
- [ ] Token with only `contents:read` succeeds without warning
- [ ] Token with `repo` scope shows warning
- [ ] Token with write scopes shows stronger warning
- [ ] Invalid token shows clear error

---

### 2.3 Content Security Headers

**Problem**: Serve command doesn't include security headers.

**Location**: `packages/cli/src/cli/commands/serve.ts`

**Solution**:
```typescript
// packages/cli/src/cli/commands/serve.ts

/**
 * Add security headers to response
 */
function addSecurityHeaders(res: ServerResponse): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (shouldn't be embedded)
  res.setHeader('X-Frame-Options', 'DENY');

  // CSP - only allow JSON responses
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  // Disable caching for security
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

/**
 * Serve the baseline JSON file
 */
async function serveBaseline(res: ServerResponse, baselinePath: string): Promise<void> {
  try {
    const content = await readFile(baselinePath, 'utf-8');

    // Validate JSON before serving
    try {
      JSON.parse(content);
    } catch (e) {
      addCorsHeaders(res);
      addSecurityHeaders(res);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({
        error: 'Invalid JSON in baseline file',
        message: 'The baseline file contains invalid JSON. Re-run export-baseline.',
      }));
      return;
    }

    addCorsHeaders(res);
    addSecurityHeaders(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.writeHead(200);
    res.end(content);
  } catch (error: any) {
    addCorsHeaders(res);
    addSecurityHeaders(res);
    // ... error handling
  }
}
```

**Tests**:
- [ ] Response includes X-Content-Type-Options
- [ ] Response includes X-Frame-Options
- [ ] Response includes Content-Security-Policy
- [ ] Response includes Cache-Control no-store

---

### 2.4 Input Sanitization

**Problem**: User input from plugin settings could potentially contain malicious data.

**Location**: `packages/figma-plugin/synkio-ui/lib/settings.ts`

**Solution**:
```typescript
// packages/figma-plugin/synkio-ui/lib/sanitize.ts

/**
 * Sanitize string input - remove control characters and limit length
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove control characters except newlines and tabs
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim and limit length
  return cleaned.trim().slice(0, maxLength);
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(input: unknown): string {
  const sanitized = sanitizeString(input, 2000);

  // Remove javascript: and data: protocols
  if (/^(javascript|data|vbscript):/i.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize GitHub token (alphanumeric + underscore only)
 */
export function sanitizeToken(input: unknown): string {
  const sanitized = sanitizeString(input, 100);

  // GitHub tokens are alphanumeric with underscores
  // Classic: ghp_xxxx, Fine-grained: github_pat_xxxx
  if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize path (no traversal, valid chars only)
 */
export function sanitizePath(input: unknown): string {
  const sanitized = sanitizeString(input, 500);

  // Remove any path traversal attempts
  const cleaned = sanitized
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  // Only allow safe path characters
  if (!/^[a-zA-Z0-9._\/-]+$/.test(cleaned)) {
    return 'synkio/export-baseline.json'; // Return default
  }

  return cleaned;
}
```

**Usage in Settings**:
```typescript
// packages/figma-plugin/synkio-ui/lib/settings.ts

import { sanitizeString, sanitizeUrl, sanitizeToken, sanitizePath } from './sanitize';

export async function saveSettings(settings: Partial<PluginSettings>): Promise<void> {
  if (settings.remote) {
    const { remote } = settings;

    if (remote.url !== undefined) {
      await setStorageValue(STORAGE_KEYS.REMOTE_URL, sanitizeUrl(remote.url));
    }

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

  // ... rest of implementation
}
```

**Tests**:
- [ ] Control characters stripped from input
- [ ] Path traversal attempts neutralized
- [ ] javascript: URLs rejected
- [ ] Token format validated
- [ ] Excessive length truncated

---

## Phase 3: Performance & Scalability

Priority: **Medium-Low**
Timeline: Future release

### 3.1 ETag/If-None-Match Support

**Problem**: Every fetch downloads the full baseline, even if unchanged.

**Locations**:
- `packages/cli/src/cli/commands/serve.ts`
- `packages/figma-plugin/synkio-ui/lib/remote-fetch.ts`

**Solution - CLI Serve**:
```typescript
// packages/cli/src/cli/commands/serve.ts

import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';

/**
 * Generate ETag from content
 */
function generateETag(content: string): string {
  return `"${createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Serve the baseline JSON file with ETag support
 */
async function serveBaseline(
  req: IncomingMessage,
  res: ServerResponse,
  baselinePath: string
): Promise<void> {
  try {
    const content = await readFile(baselinePath, 'utf-8');
    const etag = generateETag(content);

    // Check If-None-Match header
    const clientETag = req.headers['if-none-match'];
    if (clientETag === etag) {
      addCorsHeaders(res);
      res.writeHead(304); // Not Modified
      res.end();
      console.log(chalk.dim(`[${formatTimestamp()}]`), chalk.green('304'), 'Not Modified');
      return;
    }

    // Get file modification time for Last-Modified
    const stats = await stat(baselinePath);
    const lastModified = stats.mtime.toUTCString();

    addCorsHeaders(res);
    addSecurityHeaders(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', lastModified);
    res.setHeader('Cache-Control', 'no-cache'); // Must revalidate
    res.writeHead(200);
    res.end(content);
  } catch (error: any) {
    // ... error handling
  }
}
```

**Solution - Plugin Fetch**:
```typescript
// packages/figma-plugin/synkio-ui/lib/remote-fetch.ts

/**
 * Fetch remote baseline with ETag support
 */
export async function fetchRemoteBaseline(
  settings: PluginSettings,
  lastETag?: string | null
): Promise<FetchResult> {
  const timestamp = new Date().toISOString();

  try {
    const url = buildFetchUrl(settings);
    const headers = buildHeaders(settings);

    // Add If-None-Match header if we have a cached ETag
    if (lastETag) {
      headers['If-None-Match'] = lastETag;
    }

    const response = await fetchWithTimeout(url, { headers });

    // Handle 304 Not Modified
    if (response.status === 304) {
      return {
        success: true,
        notModified: true,
        source: url,
        timestamp,
        hash: '', // Keep existing hash
        etag: lastETag || '',
      };
    }

    // ... rest of implementation

    // Extract ETag from response
    const etag = response.headers.get('ETag') || '';

    return {
      success: true,
      data: result,
      source: url,
      timestamp,
      hash,
      etag, // Include for future requests
    };
  } catch (error) {
    // ... error handling
  }
}

// Updated FetchResult interface
export interface FetchResult {
  success: boolean;
  notModified?: boolean;  // New: true if 304 response
  data?: SyncData;
  error?: string;
  source: string;
  timestamp: string;
  hash: string;
  etag?: string;  // New: ETag from response
}
```

**Storage Update**:
```typescript
// packages/figma-plugin/synkio-ui/lib/settings.ts

const STORAGE_KEYS = {
  // ... existing keys
  LAST_ETAG: 'synkio_last_etag',
} as const;

export async function getLastFetchInfo(): Promise<{
  timestamp: string | null;
  hash: string | null;
  etag: string | null;
}> {
  const timestamp = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_FETCH);
  const hash = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_REMOTE_HASH);
  const etag = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_ETAG);

  return {
    timestamp: timestamp || null,
    hash: hash || null,
    etag: etag || null,
  };
}

export async function saveLastFetchInfo(
  timestamp: string,
  hash: string,
  etag?: string
): Promise<void> {
  await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_FETCH, timestamp);
  await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_REMOTE_HASH, hash);
  if (etag) {
    await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_ETAG, etag);
  }
}
```

**Tests**:
- [ ] First request returns 200 with ETag
- [ ] Second request with If-None-Match returns 304
- [ ] Modified file returns 200 with new ETag
- [ ] ETag persists across plugin sessions

---

### 3.2 Retry Logic with Exponential Backoff

**Problem**: Network failures cause immediate failure without retry.

**Location**: `packages/figma-plugin/synkio-ui/lib/remote-fetch.ts`

**Solution**:
```typescript
// packages/figma-plugin/synkio-ui/lib/remote-fetch.ts

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;  // milliseconds
  maxDelay: number;   // milliseconds
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 10000,  // 10 seconds
};

/**
 * Errors that should not be retried
 */
const NON_RETRYABLE_ERRORS = [
  'not found',
  'Invalid',
  'Access denied',
  '401',
  '403',
  '404',
];

/**
 * Check if error is retryable
 */
function isRetryableError(error: string): boolean {
  return !NON_RETRYABLE_ERRORS.some(pattern =>
    error.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);

  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Clamp to max delay
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry support
 */
export async function fetchRemoteBaselineWithRetry(
  settings: PluginSettings,
  lastETag?: string | null,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, delay: number, error: string) => void
): Promise<FetchResult> {
  let lastResult: FetchResult | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Wait before retry (except first attempt)
    if (attempt > 0) {
      const delay = calculateDelay(attempt - 1, config);

      if (onRetry) {
        onRetry(attempt, delay, lastResult?.error || 'Unknown error');
      }

      await sleep(delay);
    }

    lastResult = await fetchRemoteBaseline(settings, lastETag);

    // Success - return immediately
    if (lastResult.success) {
      return lastResult;
    }

    // Non-retryable error - return immediately
    if (!isRetryableError(lastResult.error || '')) {
      return lastResult;
    }

    // Retryable error - continue to next attempt
  }

  // All retries exhausted
  return {
    ...lastResult!,
    error: `${lastResult!.error} (failed after ${config.maxRetries + 1} attempts)`,
  };
}
```

**UI Integration**:
```typescript
// In plugin code.ts

if (msg.type === 'fetch-remote') {
  const settings = await getSettings();

  if (!settings.remote.enabled) {
    figma.ui.postMessage({
      type: 'fetch-error',
      error: 'Remote sync not configured'
    });
    return;
  }

  figma.ui.postMessage({ type: 'fetch-started' });

  const lastFetch = await getLastFetchInfo();

  const result = await fetchRemoteBaselineWithRetry(
    settings,
    lastFetch.etag,
    undefined, // Use default config
    (attempt, delay, error) => {
      // Notify UI of retry
      figma.ui.postMessage({
        type: 'fetch-retry',
        attempt,
        delay,
        error,
      });
    }
  );

  if (!result.success) {
    figma.ui.postMessage({
      type: 'fetch-error',
      error: result.error
    });
    return;
  }

  // ... success handling
}
```

**Tests**:
- [ ] Network error triggers retry
- [ ] 404 does not retry
- [ ] 401 does not retry
- [ ] Max retries respected
- [ ] Exponential backoff applied
- [ ] Jitter prevents thundering herd

---

### 3.3 Parallel Settings Operations

**Problem**: Settings are saved/loaded sequentially, causing unnecessary latency.

**Location**: `packages/figma-plugin/synkio-ui/lib/settings.ts`

**Solution**:
```typescript
// packages/figma-plugin/synkio-ui/lib/settings.ts

/**
 * Get all settings with parallel reads
 */
export async function getSettings(): Promise<PluginSettings> {
  const defaults = getDefaultSettings();

  // Read all settings in parallel
  const [
    remoteEnabled,
    remoteType,
    remoteUrl,
    githubOwner,
    githubRepo,
    githubBranch,
    githubPath,
    githubToken,
    localhostPort,
    localhostToken,
    autoCheckOnOpen,
  ] = await Promise.all([
    getStorageBoolean(STORAGE_KEYS.REMOTE_ENABLED, defaults.remote.enabled),
    getStorageValue(STORAGE_KEYS.REMOTE_TYPE, defaults.remote.type),
    getStorageValue(STORAGE_KEYS.REMOTE_URL, ''),
    getStorageValue(STORAGE_KEYS.GITHUB_OWNER, defaults.remote.github!.owner),
    getStorageValue(STORAGE_KEYS.GITHUB_REPO, defaults.remote.github!.repo),
    getStorageValue(STORAGE_KEYS.GITHUB_BRANCH, defaults.remote.github!.branch),
    getStorageValue(STORAGE_KEYS.GITHUB_PATH, defaults.remote.github!.path),
    getStorageValue(STORAGE_KEYS.GITHUB_TOKEN, ''),
    getStorageNumber(STORAGE_KEYS.LOCALHOST_PORT, defaults.remote.localhostPort!),
    getStorageValue(STORAGE_KEYS.LOCALHOST_TOKEN, ''),
    getStorageBoolean(STORAGE_KEYS.AUTO_CHECK, defaults.autoCheckOnOpen),
  ]);

  return {
    remote: {
      enabled: remoteEnabled,
      type: remoteType as 'url' | 'github' | 'localhost',
      url: remoteUrl || undefined,
      github: {
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
        path: githubPath,
        token: githubToken || undefined,
      },
      localhostPort,
      localhostToken: localhostToken || undefined,
    },
    autoCheckOnOpen,
  };
}

/**
 * Save partial settings with parallel writes
 */
export async function saveSettings(settings: Partial<PluginSettings>): Promise<void> {
  const writes: Promise<void>[] = [];

  if (settings.remote) {
    const { remote } = settings;

    if (remote.enabled !== undefined) {
      writes.push(setStorageValue(STORAGE_KEYS.REMOTE_ENABLED, remote.enabled));
    }

    if (remote.type !== undefined) {
      writes.push(setStorageValue(STORAGE_KEYS.REMOTE_TYPE, remote.type));
    }

    if (remote.url !== undefined) {
      writes.push(setStorageValue(STORAGE_KEYS.REMOTE_URL, sanitizeUrl(remote.url)));
    }

    if (remote.localhostPort !== undefined) {
      writes.push(setStorageValue(STORAGE_KEYS.LOCALHOST_PORT, remote.localhostPort));
    }

    if (remote.localhostToken !== undefined) {
      writes.push(setStorageValue(STORAGE_KEYS.LOCALHOST_TOKEN, sanitizeToken(remote.localhostToken)));
    }

    if (remote.github) {
      const { github } = remote;

      if (github.owner !== undefined) {
        writes.push(setStorageValue(STORAGE_KEYS.GITHUB_OWNER, sanitizeString(github.owner, 100)));
      }
      if (github.repo !== undefined) {
        writes.push(setStorageValue(STORAGE_KEYS.GITHUB_REPO, sanitizeString(github.repo, 100)));
      }
      if (github.branch !== undefined) {
        writes.push(setStorageValue(STORAGE_KEYS.GITHUB_BRANCH, sanitizeString(github.branch, 100)));
      }
      if (github.path !== undefined) {
        writes.push(setStorageValue(STORAGE_KEYS.GITHUB_PATH, sanitizePath(github.path)));
      }
      if (github.token !== undefined) {
        writes.push(setStorageValue(STORAGE_KEYS.GITHUB_TOKEN, sanitizeToken(github.token)));
      }
    }
  }

  if (settings.autoCheckOnOpen !== undefined) {
    writes.push(setStorageValue(STORAGE_KEYS.AUTO_CHECK, settings.autoCheckOnOpen));
  }

  // Execute all writes in parallel
  await Promise.all(writes);
}
```

**Tests**:
- [ ] Settings load faster than sequential
- [ ] Settings save faster than sequential
- [ ] All settings correctly saved
- [ ] Partial updates work correctly

---

### 3.4 Optional Compression Support

**Problem**: Large baseline files (100KB+) transfer slowly.

**Locations**:
- `packages/cli/src/cli/commands/serve.ts`
- `packages/figma-plugin/synkio-ui/lib/remote-fetch.ts`

**Solution - CLI Serve**:
```typescript
// packages/cli/src/cli/commands/serve.ts

import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/**
 * Check if client accepts gzip encoding
 */
function acceptsGzip(req: IncomingMessage): boolean {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  return acceptEncoding.includes('gzip');
}

/**
 * Compress content with gzip
 */
async function gzipContent(content: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const gzip = createGzip();

    gzip.on('data', chunk => chunks.push(chunk));
    gzip.on('end', () => resolve(Buffer.concat(chunks)));
    gzip.on('error', reject);

    gzip.write(content);
    gzip.end();
  });
}

/**
 * Serve the baseline JSON file with optional compression
 */
async function serveBaseline(
  req: IncomingMessage,
  res: ServerResponse,
  baselinePath: string
): Promise<void> {
  try {
    const content = await readFile(baselinePath, 'utf-8');
    const etag = generateETag(content);

    // Check If-None-Match
    const clientETag = req.headers['if-none-match'];
    if (clientETag === etag) {
      addCorsHeaders(res);
      res.writeHead(304);
      res.end();
      return;
    }

    addCorsHeaders(res);
    addSecurityHeaders(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('ETag', etag);
    res.setHeader('Vary', 'Accept-Encoding');

    // Compress if client accepts and content is large enough
    const COMPRESSION_THRESHOLD = 1024; // 1KB

    if (acceptsGzip(req) && content.length > COMPRESSION_THRESHOLD) {
      const compressed = await gzipContent(content);

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', compressed.length);
      res.writeHead(200);
      res.end(compressed);

      console.log(
        chalk.dim(`[${formatTimestamp()}]`),
        chalk.green('200'),
        chalk.dim(`(gzip: ${content.length} → ${compressed.length} bytes)`)
      );
    } else {
      res.setHeader('Content-Length', Buffer.byteLength(content));
      res.writeHead(200);
      res.end(content);
    }
  } catch (error: any) {
    // ... error handling
  }
}
```

**Note**: Figma plugin's fetch API handles gzip decompression automatically, so no plugin changes needed.

**Tests**:
- [ ] Small files served uncompressed
- [ ] Large files compressed when Accept-Encoding: gzip
- [ ] Correct Content-Encoding header set
- [ ] ETag same for compressed and uncompressed
- [ ] Compression ratio logged

---

### 3.5 Rate Limit Handling for GitHub

**Problem**: GitHub API has rate limits that aren't tracked.

**Location**: `packages/figma-plugin/synkio-ui/lib/remote-fetch.ts`

**Solution**:
```typescript
// packages/figma-plugin/synkio-ui/lib/github.ts

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  isLimited: boolean;
}

/**
 * Parse rate limit headers from GitHub response
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: new Date(parseInt(reset, 10) * 1000),
    isLimited: parseInt(remaining, 10) === 0,
  };
}

/**
 * Format rate limit for user display
 */
export function formatRateLimitMessage(info: RateLimitInfo): string {
  const resetIn = Math.ceil((info.reset.getTime() - Date.now()) / 60000);

  if (info.isLimited) {
    return `Rate limit exceeded. Resets in ${resetIn} minute${resetIn !== 1 ? 's' : ''}.`;
  }

  if (info.remaining < 10) {
    return `Warning: Only ${info.remaining} GitHub API requests remaining. Resets in ${resetIn} min.`;
  }

  return '';
}
```

**Integration in Remote Fetch**:
```typescript
// packages/figma-plugin/synkio-ui/lib/remote-fetch.ts

import { parseRateLimitHeaders, formatRateLimitMessage } from './github';

export interface FetchResult {
  success: boolean;
  notModified?: boolean;
  data?: SyncData;
  error?: string;
  warning?: string;  // New: for rate limit warnings
  source: string;
  timestamp: string;
  hash: string;
  etag?: string;
  rateLimit?: RateLimitInfo;  // New: rate limit info
}

export async function fetchRemoteBaseline(
  settings: PluginSettings,
  lastETag?: string | null
): Promise<FetchResult> {
  // ... existing code ...

  const response = await fetchWithTimeout(url, { headers });

  // Parse rate limit headers for GitHub requests
  let rateLimit: RateLimitInfo | undefined;
  let warning: string | undefined;

  if (settings.remote.type === 'github') {
    rateLimit = parseRateLimitHeaders(response.headers) || undefined;

    if (rateLimit) {
      if (rateLimit.isLimited) {
        return {
          success: false,
          error: formatRateLimitMessage(rateLimit),
          source: url,
          timestamp,
          hash: '',
          rateLimit,
        };
      }

      warning = formatRateLimitMessage(rateLimit);
    }
  }

  // Handle HTTP errors
  if (!response.ok) {
    if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait and try again.',
        source: url,
        timestamp,
        hash: '',
        rateLimit,
      };
    }

    // ... rest of error handling
  }

  // ... rest of success handling

  return {
    success: true,
    data: result,
    source: url,
    timestamp,
    hash,
    etag,
    warning,  // Include rate limit warning if applicable
    rateLimit,
  };
}
```

**Tests**:
- [ ] Rate limit headers parsed correctly
- [ ] Rate limited request (remaining=0) shows error
- [ ] Low remaining count shows warning
- [ ] 429 response handled gracefully
- [ ] Reset time calculated correctly

---

## Implementation Checklist

### Phase 1: Critical Fixes
- [ ] 1.1 Request Timeout
- [ ] 1.2 Base64 Decoding Error Handling
- [ ] 1.3 Port Number Validation
- [ ] 1.4 URL Format Validation

### Phase 2: Enhanced Security
- [ ] 2.1 CORS Restriction (choose Option A or B)
- [ ] 2.2 GitHub Token Scope Validation
- [ ] 2.3 Content Security Headers
- [ ] 2.4 Input Sanitization

### Phase 3: Performance & Scalability
- [ ] 3.1 ETag/If-None-Match Support
- [ ] 3.2 Retry Logic with Exponential Backoff
- [ ] 3.3 Parallel Settings Operations
- [ ] 3.4 Optional Compression Support
- [ ] 3.5 Rate Limit Handling for GitHub

---

## Migration Notes

### Breaking Changes

None - all changes are backward compatible.

### Configuration Changes

New optional settings:
- `localhostToken` - Token for localhost authentication (Phase 2.1)

### Storage Keys Added

- `synkio_localhost_token` - Localhost auth token
- `synkio_last_etag` - ETag for caching

---

## References

- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [HTTP Caching - ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
- [Figma Plugin API - clientStorage](https://www.figma.com/plugin-docs/api/figma-clientStorage/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

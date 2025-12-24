/**
 * GitHub URL Parser Utility
 *
 * Parses various GitHub URL formats into structured components for fetching design token files.
 */

export interface GitHubInfo {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

const DEFAULT_BRANCH = 'main';
const DEFAULT_PATH = '.synkio/export-baseline.json';

/**
 * Parse various GitHub URL formats into structured components.
 *
 * Supported formats:
 * - `owner/repo` → defaults to main branch and .synkio/export-baseline.json
 * - `https://github.com/owner/repo` → defaults to main branch and .synkio/export-baseline.json
 * - `https://github.com/owner/repo/blob/branch/path/to/file.json`
 * - `https://raw.githubusercontent.com/owner/repo/branch/path/to/file.json`
 *
 * Edge cases handled:
 * - Trailing slashes on repo URLs
 * - `.git` suffix on repo URLs
 * - Branch names (first segment after blob/tree is treated as branch)
 *
 * @param input - GitHub URL or owner/repo string
 * @returns Parsed GitHub info or null if invalid
 */
export function parseGitHubUrl(input: string): GitHubInfo | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  input = input.trim();

  // Handle owner/repo format (no protocol)
  if (!input.includes('://')) {
    const parts = input.split('/').filter(Boolean);
    if (parts.length === 2 && parts[0] && parts[1]) {
      // Check if first part looks like a domain (has a dot)
      // If not, treat it as owner/repo format
      if (!parts[0].includes('.')) {
        return {
          owner: parts[0],
          repo: parts[1],
          branch: DEFAULT_BRANCH,
          path: DEFAULT_PATH,
        };
      }
    }
  }

  // Parse as URL
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  // Check if it's a GitHub URL
  if (url.hostname !== 'github.com' && url.hostname !== 'raw.githubusercontent.com') {
    return null;
  }

  // Parse pathname, removing trailing slashes
  const pathname = url.pathname.replace(/\/+$/, '');
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const owner = segments[0];
  let repo = segments[1];

  // Remove .git suffix if present
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  // Handle raw.githubusercontent.com URLs
  // Format: /owner/repo/branch/path/to/file.json
  if (url.hostname === 'raw.githubusercontent.com') {
    if (segments.length >= 3) {
      const branch = segments[2];
      const path = segments.slice(3).join('/') || DEFAULT_PATH;
      return { owner, repo, branch, path };
    }
    return { owner, repo, branch: DEFAULT_BRANCH, path: DEFAULT_PATH };
  }

  // Handle github.com URLs
  if (segments.length === 2) {
    // Just owner/repo
    return { owner, repo, branch: DEFAULT_BRANCH, path: DEFAULT_PATH };
  }

  // Check for blob or tree URLs
  // Format: /owner/repo/blob/branch/path/to/file.json
  // Note: This assumes the first segment after blob/tree is the branch name.
  // Multi-segment branch names (e.g., feature/my-branch) will have the first
  // segment treated as the branch and the rest as path.
  if (segments[2] === 'blob' || segments[2] === 'tree') {
    if (segments.length >= 4) {
      const branch = segments[3];
      const path = segments.slice(4).join('/') || DEFAULT_PATH;
      return { owner, repo, branch, path };
    }
  }

  // Default fallback for other GitHub URLs
  return { owner, repo, branch: DEFAULT_BRANCH, path: DEFAULT_PATH };
}

/**
 * Build a raw.githubusercontent.com URL for fetching file contents.
 *
 * @param info - Parsed GitHub info
 * @returns Raw content URL
 */
export function buildGitHubRawUrl(info: GitHubInfo): string {
  return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${info.path}`;
}

/**
 * Build a GitHub API URL for fetching file contents (supports private repos with auth).
 *
 * @param info - Parsed GitHub info
 * @returns GitHub API URL
 */
export function buildGitHubApiUrl(info: GitHubInfo): string {
  return `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${info.path}?ref=${info.branch}`;
}

/**
 * Quick check if a string looks like a GitHub reference.
 *
 * @param input - String to check
 * @returns True if it looks like a GitHub URL or owner/repo format
 */
export function isGitHubUrl(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  input = input.trim();

  // Check for owner/repo format (no protocol)
  if (!input.includes('://')) {
    const parts = input.split('/').filter(Boolean);
    if (parts.length === 2 && parts[0] && parts[1]) {
      // Check if first part looks like a domain (has a dot)
      // If not, treat it as owner/repo format
      if (!parts[0].includes('.')) {
        return true;
      }
    }
  }

  // Check for GitHub URLs
  try {
    const url = new URL(input);
    return url.hostname === 'github.com' || url.hostname === 'raw.githubusercontent.com';
  } catch {
    return false;
  }
}

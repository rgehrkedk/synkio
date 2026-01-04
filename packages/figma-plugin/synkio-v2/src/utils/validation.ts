// =============================================================================
// Input Validation Utilities
// =============================================================================

/**
 * Result of a validation check.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// GitHub Validation
// =============================================================================

/**
 * GitHub username/organization regex.
 * - Must start with alphanumeric
 * - Can contain hyphens
 * - Must end with alphanumeric
 * - Max 39 characters
 */
const GITHUB_OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

/**
 * GitHub repository name regex.
 * - Can contain alphanumeric, dots, hyphens, underscores
 * - Max 100 characters
 */
const GITHUB_REPO_REGEX = /^[a-zA-Z0-9._-]{1,100}$/;

/**
 * GitHub branch name regex.
 * - Can contain alphanumeric, dots, hyphens, underscores, slashes
 * - Cannot start with a slash
 * - Cannot end with .lock
 */
const GITHUB_BRANCH_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]{0,254}(?<!\.lock)$/;

/**
 * Validates a GitHub owner (username or organization).
 */
export function validateGitHubOwner(owner: string): ValidationResult {
  if (!owner) {
    return { valid: false, error: 'Owner is required' };
  }
  if (owner.length > 39) {
    return { valid: false, error: 'Owner name is too long (max 39 characters)' };
  }
  if (!GITHUB_OWNER_REGEX.test(owner)) {
    return {
      valid: false,
      error: 'Invalid owner name. Use only letters, numbers, and hyphens.',
    };
  }
  return { valid: true };
}

/**
 * Validates a GitHub repository name.
 */
export function validateGitHubRepo(repo: string): ValidationResult {
  if (!repo) {
    return { valid: false, error: 'Repository is required' };
  }
  if (repo.length > 100) {
    return { valid: false, error: 'Repository name is too long (max 100 characters)' };
  }
  if (!GITHUB_REPO_REGEX.test(repo)) {
    return {
      valid: false,
      error: 'Invalid repository name. Use only letters, numbers, dots, hyphens, and underscores.',
    };
  }
  return { valid: true };
}

/**
 * Validates a GitHub branch name.
 */
export function validateGitHubBranch(branch: string): ValidationResult {
  if (!branch) {
    return { valid: true }; // Optional, defaults to 'main'
  }
  if (branch.length > 255) {
    return { valid: false, error: 'Branch name is too long (max 255 characters)' };
  }
  if (branch.startsWith('/') || branch.endsWith('/')) {
    return { valid: false, error: 'Branch name cannot start or end with a slash' };
  }
  if (branch.includes('..')) {
    return { valid: false, error: 'Branch name cannot contain ".."' };
  }
  if (!GITHUB_BRANCH_REGEX.test(branch)) {
    return {
      valid: false,
      error: 'Invalid branch name format',
    };
  }
  return { valid: true };
}

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Validates a URL.
 *
 * @param url - URL to validate
 * @param fieldName - Name of the field for error messages
 */
export function validateUrl(url: string, fieldName = 'URL'): ValidationResult {
  if (!url) {
    return { valid: false, error: `${fieldName} is required` };
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: `${fieldName} must use HTTP or HTTPS protocol` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: `Invalid ${fieldName} format` };
  }
}

// =============================================================================
// File Path Validation
// =============================================================================

/**
 * Patterns that indicate path traversal or injection attempts.
 */
const PATH_INJECTION_PATTERNS = /(\.\.|\/\/|\\\\|^\/|^\||[<>"|?*\x00-\x1f])/;

/**
 * Validates a file path.
 */
export function validateFilePath(path: string): ValidationResult {
  if (!path) {
    return { valid: true }; // Optional, has defaults
  }
  if (path.length > 500) {
    return { valid: false, error: 'Path is too long (max 500 characters)' };
  }
  if (PATH_INJECTION_PATTERNS.test(path)) {
    return { valid: false, error: 'Path contains invalid characters' };
  }
  if (path.startsWith('/') || path.startsWith('\\')) {
    return { valid: false, error: 'Path must be relative, not absolute' };
  }
  return { valid: true };
}

// =============================================================================
// Combined Validators
// =============================================================================

import { GitHubSettings, UrlSettings } from '../lib/types';

/**
 * Validates all GitHub settings at once.
 */
export function validateGitHubSettings(settings: Partial<GitHubSettings>): ValidationResult {
  const ownerResult = validateGitHubOwner(settings.owner || '');
  if (!ownerResult.valid) return ownerResult;

  const repoResult = validateGitHubRepo(settings.repo || '');
  if (!repoResult.valid) return repoResult;

  const branchResult = validateGitHubBranch(settings.branch || '');
  if (!branchResult.valid) return branchResult;

  const pathResult = validateFilePath(settings.path || '');
  if (!pathResult.valid) return pathResult;

  return { valid: true };
}

/**
 * Validates all URL settings at once.
 */
export function validateUrlSettings(settings: Partial<UrlSettings>): ValidationResult {
  if (settings.baselineUrl) {
    const baselineResult = validateUrl(settings.baselineUrl, 'Baseline URL');
    if (!baselineResult.valid) return baselineResult;
  }

  return { valid: true };
}

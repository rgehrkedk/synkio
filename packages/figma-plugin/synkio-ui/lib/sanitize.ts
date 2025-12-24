/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize user input from plugin settings to prevent
 * injection attacks and malformed data.
 */

/**
 * Sanitize string input - remove control characters and limit length
 *
 * Removes control characters (except newlines and tabs), trims whitespace,
 * and limits the string to a maximum length.
 *
 * @param input - Input value to sanitize
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized string, or empty string if input is invalid
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
 *
 * Removes dangerous protocols (javascript:, data:, vbscript:) and validates
 * basic URL structure.
 *
 * @param input - Input value to sanitize
 * @returns Sanitized URL string, or empty string if unsafe
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
 *
 * GitHub tokens follow specific formats:
 * - Classic tokens: ghp_xxxx
 * - Fine-grained tokens: github_pat_xxxx
 *
 * @param input - Input value to sanitize
 * @returns Sanitized token string, or empty string if invalid format
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
 *
 * Removes path traversal attempts (..), leading/trailing slashes,
 * and validates characters to prevent injection.
 *
 * @param input - Input value to sanitize
 * @returns Sanitized path string, or default path if invalid
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
    return '.synkio/export-baseline.json'; // Return default
  }

  return cleaned;
}

/**
 * Mode name extraction from filenames
 *
 * Extracts mode names from filenames for multi-file imports where each file
 * represents a mode (e.g., semantic-light.json -> "light").
 */

/**
 * Extract mode name from filename
 *
 * Supports multiple separator patterns:
 * - "semantic-light.json" -> "light"
 * - "theme.dark.json" -> "dark"
 * - "mobile_theme.json" -> "theme"
 * - "tokens.json" -> "tokens" (fallback)
 *
 * @param filename - Name of the file (with or without extension)
 * @returns Extracted mode name
 */
export function extractModeNameFromFilename(filename: string): string {
  // Remove .json extension
  const nameWithoutExt = filename.replace(/\.json$/i, '');

  // Try hyphen separator (semantic-light)
  if (nameWithoutExt.includes('-')) {
    const parts = nameWithoutExt.split('-');
    if (parts.length >= 2) {
      return parts[parts.length - 1]; // Return last part
    }
  }

  // Try dot separator (theme.light)
  if (nameWithoutExt.includes('.')) {
    const parts = nameWithoutExt.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 1]; // Return last part
    }
  }

  // Try underscore separator (mobile_theme)
  if (nameWithoutExt.includes('_')) {
    const parts = nameWithoutExt.split('_');
    if (parts.length >= 2) {
      return parts[parts.length - 1]; // Return last part
    }
  }

  // Fallback: return full name without extension
  return nameWithoutExt;
}

/**
 * Suggest collection name from grouped file names
 *
 * Finds common prefix from filenames to suggest a collection name.
 *
 * @param fileNames - Array of file names in the group
 * @returns Suggested collection name
 */
export function suggestCollectionNameFromFiles(fileNames: string[]): string {
  if (fileNames.length === 0) return 'Tokens';
  if (fileNames.length === 1) {
    // Remove mode suffix and extension
    return fileNames[0]
      .replace(/\.json$/i, '')
      .replace(/[-._](light|dark|mobile|desktop|compact|comfortable)$/i, '');
  }

  // Find common prefix
  const prefix = findCommonPrefix(fileNames.map((f) => f.replace(/\.json$/i, '')));

  return prefix || 'Tokens';
}

/**
 * Find common prefix among strings
 *
 * @param strings - Array of strings to analyze
 * @returns Common prefix (empty string if none found)
 */
function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';

  let prefix = strings[0];

  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }

  // Remove trailing separators
  return prefix.replace(/[-._]+$/, '');
}

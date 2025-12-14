/**
 * Multi-file structure validation
 *
 * Validates that files in a group have compatible structures for merging
 * as modes in a single collection.
 */

export interface FileData {
  fileName: string;
  data: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that multiple files have compatible structures
 *
 * For files to be imported as modes in a single collection, they must:
 * - Have the same token keys (variable names)
 * - Have the same structure depth
 * - Have compatible value types
 *
 * @param files - Array of files to validate
 * @returns Validation result with errors and warnings
 */
export function validateMultiFileStructure(files: FileData[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (files.length === 0) {
    return {
      valid: false,
      errors: ['No files provided for validation'],
      warnings,
    };
  }

  if (files.length === 1) {
    // Single file is always valid
    return { valid: true, errors: [], warnings: [] };
  }

  // Extract token keys from each file
  const fileTokenKeys = files.map((file) => {
    const keys = extractTokenKeys(file.data);
    return { fileName: file.fileName, keys };
  });

  // Check if all files have the same keys
  const firstFileKeys = fileTokenKeys[0].keys;
  const firstFileName = fileTokenKeys[0].fileName;

  for (let i = 1; i < fileTokenKeys.length; i++) {
    const currentKeys = fileTokenKeys[i].keys;
    const currentFileName = fileTokenKeys[i].fileName;

    // Find missing keys
    const missingInCurrent = firstFileKeys.filter((key) => !currentKeys.includes(key));
    const extraInCurrent = currentKeys.filter((key) => !firstFileKeys.includes(key));

    if (missingInCurrent.length > 0) {
      errors.push(
        `File "${currentFileName}" is missing keys found in "${firstFileName}": ${missingInCurrent.slice(0, 5).join(', ')}${missingInCurrent.length > 5 ? '...' : ''}`
      );
    }

    if (extraInCurrent.length > 0) {
      warnings.push(
        `File "${currentFileName}" has extra keys not in "${firstFileName}": ${extraInCurrent.slice(0, 5).join(', ')}${extraInCurrent.length > 5 ? '...' : ''}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract all token keys from a JSON object
 *
 * Recursively traverses the structure and collects all paths to leaf values.
 *
 * @param obj - JSON object to traverse
 * @param prefix - Current path prefix (for recursion)
 * @returns Array of token key paths
 */
function extractTokenKeys(obj: any, prefix: string = ''): string[] {
  const keys: string[] = [];

  if (!obj || typeof obj !== 'object') {
    return keys;
  }

  // Check if this is a token (has value)
  if (isTokenValue(obj)) {
    return [prefix];
  }

  // Recurse into nested objects
  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = prefix ? `${prefix}/${key}` : key;

    if (isTokenValue(value)) {
      keys.push(newPrefix);
    } else if (value && typeof value === 'object') {
      keys.push(...extractTokenKeys(value, newPrefix));
    }
  }

  return keys;
}

/**
 * Check if a value is a token value (leaf node)
 *
 * @param value - Value to check
 * @returns True if this is a token value
 */
function isTokenValue(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  // Primitive values are tokens
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  // DTCG format: object with $value
  if (typeof value === 'object' && '$value' in value) {
    return true;
  }

  // Legacy format: object with value
  if (typeof value === 'object' && 'value' in value && !('$value' in value)) {
    return true;
  }

  return false;
}

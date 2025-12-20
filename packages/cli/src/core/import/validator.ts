/**
 * Validator Module
 *
 * Validates import files are in Figma native format.
 */

import { isFigmaNativeFormat as checkFigmaNativeFormat } from '../figma-native.js';
import type { ImportFile } from './source-resolver.js';

/**
 * Validation result for import files
 */
export interface ValidationResult {
  /** Whether all files passed validation */
  valid: boolean;
  /** Error messages for failed validations */
  errors: string[];
}

/**
 * Re-export isFigmaNativeFormat from figma-native
 * for convenience and API consistency
 */
export const isFigmaNativeFormat = checkFigmaNativeFormat;

/**
 * Generate error message for invalid file format
 *
 * @param filename - Name of the invalid file
 * @returns Formatted error message with instructions
 */
export function formatInvalidFormatError(filename: string): string {
  return (
    `File "${filename}" is not in Figma native export format.\n\n` +
    '  Expected format with $type, $value, and $extensions.com.figma.variableId\n' +
    '  Export from Figma: File -> Export -> Variables -> JSON'
  );
}

/**
 * Validate that all import files are in Figma native format
 *
 * @param files - Array of files to validate
 * @returns Validation result with success status and any errors
 *
 * @example
 * ```typescript
 * const result = validateImportFiles([
 *   { content: jsonContent, filename: 'theme.json', collection: 'theme' }
 * ]);
 *
 * if (!result.valid) {
 *   console.error(result.errors.join('\n'));
 *   process.exit(1);
 * }
 * ```
 */
export function validateImportFiles(files: ImportFile[]): ValidationResult {
  const errors: string[] = [];

  for (const { content, filename } of files) {
    if (!isFigmaNativeFormat(content)) {
      errors.push(formatInvalidFormatError(filename));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

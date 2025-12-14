/**
 * Level configuration validation utilities
 * Client-side validation before backend processing
 */

import type { LevelConfiguration } from '../../types/level-config.types.js';

export interface LevelValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate level role assignments
 * - At least one level must be 'collection'
 * - Depths must be sequential
 * - Returns errors, warnings, and overall validity
 */
export function validateLevelRoles(levels: LevelConfiguration[]): LevelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty levels
  if (levels.length === 0) {
    errors.push('No level configurations provided');
    return { valid: false, errors, warnings };
  }

  // Check for at least one collection
  const hasCollection = levels.some((level) => level.role === 'collection');
  if (!hasCollection) {
    errors.push('At least one level must be mapped as Collection');
  }

  // Check depths are sequential starting from 1
  const depths = levels.map((level) => level.depth).sort((a, b) => a - b);
  for (let i = 0; i < depths.length; i++) {
    if (depths[i] !== i + 1) {
      errors.push(`Level depths must be sequential starting from 1. Found gap at depth ${i + 1}`);
      break;
    }
  }

  // Warning if no mode selected
  const hasMode = levels.some((level) => level.role === 'mode');
  if (!hasMode) {
    warnings.push('No Mode level defined - a default mode will be created for each collection');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a level configuration has warnings (but is still valid)
 */
export function hasWarnings(levels: LevelConfiguration[]): boolean {
  const result = validateLevelRoles(levels);
  return result.valid && result.warnings.length > 0;
}

/**
 * Get a user-friendly error message for display
 */
export function getErrorMessage(levels: LevelConfiguration[]): string | null {
  const result = validateLevelRoles(levels);
  return result.errors.length > 0 ? result.errors[0] : null;
}

/**
 * Get warning messages for display
 */
export function getWarningMessages(levels: LevelConfiguration[]): string[] {
  const result = validateLevelRoles(levels);
  return result.warnings;
}

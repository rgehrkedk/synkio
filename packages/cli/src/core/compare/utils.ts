/**
 * Compare Utilities
 *
 * Helper functions for comparison operations.
 */

import type { ComparisonResult } from '../../types/index.js';

/**
 * Change counts summary
 */
export interface ChangeCounts {
  valueChanges: number;
  pathChanges: number;
  collectionRenames: number;
  modeRenames: number;
  newModes: number;
  deletedModes: number;
  newVariables: number;
  deletedVariables: number;
  total: number;
  breaking: number;
}

/**
 * Check if there are any changes in the comparison result
 *
 * @param result - Comparison result
 * @returns true if any changes were detected
 */
export function hasChanges(result: ComparisonResult): boolean {
  return (
    result.valueChanges.length > 0 ||
    result.pathChanges.length > 0 ||
    result.collectionRenames.length > 0 ||
    result.modeRenames.length > 0 ||
    result.newModes.length > 0 ||
    result.deletedModes.length > 0 ||
    result.newVariables.length > 0 ||
    result.deletedVariables.length > 0
  );
}

/**
 * Check if there are breaking changes in the comparison result.
 * Breaking changes require developer action (path changes, mode changes, deletions).
 *
 * @param result - Comparison result
 * @returns true if breaking changes were detected
 */
export function hasBreakingChanges(result: ComparisonResult): boolean {
  return (
    result.pathChanges.length > 0 ||
    result.collectionRenames.length > 0 ||
    result.modeRenames.length > 0 ||
    result.newModes.length > 0 ||
    result.deletedModes.length > 0 ||
    result.deletedVariables.length > 0
  );
}

/**
 * Get counts summary from a comparison result
 *
 * @param result - Comparison result
 * @returns ChangeCounts object with all counts and totals
 */
export function getChangeCounts(result: ComparisonResult): ChangeCounts {
  return {
    valueChanges: result.valueChanges.length,
    pathChanges: result.pathChanges.length,
    collectionRenames: result.collectionRenames.length,
    modeRenames: result.modeRenames.length,
    newModes: result.newModes.length,
    deletedModes: result.deletedModes.length,
    newVariables: result.newVariables.length,
    deletedVariables: result.deletedVariables.length,
    total:
      result.valueChanges.length +
      result.pathChanges.length +
      result.collectionRenames.length +
      result.modeRenames.length +
      result.newModes.length +
      result.deletedModes.length +
      result.newVariables.length +
      result.deletedVariables.length,
    breaking:
      result.pathChanges.length +
      result.collectionRenames.length +
      result.modeRenames.length +
      result.newModes.length +
      result.deletedModes.length +
      result.deletedVariables.length,
  };
}

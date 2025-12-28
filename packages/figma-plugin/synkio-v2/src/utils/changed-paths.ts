// =============================================================================
// Changed Path Utilities
// =============================================================================

import { ComparisonResult } from '../lib/types';

/**
 * Extract a list of changed paths from a comparison result.
 * This is used for storing a summary of changes in sync history.
 *
 * @param diff - The comparison result from comparing two baselines
 * @returns Array of path strings describing the changes (limited to 20)
 */
export function getChangedPaths(diff: ComparisonResult): string[] {
  const paths: string[] = [];

  for (const change of diff.valueChanges) {
    paths.push(change.path);
  }
  for (const change of diff.pathChanges) {
    paths.push(`${change.oldPath} -> ${change.newPath}`);
  }
  for (const newVar of diff.newVariables) {
    paths.push(`+ ${newVar.path}`);
  }
  for (const deleted of diff.deletedVariables) {
    paths.push(`- ${deleted.path}`);
  }

  return paths.slice(0, 20); // Limit to 20 for storage
}

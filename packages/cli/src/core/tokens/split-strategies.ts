/**
 * Split Strategies
 *
 * Handles the logic for determining how tokens are split into files
 * based on the splitBy configuration (mode, group, none).
 */

import type { SplitBy } from '../config.js';
import type { CollectionSplitOptions } from '../tokens.js';

/**
 * Result of determining split strategy for a token
 */
export interface SplitResult {
  fileKey: string;
  nestedPath: string[];
  group?: string;
}

/**
 * Options for determining split strategy
 */
export interface SplitStrategyOptions {
  collection: string;
  mode: string;
  pathParts: string[];
  collectionConfig?: CollectionSplitOptions[string];
  defaultSplitBy: SplitBy;
  defaultIncludeMode: boolean;
}

/**
 * Determines how a token should be split into files based on configuration.
 *
 * @param options - The options for determining split strategy
 * @returns SplitResult containing fileKey, nestedPath, and optionally group
 *
 * @example
 * // Mode splitting
 * determineSplitStrategy({
 *   collection: 'theme',
 *   mode: 'light',
 *   pathParts: ['bg', 'primary'],
 *   defaultSplitBy: 'mode',
 *   defaultIncludeMode: false
 * }) // -> { fileKey: 'theme.light', nestedPath: ['bg', 'primary'] }
 *
 * // Group splitting
 * determineSplitStrategy({
 *   collection: 'globals',
 *   mode: 'default',
 *   pathParts: ['colors', 'primary'],
 *   collectionConfig: { splitBy: 'group' },
 *   defaultSplitBy: 'mode',
 *   defaultIncludeMode: false
 * }) // -> { fileKey: 'globals.colors', nestedPath: ['primary'], group: 'colors' }
 */
export function determineSplitStrategy(options: SplitStrategyOptions): SplitResult {
  const {
    collection,
    mode,
    pathParts,
    collectionConfig,
    defaultSplitBy,
    defaultIncludeMode,
  } = options;

  const splitBy: SplitBy = collectionConfig?.splitBy ?? defaultSplitBy;
  const shouldIncludeMode = collectionConfig?.includeMode ?? defaultIncludeMode;
  const topLevelGroup = pathParts[0];

  const fileKey = getFileKey(collection, mode, topLevelGroup, splitBy);
  const nestedPath = getNestedPath(pathParts, mode, splitBy, shouldIncludeMode);
  const group = splitBy === 'group' ? topLevelGroup : undefined;

  return { fileKey, nestedPath, group };
}

/**
 * Generates the file key based on collection, mode, group, and split strategy.
 *
 * @param collection - The collection name
 * @param mode - The mode name
 * @param group - The top-level group name
 * @param splitBy - The split strategy
 * @returns The file key string
 *
 * @example
 * getFileKey('theme', 'light', 'bg', 'mode') // -> 'theme.light'
 * getFileKey('globals', 'default', 'colors', 'group') // -> 'globals.colors'
 * getFileKey('theme', 'light', 'bg', 'none') // -> 'theme'
 */
export function getFileKey(
  collection: string,
  mode: string,
  group: string,
  splitBy: SplitBy
): string {
  if (splitBy === 'mode') {
    return `${collection}.${mode}`;
  }
  if (splitBy === 'group') {
    return `${collection}.${group}`;
  }
  // splitBy === 'none'
  return collection;
}

/**
 * Generates the nested path for a token based on split strategy and includeMode setting.
 *
 * @param pathParts - The path parts of the token
 * @param mode - The mode name
 * @param splitBy - The split strategy
 * @param shouldIncludeMode - Whether to include mode as first-level key
 * @returns The nested path array
 *
 * @example
 * getNestedPath(['colors', 'primary'], 'light', 'mode', false) // -> ['colors', 'primary']
 * getNestedPath(['colors', 'primary'], 'light', 'mode', true) // -> ['light', 'colors', 'primary']
 * getNestedPath(['colors', 'primary'], 'light', 'group', false) // -> ['primary']
 * getNestedPath(['colors', 'primary'], 'light', 'group', true) // -> ['light', 'primary']
 */
export function getNestedPath(
  pathParts: string[],
  mode: string,
  splitBy: SplitBy,
  shouldIncludeMode: boolean
): string[] {
  if (splitBy === 'group') {
    // Remove the top-level group from path since it's now the file name
    const remainingPath = pathParts.slice(1);
    return shouldIncludeMode ? [mode, ...remainingPath] : remainingPath;
  }

  // splitBy === 'mode' or 'none'
  return shouldIncludeMode ? [mode, ...pathParts] : pathParts;
}

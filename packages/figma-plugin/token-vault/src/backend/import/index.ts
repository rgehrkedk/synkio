/**
 * Import orchestrator
 * Coordinates the two-pass import process:
 * - Pass 1: Create all variables and collections
 * - Pass 2: Resolve all alias references
 *
 * @module backend/import
 */

import type { CollectionConfig } from '../../types/index.js';
import { findOrCreateCollection, setupModes, mergeTokenFiles } from './collection.js';
import { createOrUpdateVariable, isTokenValue, normalizeToken } from './variable.js';
import { AliasResolver } from './alias-resolver.js';
import { inferTypeFromPath } from '../type-inference/index.js';

/**
 * Import tokens from collection configurations into Figma.
 *
 * Performs a two-pass import process:
 * - **Pass 1**: Creates all variable collections, modes, and variables with initial values
 * - **Pass 2**: Resolves all alias references between variables
 *
 * This two-pass approach is necessary because aliases may reference variables that
 * haven't been created yet during sequential processing.
 *
 * @param collectionConfigs - Array of collection configurations containing token data
 * @returns Promise that resolves when import is complete
 *
 * @throws {Error} If collection creation fails
 * @throws {Error} If variable creation fails
 *
 * @example
 * ```ts
 * const configs: CollectionConfig[] = [
 *   {
 *     name: 'Design Tokens',
 *     isModeCollection: true,
 *     files: [
 *       { name: 'light', content: { colors: { primary: '#0000ff' } }, size: 100 },
 *       { name: 'dark', content: { colors: { primary: '#ffffff' } }, size: 100 }
 *     ]
 *   }
 * ];
 *
 * await importTokens(configs);
 * // Creates collection with two modes: 'light' and 'dark'
 * // Each mode has its own color values
 * ```
 */
export async function importTokens(collectionConfigs: CollectionConfig[]): Promise<void> {
  figma.notify('Starting token import...');

  // Create alias resolver for this import session
  const aliasResolver = new AliasResolver();

  // Pass 1: Create all variables and collections
  for (const config of collectionConfigs) {
    await importCollection(config, aliasResolver);
  }

  // Pass 2: Resolve aliases
  figma.notify('Resolving aliases...');
  const result = await aliasResolver.resolveAll();

  if (result.resolved > 0) {
    console.log(`Resolved ${result.resolved} alias references`);
  }

  if (result.failed > 0) {
    console.warn(`Failed to resolve ${result.failed} aliases`);
    // Show first few warnings in notification
    if (result.warnings.length > 0) {
      figma.notify(`Warning: ${result.failed} aliases could not be resolved`, { timeout: 5000 });
    }
  }

  // Clear resolver
  aliasResolver.clear();

  figma.notify('✓ Import complete!');
}

/**
 * Import a single collection configuration.
 *
 * Handles both mode-based collections (one file per mode) and single-mode
 * collections (multiple files merged into one mode).
 *
 * @param config - Collection configuration
 * @param aliasResolver - Alias resolver instance to register aliases during import
 * @returns Promise that resolves when collection import is complete
 *
 * @internal
 */
async function importCollection(
  config: CollectionConfig,
  aliasResolver: AliasResolver
): Promise<void> {
  // Find or create collection
  const collection = await findOrCreateCollection(config.name);

  // Setup modes
  const fileModeMap = setupModes(collection, config);

  if (config.isModeCollection) {
    // Each file is a separate mode
    for (const file of config.files) {
      const modeId = fileModeMap.get(file.name);
      if (modeId) {
        await importTokensForMode(collection, modeId, file.content, aliasResolver);
      }
    }
  } else {
    // Single mode, merge all files
    const mergedTokens = mergeTokenFiles(config.files);
    const defaultMode = collection.modes[0];
    await importTokensForMode(collection, defaultMode.modeId, mergedTokens, aliasResolver);
  }
}

/**
 * Import tokens for a specific mode.
 *
 * Recursively processes nested token structures, creating variables for each
 * leaf token found. Supports both W3C format ($value, $type) and legacy format
 * (value, type).
 *
 * @param collection - Variable collection to import into
 * @param modeId - Mode ID to set values for
 * @param tokens - Token structure (nested objects)
 * @param aliasResolver - Alias resolver to register aliases
 * @param prefix - Current path prefix for nested tokens
 * @returns Promise that resolves when all tokens are imported
 *
 * @internal
 */
async function importTokensForMode(
  collection: VariableCollection,
  modeId: string,
  tokens: any,
  aliasResolver: AliasResolver,
  prefix: string = ''
): Promise<void> {
  for (const [key, value] of Object.entries(tokens)) {
    // Skip internal properties (both W3C and legacy formats)
    if (key === 'value' || key === 'type' || key === 'description' ||
        key === '$value' || key === '$type' || key === '$description') {
      continue;
    }

    const path = prefix ? `${prefix}/${key}` : key;

    if (isTokenValue(value)) {
      // This is a leaf token - normalize and create variable
      const normalizedToken = normalizeToken(value, path, inferTypeFromPath);

      await createOrUpdateVariable(
        collection,
        modeId,
        path,
        normalizedToken,
        (variable, modeId, aliasPath) => {
          aliasResolver.registerAlias(variable, modeId, aliasPath);
        }
      );
    } else if (typeof value === 'object' && value !== null) {
      // Recurse into nested object
      await importTokensForMode(collection, modeId, value, aliasResolver, path);
    }
  }
}

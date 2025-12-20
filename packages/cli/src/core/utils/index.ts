/**
 * Core Utilities
 *
 * Shared utility functions used across the CLI codebase.
 */

// Deep merge utility
export { deepMerge } from './deep-merge.js';

// Nested path setter utility
export { setNestedPath } from './nested-set.js';

// Collection discovery utility
export { discoverCollectionsFromTokens } from './collection-discovery.js';
export type { CollectionInfo } from './collection-discovery.js';

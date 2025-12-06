/**
 * Synkio - Figma Design Tokens Sync
 *
 * A framework-agnostic tool for syncing Figma design tokens to code.
 *
 * @example CLI Usage
 * ```bash
 * # Interactive setup
 * npx synkio init
 *
 * # Sync tokens from Figma
 * npx synkio sync
 *
 * # Compare local with Figma
 * npx synkio diff
 *
 * # Rollback to previous version
 * npx synkio rollback
 * ```
 *
 * @example Programmatic Usage
 * ```typescript
 * import { init, fetchFigmaData, splitTokens } from '@synkio/core/api';
 *
 * // Initialize context
 * init({ rootDir: process.cwd() });
 *
 * // Fetch and process tokens
 * const data = await fetchFigmaData({ fileId: 'abc123' });
 * await splitTokens(data, config);
 * ```
 *
 * @module @synkio/core
 */

// Context and environment
export { initContext, getContext, createContext } from './context.js';
export type { Context } from './context.js';
export { loadEnv, getFigmaToken } from './env.js';

// Re-export everything from sub-modules
export * from './types/index.js';
export * from './files/index.js';
export * from './figma/index.js';
export * from './tokens/index.js';
export * from './cli/index.js';
export * from './compare/index.js';
export * from './detect/index.js';

/**
 * Programmatic API for Synkio
 *
 * This module provides a clean, framework-agnostic API for integrating
 * Synkio into your Node.js applications, build scripts, or custom workflows.
 *
 * @example Basic usage
 * ```typescript
 * import { init, fetchFigmaData } from '@synkio/core/api';
 *
 * // Initialize with project root
 * init({ rootDir: '/path/to/project' });
 *
 * // Fetch tokens from Figma
 * const data = await fetchFigmaData({
 *   fileId: 'abc123',
 *   nodeId: 'optional-node-id'
 * });
 * ```
 *
 * @example Next.js API Route
 * ```typescript
 * // app/api/sync-tokens/route.ts
 * import { init, fetchFigmaData, splitTokens } from '@synkio/core/api';
 * import { NextResponse } from 'next/server';
 *
 * export async function POST() {
 *   init({ rootDir: process.cwd() });
 *
 *   const data = await fetchFigmaData({
 *     fileId: process.env.FIGMA_FILE_ID!,
 *   });
 *
 *   const result = await splitTokens(data, config);
 *
 *   return NextResponse.json({ success: true, filesWritten: result.filesWritten });
 * }
 * ```
 *
 * @example Remix Loader
 * ```typescript
 * // app/routes/admin.tokens.tsx
 * import { init, fetchFigmaData } from '@synkio/core/api';
 * import { json } from '@remix-run/node';
 *
 * export async function loader() {
 *   init({ rootDir: process.cwd() });
 *
 *   const data = await fetchFigmaData({
 *     fileId: process.env.FIGMA_FILE_ID!,
 *   });
 *
 *   return json({ collections: data.collections });
 * }
 * ```
 *
 * @example Custom Build Script
 * ```typescript
 * import { init, fetchFigmaData, compareBaselines, splitTokens } from '@synkio/core/api';
 * import { loadConfig } from '@synkio/core';
 *
 * async function buildTokens() {
 *   init({ rootDir: __dirname });
 *
 *   const config = await loadConfig();
 *   const data = await fetchFigmaData({ fileId: config.figma.fileId });
 *
 *   // Compare with previous baseline
 *   const comparison = compareBaselines(previousData, data);
 *   if (comparison.breakingChanges.length > 0) {
 *     console.warn('Breaking changes detected!');
 *   }
 *
 *   // Generate token files
 *   await splitTokens(data, config);
 * }
 * ```
 *
 * @module @synkio/core/api
 */

// Context initialization
export { initContext as init, getContext, createContext } from '../context.js';
export type { Context } from '../context.js';

// Environment loading
export { loadEnv, getFigmaToken } from '../env.js';

// Figma API
export { fetchFigmaData } from '../figma/index.js';

// File operations
export {
  loadConfig,
  loadConfigOrThrow,
  saveConfig,
  loadBaseline,
  backupBaseline,
  restoreBaseline,
  ensureFigmaDir,
  saveJsonFile,
  saveTextFile
} from '../files/index.js';

// Comparison and diffing
export {
  compareBaselines,
  hasChanges,
  hasBreakingChanges,
  getChangeCounts,
  generateDiffReport,
  printDiffSummary
} from '../compare/index.js';

// Token processing
export { splitTokens } from '../tokens/index.js';

// Export all types
export type * from '../types/index.js';

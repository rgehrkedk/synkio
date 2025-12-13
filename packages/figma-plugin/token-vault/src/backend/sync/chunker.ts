/**
 * Data chunking utilities for handling Figma's 100KB sharedPluginData limit
 *
 * @module backend/sync/chunker
 */

import { CHUNK_SIZE } from '../utils/constants.js';

/**
 * Result of chunking operation
 */
export interface ChunkedData {
  /** Array of chunk strings */
  chunks: string[];
  /** Total size in bytes */
  totalSize: number;
  /** Number of chunks created */
  chunkCount: number;
}

/**
 * Split data into safe-sized chunks for storage in sharedPluginData.
 * Uses 90KB chunks to stay under Figma's 100KB limit per entry.
 *
 * @param data - Data to chunk (will be JSON stringified)
 * @returns Chunked data with metadata
 *
 * @example
 * ```ts
 * const snapshot = { tokens: {...} };
 * const chunked = chunkData(snapshot);
 * console.log(`Split into ${chunked.chunkCount} chunks`);
 * ```
 */
export function chunkData(data: unknown): ChunkedData {
  // Stringify the data
  const jsonData = JSON.stringify(data);
  const totalSize = jsonData.length;
  const chunks: string[] = [];

  // Split into chunks
  for (let i = 0; i < jsonData.length; i += CHUNK_SIZE) {
    chunks.push(jsonData.slice(i, i + CHUNK_SIZE));
  }

  return {
    chunks,
    totalSize,
    chunkCount: chunks.length
  };
}

/**
 * Reassemble chunked data back into original object.
 *
 * @param chunks - Array of chunk strings
 * @returns Parsed data object
 * @throws Error if JSON parsing fails
 *
 * @example
 * ```ts
 * const original = unchunkData(chunked.chunks);
 * ```
 */
export function unchunkData(chunks: string[]): unknown {
  // Join all chunks
  const jsonData = chunks.join('');

  // Parse and return
  try {
    return JSON.parse(jsonData);
  } catch (error) {
    throw new Error(`Failed to parse unchunked data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

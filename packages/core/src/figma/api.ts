/**
 * Figma API
 *
 * Functions for fetching data from Figma REST API using FigmaClient.
 */

import type { BaselineData } from '../types/index.js';
import {
  FIGMA_FILE_KEY,
  FIGMA_ACCESS_TOKEN,
  FIGMA_REGISTRY_NODE,
} from './constants.js';
import { FigmaClient } from './client.js';
import type { Logger } from '../logger.js';

/**
 * Options for fetching Figma data
 */
export interface FetchOptions {
  fileId?: string;
  nodeId?: string;
  accessToken?: string;
  logger?: Logger;
}

/**
 * Get effective credentials (options override environment)
 *
 * Note: We check process.env directly as fallback because the module-level
 * constants are evaluated at import time, before the user may have entered
 * credentials during setup.
 */
function getCredentials(options?: FetchOptions) {
  const fileId = options?.fileId || FIGMA_FILE_KEY || process.env.FIGMA_FILE_KEY;
  const nodeId = options?.nodeId || FIGMA_REGISTRY_NODE || process.env.FIGMA_REGISTRY_NODE;
  const accessToken = options?.accessToken || FIGMA_ACCESS_TOKEN || process.env.FIGMA_ACCESS_TOKEN || process.env.FIGMA_TOKEN;

  if (!accessToken) {
    throw new Error(
      'FIGMA_ACCESS_TOKEN not found.\n' +
      'Set it in .env, .env.local, or as an environment variable.'
    );
  }

  if (!fileId) {
    throw new Error(
      'Figma file ID not provided.\n' +
      'Set it in tokensrc.json or pass as option.'
    );
  }

  return { fileId, nodeId, accessToken };
}

/**
 * Fetch Figma data using FigmaClient (auto-selects fastest available method)
 *
 * If nodeId is provided (via options or environment), uses direct node access (fast).
 * Otherwise, fetches entire file and searches (slow).
 */
export async function fetchFigmaData(options?: FetchOptions): Promise<BaselineData> {
  const { fileId, nodeId, accessToken } = getCredentials(options);

  // Create FigmaClient instance
  const client = new FigmaClient({
    fileId,
    nodeId,
    accessToken,
    logger: options?.logger,
  });

  if (nodeId) {
    console.log(`🎯 Using direct node access (faster)`);
  } else {
    console.log(`🔍 Searching entire file (slower - set nodeId for faster access)`);
  }

  const data = await client.fetchData();

  if (!data) {
    throw new Error('No synced token data found. Run "Sync" in Token Vault plugin first.');
  }

  return data;
}

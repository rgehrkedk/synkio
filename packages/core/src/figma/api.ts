/**
 * Figma API
 *
 * Functions for fetching data from Figma REST API.
 */

import type { FigmaNodesResponse, FigmaFileResponse, BaselineData } from '../types';
import {
  FIGMA_FILE_KEY,
  FIGMA_ACCESS_TOKEN,
  FIGMA_REGISTRY_NODE,
  PLUGIN_ID,
  PLUGIN_NAMESPACE,
} from './constants';
import { extractChunkedData, findPluginData } from './parser';

/**
 * Options for fetching Figma data
 */
export interface FetchOptions {
  fileId?: string;
  nodeId?: string;
  accessToken?: string;
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
      'Set it in figma-sync/.figma/.env or as an environment variable.'
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
 * Fetch from specific node ID (fast method)
 *
 * Much faster than fetching the entire file.
 */
export async function fetchFromNode(nodeId: string, options?: FetchOptions): Promise<any> {
  const { fileId, accessToken } = getCredentials(options);
  const normalizedNodeId = nodeId.replace('-', ':');
  const url = `https://api.figma.com/v1/files/${fileId}/nodes?ids=${encodeURIComponent(normalizedNodeId)}&plugin_data=shared`;

  console.log(`📡 Fetching specific node: ${normalizedNodeId}`);

  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': accessToken,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma API error (${response.status}): ${errorText}`);
  }

  const data: FigmaNodesResponse = await response.json();
  const nodeData = data.nodes[normalizedNodeId];

  if (!nodeData) {
    throw new Error(`Node not found: ${normalizedNodeId}`);
  }

  const pluginData = nodeData.document.sharedPluginData?.[PLUGIN_NAMESPACE];
  if (!pluginData) {
    throw new Error(`No plugin data found. Run "Sync" in Token Vault plugin first.`);
  }

  return extractChunkedData(pluginData);
}

/**
 * Fetch entire file and search for registry node (slow method)
 *
 * Used when nodeId is not provided.
 * Searches the entire file tree for the registry node.
 */
export async function fetchFromFile(options?: FetchOptions): Promise<any> {
  const { fileId, accessToken } = getCredentials(options);

  console.log(`📡 Fetching entire file: ${fileId}`);

  const response = await fetch(
    `https://api.figma.com/v1/files/${fileId}?plugin_data=${PLUGIN_ID}`,
    {
      headers: {
        'X-Figma-Token': accessToken,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma API error (${response.status}): ${errorText}`);
  }

  const data: FigmaFileResponse = await response.json();

  console.log('🔍 Searching for synced token data...');
  return findPluginData(data.document);
}

/**
 * Fetch Figma data (auto-selects fastest available method)
 *
 * If nodeId is provided (via options or environment), uses direct node access (fast).
 * Otherwise, fetches entire file and searches (slow).
 */
export async function fetchFigmaData(options?: FetchOptions): Promise<BaselineData> {
  const { fileId, nodeId, accessToken } = getCredentials(options);

  let data: any;

  if (nodeId) {
    console.log(`🎯 Using direct node access (faster)`);
    data = await fetchFromNode(nodeId, { fileId, accessToken });
  } else {
    console.log(`🔍 Searching entire file (slower - set nodeId for faster access)`);
    data = await fetchFromFile({ fileId, accessToken });
  }

  if (!data) {
    throw new Error('No synced token data found. Run "Sync" in Token Vault plugin first.');
  }

  return data;
}

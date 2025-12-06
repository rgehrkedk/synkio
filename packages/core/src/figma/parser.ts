/**
 * Figma Data Parser
 *
 * Functions for parsing plugin data from Figma nodes.
 */

import type { FigmaNode } from '../types/index.js';
import { PLUGIN_NAMESPACE, REGISTRY_NODE_NAME } from './constants.js';

/**
 * Extract and reconstruct chunked data from plugin data
 *
 * The Figma plugin stores large data in chunks due to size limits.
 * This function reconstructs the full JSON from those chunks.
 */
export function extractChunkedData(pluginData: Record<string, string>): any | null {
  const chunkCountStr = pluginData['chunkCount'];
  if (!chunkCountStr) {
    return null;
  }

  const chunkCount = parseInt(chunkCountStr);
  console.log(`📦 Found ${chunkCount} chunks`);

  // Reconstruct data from chunks
  let fullData = '';
  for (let i = 0; i < chunkCount; i++) {
    const chunk = pluginData[`registry_${i}`];
    if (chunk) {
      fullData += chunk;
    } else {
      console.warn(`⚠️  Missing chunk ${i}`);
    }
  }

  try {
    const data = JSON.parse(fullData);
    console.log(`✅ Reconstructed ${fullData.length} bytes from ${chunkCount} chunks`);
    return data;
  } catch (e) {
    console.error(`Failed to parse reconstructed data:`, e);
    return null;
  }
}

/**
 * Recursively search for the registry node and reconstruct chunked data
 */
export function findPluginData(node: FigmaNode): any | null {
  // Check if this is the registry node
  if (node.name === REGISTRY_NODE_NAME && node.sharedPluginData?.[PLUGIN_NAMESPACE]) {
    return extractChunkedData(node.sharedPluginData[PLUGIN_NAMESPACE]);
  }

  // Recursively search children
  if (node.children) {
    for (const child of node.children) {
      const data = findPluginData(child);
      if (data) return data;
    }
  }

  return null;
}

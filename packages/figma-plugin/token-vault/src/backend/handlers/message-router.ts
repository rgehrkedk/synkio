/**
 * Message handler router
 * Routes incoming messages from UI to appropriate backend modules
 *
 * This module serves as the central message dispatcher for the plugin backend,
 * receiving all messages from the UI iframe and routing them to the appropriate
 * feature handlers (import, export, sync).
 *
 * @module backend/handlers/message-router
 */

import type { UIMessage, PluginMessage } from '../../types/message.types.js';
import { importTokens } from '../import/index.js';
import { exportBaseline } from '../export/index.js';
import { syncToNode, getLastSyncInfo } from '../sync/index.js';

/**
 * Handle incoming message from UI.
 *
 * This is the main entry point for all UI-to-backend communication in the plugin.
 * It receives type-safe messages from the UI and routes them to appropriate handlers.
 *
 * The message routing is exhaustive - TypeScript enforces that all message types
 * are handled via the never type check at the end of the switch statement.
 *
 * **Message Flow:**
 * ```
 * UI → message-bridge.ts → figma.ui.onmessage → handleMessage → [handler] → response
 * ```
 *
 * **Supported Messages:**
 * - `get-last-sync`: Retrieve sync metadata from registry node
 * - `get-collections`: List all local variable collections
 * - `import-tokens`: Import tokens from JSON files into Figma
 * - `export-baseline`: Export variables to JSON baseline format
 * - `sync-to-node`: Sync variables to registry node for API access
 * - `cancel`: Close the plugin
 *
 * @param msg - Type-safe message from UI (UIMessage union type)
 * @returns Promise that resolves when message handling is complete
 *
 * @example
 * ```ts
 * // In code.ts entry point
 * figma.ui.onmessage = async (msg: UIMessage) => {
 *   await handleMessage(msg);
 * };
 * ```
 */
export async function handleMessage(msg: UIMessage): Promise<void> {
  switch (msg.type) {
    case 'get-last-sync':
      await handleGetLastSync();
      break;

    case 'get-collections':
      await handleGetCollections();
      break;

    case 'import-tokens':
      await handleImportTokens(msg.data.collections);
      break;

    case 'export-baseline':
      await handleExportBaseline(msg.collectionIds);
      break;

    case 'sync-to-node':
      await handleSyncToNode(msg.collectionIds);
      break;

    case 'cancel':
      handleCancel();
      break;

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = msg;
      console.warn('Unknown message type:', _exhaustive);
  }
}

/**
 * Post message to UI.
 *
 * Type-safe wrapper around figma.ui.postMessage. All responses to the UI
 * must use PluginMessage types.
 *
 * @param msg - Type-safe plugin message
 * @internal
 */
function postMessage(msg: PluginMessage): void {
  figma.ui.postMessage(msg);
}

/**
 * Handle get-last-sync message.
 *
 * Retrieves and sends last sync information to UI. If no registry node exists
 * or metadata can't be read, sends { exists: false }.
 *
 * @internal
 */
async function handleGetLastSync(): Promise<void> {
  try {
    const syncInfo = await getLastSyncInfo();
    postMessage({
      type: 'last-sync-loaded',
      ...syncInfo
    });
  } catch (error) {
    console.error('Error loading last sync info:', error);
    postMessage({
      type: 'last-sync-loaded',
      exists: false
    });
  }
}

/**
 * Handle get-collections message.
 *
 * Retrieves all local variable collections and sends summary to UI.
 * The summary includes collection ID, name, mode count, and variable count
 * for display in export/sync tabs.
 *
 * @internal
 */
async function handleGetCollections(): Promise<void> {
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allVariables = await figma.variables.getLocalVariablesAsync();

    const collectionData = collections.map(col => ({
      id: col.id,
      name: col.name,
      modeCount: col.modes.length,
      variableCount: allVariables.filter(v => v.variableCollectionId === col.id).length
    }));

    postMessage({
      type: 'collections-loaded',
      collections: collectionData
    });
  } catch (error) {
    console.error('Error loading collections:', error);
  }
}

/**
 * Handle import-tokens message.
 *
 * Orchestrates the token import flow by delegating to the import module.
 * Sends success or error message back to UI when complete.
 *
 * @param collections - Array of collection configurations with token data
 * @internal
 */
async function handleImportTokens(collections: any[]): Promise<void> {
  try {
    await importTokens(collections);
    postMessage({
      type: 'import-complete',
      message: 'Tokens imported successfully!'
    });
  } catch (error) {
    postMessage({
      type: 'import-error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Handle export-baseline message.
 *
 * Exports baseline snapshot and sends to UI for display/download.
 * Supports optional collection filtering.
 *
 * @param collectionIds - Array of collection IDs to export (empty = all)
 * @internal
 */
async function handleExportBaseline(collectionIds: string[]): Promise<void> {
  try {
    console.log('Export baseline requested');
    figma.notify('Exporting baseline snapshot...');

    const filterIds = collectionIds && collectionIds.length > 0 ? collectionIds : null;
    const baseline = await exportBaseline(filterIds);
    const jsonString = JSON.stringify(baseline);

    console.log('Export complete, data size:', jsonString.length, 'bytes');

    postMessage({
      type: 'export-complete',
      data: baseline
    });

    figma.notify('Export complete!');
  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    postMessage({
      type: 'export-error',
      message: errorMessage
    });

    figma.notify('Export failed: ' + errorMessage, { error: true });
  }
}

/**
 * Handle sync-to-node message.
 *
 * Syncs token registry to node for API access by the Synkio CLI.
 * This enables developers to fetch tokens without manual plugin interaction.
 *
 * @param collectionIds - Array of collection IDs to sync (empty = all)
 * @internal
 */
async function handleSyncToNode(collectionIds: string[]): Promise<void> {
  try {
    console.log('Sync to Node requested');
    figma.notify('Syncing registry to node...');

    const filterIds = collectionIds && collectionIds.length > 0 ? collectionIds : null;

    // Export baseline first
    const exportData = await exportBaseline(filterIds);

    // Then sync to node
    const result = await syncToNode(exportData);

    postMessage({
      type: 'sync-complete',
      nodeId: result.nodeId,
      variableCount: result.variableCount
    });

    figma.notify(`✓ Synced ${result.variableCount} variables to node!`);
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    postMessage({
      type: 'sync-error',
      message: errorMessage
    });

    figma.notify('Sync failed: ' + errorMessage, { error: true });
  }
}

/**
 * Handle cancel message.
 *
 * Closes the plugin when user clicks cancel button.
 *
 * @internal
 */
function handleCancel(): void {
  figma.closePlugin();
}

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

import type { UIMessage, PluginMessage, ManualImportConfig } from '../../types/message.types.js';
import type { LevelConfiguration } from '../../types/level-config.types.js';
import type { TokenChange } from '../utils/version-manager.js';
import { exportBaseline } from '../export/index.js';
import { syncToNode, getLastSyncInfo, findRegistryNode, loadChunksFromNode, unchunkData } from '../sync/index.js';
import { analyzeJsonStructure } from '../utils/structure-analyzer.js';
import { generatePreview } from '../utils/preview-generator.js';
import { importWithLevelMapping } from '../import/level-mapper.js';
import { handleMultiFileImport } from '../import/multi-file-handler.js';
import { calculateVersionBump } from '../utils/version-manager.js';
import { PLUGIN_NAMESPACE } from '../utils/constants.js';

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

    case 'export-baseline':
      await handleExportBaseline(msg.collectionIds);
      break;

    case 'sync-to-node':
      await handleSyncToNode(msg.collectionIds);
      break;

    case 'check-sync-changes':
      await handleCheckSyncChanges();
      break;

    case 'sync-with-version':
      await handleSyncWithVersion(msg.version, msg.changes);
      break;

    case 'detect-import-format':
      await handleDetectImportFormat(msg.fileName, msg.jsonData);
      break;

    case 'import-baseline':
      await handleImportBaseline(msg.baseline);
      break;

    case 'preview-baseline-import':
      await handlePreviewBaselineImport(msg.baseline);
      break;

    case 'confirm-baseline-import':
      await handleImportBaseline(msg.baseline);
      break;

    case 'analyze-structure':
      await handleAnalyzeStructure(msg.fileName, msg.jsonData, msg.metadata);
      break;

    case 'generate-preview':
      await handleGeneratePreview(msg.fileName, msg.jsonData, msg.levels);
      break;

    case 'import-with-manual-config':
      await handleImportWithManualConfig(msg.config);
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
 * Handle detect-import-format message.
 *
 * Detects if uploaded file is a baseline format.
 * Currently only detects baseline - all other formats go to flexible import.
 *
 * @param fileName - Name of the file
 * @param jsonData - Parsed JSON data
 * @internal
 */
async function handleDetectImportFormat(fileName: string, jsonData: unknown): Promise<void> {
  try {
    const { detectBaselineFormat } = await import('../utils/baseline-detector.js');
    const { validateBaseline } = await import('../utils/baseline-validator.js');

    const detection = detectBaselineFormat(jsonData);

    let validation;
    if (detection.isBaseline && jsonData) {
      validation = validateBaseline(jsonData);
    }

    postMessage({
      type: 'import-format-detected',
      fileName,
      baselineDetection: detection,
      validation
    });
  } catch (error) {
    console.error('Error detecting import format:', error);
    postMessage({
      type: 'import-error',
      message: `Failed to detect format: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handle import-baseline message.
 *
 * Imports a baseline snapshot file.
 *
 * @param baseline - Baseline data
 * @internal
 */
async function handleImportBaseline(baseline: unknown): Promise<void> {
  try {
    const { importBaseline } = await import('../import/baseline-importer.js');

    figma.notify('Importing baseline...');

    const result = await importBaseline(baseline);

    if (result.success) {
      // After successful import, sync the current state to the registry node
      // This makes the imported version the new baseline for future comparisons
      try {
        const { exportBaseline } = await import('../export/index.js');
        const { syncToNode } = await import('../sync/index.js');
        const currentBaseline = await exportBaseline(null) as any;
        
        // Use the imported version number
        if (!currentBaseline.$metadata) {
          currentBaseline.$metadata = {};
        }
        currentBaseline.$metadata.version = result.importedVersion || '1.0.0';
        currentBaseline.$metadata.syncedAt = new Date().toISOString();
        
        await syncToNode(currentBaseline);
        console.log('[Import] Synced imported baseline to registry node with version:', result.importedVersion);
      } catch (syncError) {
        console.warn('[Import] Failed to sync baseline to registry node:', syncError);
        // Don't fail the import - just warn
      }

      // Build message with version info if available
      let message = '';
      
      // Show version info
      if (result.importedVersion) {
        message += `v${result.importedVersion}`;
        if (result.previousVersion && result.previousVersion !== result.importedVersion) {
          message += ` (was v${result.previousVersion})`;
        }
        message += ': ';
      }
      
      // Show counts - prioritize updates if they exist
      const parts: string[] = [];
      if (result.collectionsCreated > 0) parts.push(`${result.collectionsCreated} collection(s) created`);
      if (result.collectionsUpdated > 0) parts.push(`${result.collectionsUpdated} collection(s) updated`);
      if (result.variablesCreated > 0) parts.push(`${result.variablesCreated} variable(s) created`);
      if (result.variablesUpdated > 0) parts.push(`${result.variablesUpdated} variable(s) updated`);
      
      message += parts.length > 0 ? parts.join(', ') : 'No changes';
      
      postMessage({
        type: 'import-complete',
        message
      });
      figma.notify('Import complete!');
    } else {
      postMessage({
        type: 'import-error',
        message: result.errors.join('\n')
      });
      figma.notify('Import failed', { error: true });
    }
  } catch (error) {
    console.error('Baseline import error:', error);
    postMessage({
      type: 'import-error',
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify('Import failed', { error: true });
  }
}

/**
 * Handle preview-baseline-import message.
 *
 * Compares the imported baseline with current Figma state and returns
 * a diff showing what will change before the import is applied.
 *
 * @param baseline - Baseline data to preview
 * @internal
 */
async function handlePreviewBaselineImport(baseline: unknown): Promise<void> {
  try {
    console.log('[ImportPreview] Generating import preview...');
    figma.notify('Analyzing changes...');

    // Validate baseline format
    const baselineData = baseline as any;
    if (!baselineData || !baselineData.baseline || typeof baselineData.baseline !== 'object') {
      postMessage({
        type: 'import-error',
        message: 'Invalid baseline format: missing baseline property'
      });
      return;
    }

    // Get the imported version
    const importedVersion = baselineData.$metadata?.version || '1.0.0';

    // Build current Figma state as baseline for comparison
    const { buildBaselineSnapshot } = await import('../export/baseline.js');
    const currentBaseline = await buildBaselineSnapshot(null);
    const currentVersion = currentBaseline.$metadata?.version || '1.0.0';

    console.log('[ImportPreview] Comparing imported v' + importedVersion + ' with current Figma state v' + currentVersion);

    // Calculate changes (note: we're comparing what's IN FIGMA vs what we're IMPORTING)
    // So "current" is Figma, "new" is the imported baseline
    const versionBump = calculateVersionBump(currentVersion, currentBaseline, baselineData);

    console.log('[ImportPreview] Changes detected:', versionBump.changes.length);
    console.log('[ImportPreview] Breaking:', versionBump.breakingCount, 'Additions:', versionBump.additionCount, 'Patches:', versionBump.patchCount);

    // Send result to UI
    postMessage({
      type: 'import-changes-detected',
      versionBump: {
        ...versionBump,
        // Override the suggested version to show the imported version
        current: currentVersion,
        suggested: importedVersion
      },
      baseline: baseline
    });

    if (versionBump.changeType === 'none') {
      figma.notify('No changes detected');
    } else {
      figma.notify(`${versionBump.changes.length} change(s) will be applied`);
    }
  } catch (error) {
    console.error('[ImportPreview] Error:', error);
    postMessage({
      type: 'import-error',
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify('Failed to analyze import', { error: true });
  }
}

/**
 * Handle analyze-structure message.
 *
 * Analyzes JSON structure and returns level information.
 *
 * @param fileName - Name of the file
 * @param jsonData - Parsed JSON data
 * @param metadata - Optional metadata to pass through (e.g., groupId for multi-collection)
 * @internal
 */
async function handleAnalyzeStructure(fileName: string, jsonData: unknown, metadata?: { groupId: string }): Promise<void> {
  try {
    console.log('[Backend] Analyzing structure for:', fileName, metadata ? `(groupId: ${metadata.groupId})` : '');
    const structure = analyzeJsonStructure(jsonData);
    console.log('[Backend] Structure analyzed:', structure.levels.length, 'levels');

    // Convert to LevelConfiguration format for UI
    const levels: LevelConfiguration[] = structure.levels.map((level) => ({
      depth: level.depth,
      role: 'token-path', // Default role
      exampleKeys: level.keys,
      keyCount: level.keyCount
    }));

    console.log('[Backend] Sending structure-analyzed message');
    postMessage({
      type: 'structure-analyzed',
      fileName,
      levels,
      metadata
    });
  } catch (error) {
    console.error('[Backend] Error analyzing structure:', error);
    postMessage({
      type: 'import-error',
      message: `Failed to analyze structure: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handle generate-preview message.
 *
 * Generates a preview of what will be created in Figma based on level configuration.
 *
 * @param fileName - Name of the file
 * @param jsonData - Parsed JSON data
 * @param levels - Level configuration
 * @internal
 */
async function handleGeneratePreview(fileName: string, jsonData: unknown, levels: LevelConfiguration[]): Promise<void> {
  try {
    const preview = generatePreview(fileName, jsonData, levels);

    postMessage({
      type: 'preview-generated',
      preview
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    postMessage({
      type: 'import-error',
      message: `Failed to generate preview: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handle import-with-manual-config message.
 *
 * Imports tokens using manual level configuration.
 *
 * @param config - Manual import configuration
 * @internal
 */
async function handleImportWithManualConfig(config: ManualImportConfig): Promise<void> {
  try {
    figma.notify('Importing tokens...');

    let result;

    if (config.singleFile) {
      // Single file import
      result = await importWithLevelMapping(config);
    } else if (config.multiFile) {
      // Multi-file import - convert Records to Maps for internal use
      const filesDataRecord = config.multiFile.filesData || {};
      const filesData = new Map<string, any>(Object.entries(filesDataRecord));
      
      const levelsByGroupRecord = config.multiFile.levelsByGroup || {};
      const levelsByGroup = new Map<string, LevelConfiguration[]>(Object.entries(levelsByGroupRecord));
      
      console.log('[Backend] Multi-file import with', filesData.size, 'files');

      result = await handleMultiFileImport(
        config.multiFile.groups,
        levelsByGroup,
        filesData
      );
    } else {
      throw new Error('Invalid import configuration');
    }

    if (result.success) {
      postMessage({
        type: 'import-complete',
        message: `Imported ${result.collectionsCreated} collection(s), ${result.modesCreated} mode(s), ${result.variablesCreated} variable(s)`
      });
      figma.notify('Import complete!');
    } else {
      postMessage({
        type: 'import-error',
        message: result.errors.join('\n')
      });
      figma.notify('Import failed', { error: true });
    }
  } catch (error) {
    console.error('Manual import error:', error);
    postMessage({
      type: 'import-error',
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify('Import failed', { error: true });
  }
}

/**
 * Handle check-sync-changes message.
 *
 * Compares current Figma variables with the stored baseline to detect changes.
 * Calculates version bump based on semantic versioning rules.
 *
 * @internal
 */
async function handleCheckSyncChanges(): Promise<void> {
  try {
    console.log('[SyncChanges] Checking for changes...');
    figma.notify('Checking for changes...');

    // 1. Find the registry node with stored baseline
    const node = await findRegistryNode();
    if (!node) {
      postMessage({
        type: 'sync-error',
        message: 'No previous sync found. Please sync to node first.'
      });
      figma.notify('No previous sync found', { error: true });
      return;
    }

    // 2. Read chunk count from metadata
    const chunkCountStr = node.getSharedPluginData(PLUGIN_NAMESPACE, 'chunkCount');
    if (!chunkCountStr) {
      postMessage({
        type: 'sync-error',
        message: 'No baseline data found in registry node.'
      });
      figma.notify('No baseline data found', { error: true });
      return;
    }
    const chunkCount = parseInt(chunkCountStr, 10);

    // 3. Load and reassemble the previous baseline
    const chunks = loadChunksFromNode(node, PLUGIN_NAMESPACE, chunkCount);
    const previousBaseline = unchunkData(chunks) as any;
    console.log('[SyncChanges] Loaded previous baseline with', Object.keys(previousBaseline?.baseline || {}).length, 'tokens');

    // 4. Export current Figma variables as new baseline
    const currentBaseline = await exportBaseline(null);
    console.log('[SyncChanges] Exported current baseline with', Object.keys((currentBaseline as any)?.baseline || {}).length, 'tokens');

    // 5. Get current version from metadata
    const currentVersion = previousBaseline?.$metadata?.version || '1.0.0';

    // 6. Calculate version bump
    const versionBump = calculateVersionBump(currentVersion, previousBaseline, currentBaseline);
    console.log('[SyncChanges] Version bump:', versionBump.changeType, 'from', versionBump.current, 'to', versionBump.suggested);
    console.log('[SyncChanges] Changes:', versionBump.breakingCount, 'breaking,', versionBump.additionCount, 'additions,', versionBump.patchCount, 'patches');

    // 7. Send result to UI
    postMessage({
      type: 'sync-changes-detected',
      versionBump
    });

    if (versionBump.changeType === 'none') {
      figma.notify('No changes detected');
    } else {
      figma.notify(`${versionBump.changes.length} change(s) detected`);
    }
  } catch (error) {
    console.error('[SyncChanges] Error:', error);
    postMessage({
      type: 'sync-error',
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify('Failed to check for changes', { error: true });
  }
}

/**
 * Handle sync-with-version message.
 *
 * Syncs tokens to node with a user-specified version number.
 *
 * @param version - Version string to use (e.g., "2.0.0")
 * @param changes - Array of changes being synced
 * @internal
 */
async function handleSyncWithVersion(version: string, changes: TokenChange[]): Promise<void> {
  try {
    console.log('[SyncWithVersion] Syncing with version:', version);
    figma.notify('Syncing...');

    // Export current baseline
    const baseline = await exportBaseline(null) as any;

    // Update version in metadata
    if (!baseline.$metadata) {
      baseline.$metadata = {};
    }
    baseline.$metadata.version = version;
    baseline.$metadata.syncedAt = new Date().toISOString();

    // Sync to node
    const result = await syncToNode(baseline);

    postMessage({
      type: 'sync-complete',
      nodeId: result.nodeId,
      variableCount: result.variableCount
    });

    figma.notify(`✓ Synced v${version} with ${result.variableCount} variables`);
  } catch (error) {
    console.error('[SyncWithVersion] Error:', error);
    postMessage({
      type: 'sync-error',
      message: error instanceof Error ? error.message : String(error)
    });
    figma.notify('Sync failed', { error: true });
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

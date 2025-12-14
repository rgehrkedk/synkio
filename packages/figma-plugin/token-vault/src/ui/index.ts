/**
 * UI Entry Point
 *
 * Initializes all UI components, sets up event listeners,
 * and coordinates state management and message handling.
 */

import { getState, setState, setImportStep, setStructureConfig } from './state';
import { sendMessage, onMessage } from './message-bridge';
import { initTabs, updateActionButton } from './components/tabs';
import { initFileUpload } from './components/file-upload';
import { initCollectionLists, renderExportCollections, renderSyncCollections } from './components/collection-list';
import { showExportModal } from './components/export-modal';
import { showSyncSuccess, initSyncSuccessScreen } from './components/success-screen';
import { showLastSyncInfo, initSyncInfo } from './components/sync-info';
import { renderBaselineConfirmation, hideBaselineConfirmation } from './components/baseline-confirmation';
import { renderSyncChangesDiff, hideSyncChangesDiff } from './components/sync-changes-diff';
import { renderImportChangesDiff, hideImportChangesDiff } from './components/import-changes-diff';
import { displayAnalyzedStructure, hideStructurePreview, renderStructurePreview } from './components/structure-preview';
import { renderLevelSelector } from './components/level-selector';
import { renderFileGrouping, hideFileGrouping } from './components/file-grouping';
import { renderLivePreview, hideLivePreview } from './components/live-preview';
import { renderMultiCollectionConfig, handleCollectionStructureAnalyzed, hideMultiCollectionConfig } from './components/multi-collection-config';
import type { ManualImportConfig, PreviewStructure } from '../types/message.types';
import type { LevelConfiguration } from '../types/level-config.types';

/**
 * Initialize all UI components and event handlers
 */
function initializeUI(): void {
  // Initialize tab navigation
  initTabs();

  // Initialize file upload component
  initFileUpload({
    onFilesChanged: () => {
      handleFilesChanged();
    },
    onError: (fileName, error) => {
      showNotification(`Error parsing ${fileName}: ${error}`, 'error');
    }
  });

  // Initialize collection lists (export/sync tabs)
  initCollectionLists({
    onSelectionChanged: () => {
      updateActionButton();
    }
  });

  // Listen for collections loaded event to re-render the active tab's list
  document.addEventListener('collections-loaded', () => {
    const state = getState();
    if (state.currentTab === 'export') {
      renderExportCollections();
    } else if (state.currentTab === 'sync') {
      renderSyncCollections();
    }
  });

  // Initialize sync success screen
  initSyncSuccessScreen();

  // Initialize sync info display
  initSyncInfo();

  // Initialize sync tab "Check for Changes" button
  initSyncCheckChanges();

  // Initialize action button handlers
  initActionButton();

  // Initialize cancel button
  initCancelButton();

  // Set up message handler
  setupMessageHandler();

  // Set up flexible import event listeners
  setupFlexibleImportListeners();

  // Initial UI state
  updateActionButton();
}

/**
 * Handle files changed event from file upload
 */
function handleFilesChanged(): void {
  const state = getState();

  // Update action button
  updateActionButton();

  // Initiate flexible import flow if files are uploaded
  if (state.files.size > 0) {
    // Check if any file is NOT baseline
    const hasNonBaselineFiles = Array.from(state.files.values()).some(f => {
      const data = f.content;
      return !(data && typeof data === 'object' && '$metadata' in data && 'baseline' in data);
    });

    if (hasNonBaselineFiles) {
      console.log('[UI] Files ready - initiating flexible import');
      initiateFlexibleImport();
    }
  }
}

/**
 * Initialize sync check for changes button
 */
function initSyncCheckChanges(): void {
  const checkBtn = document.getElementById('checkChangesBtn');
  if (!checkBtn) return;

  checkBtn.addEventListener('click', () => {
    sendMessage({ type: 'check-sync-changes' });
  });
}

/**
 * Initialize main action button handler
 */
function initActionButton(): void {
  const actionBtn = document.getElementById('actionBtn');
  if (!actionBtn) return;

  actionBtn.addEventListener('click', () => {
    const state = getState();

    switch (state.currentTab) {
      case 'import':
        handleImportAction();
        break;

      case 'export':
        sendMessage({
          type: 'export-baseline',
          collectionIds: Array.from(state.selectedExportCollections)
        });
        break;

      case 'sync':
        sendMessage({
          type: 'sync-to-node',
          collectionIds: Array.from(state.selectedSyncCollections)
        });
        break;
    }
  });
}

/**
 * Handle import action
 */
function handleImportAction(): void {
  handleFlexibleImport();
}

/**
 * Handle flexible import action
 */
function handleFlexibleImport(): void {
  const state = getState();

  if (!state.structureConfig) {
    showNotification('No configuration found. Please configure level mapping first.', 'error');
    return;
  }

  const config: ManualImportConfig = {};

  // Single-file import
  if (state.files.size === 1 && !state.fileGroups) {
    const fileName = Array.from(state.files.keys())[0];
    const file = state.files.get(fileName);

    if (file) {
      config.singleFile = {
        fileName,
        data: file.content,
        levels: state.structureConfig.levels
      };
    }
  }

  // Multi-file import
  if (state.fileGroups && state.fileGroups.length > 0) {
    const levelsByGroup = new Map<string, LevelConfiguration[]>();

    // For now, use the same level configuration for all groups
    // In a future enhancement, we could support per-group configuration
    state.fileGroups.forEach((group) => {
      levelsByGroup.set(group.id, state.structureConfig!.levels);
    });

    config.multiFile = {
      groups: state.fileGroups,
      levelsByGroup
    };
  }

  // Send to backend
  sendMessage({
    type: 'import-with-manual-config',
    config
  });
}


/**
 * Initialize cancel button
 */
function initCancelButton(): void {
  const cancelBtn = document.getElementById('cancelBtn');
  if (!cancelBtn) return;

  cancelBtn.addEventListener('click', () => {
    sendMessage({ type: 'cancel' });
  });
}

/**
 * Set up flexible import event listeners
 */
function setupFlexibleImportListeners(): void {
  // Listen for level configuration changes
  document.addEventListener('level-configuration-changed', ((event: CustomEvent) => {
    handleLevelConfigurationChanged(event.detail);
  }) as EventListener);

  // Listen for file grouping complete
  document.addEventListener('file-grouping-complete', () => {
    handleFileGroupingComplete();
  });
}

/**
 * Handle level configuration changed
 */
function handleLevelConfigurationChanged(detail: {
  configuration: LevelConfiguration[];
  validation: { valid: boolean };
}): void {
  const state = getState();

  // Update action button state based on validation
  const actionBtn = document.getElementById('actionBtn') as HTMLButtonElement;
  if (actionBtn) {
    actionBtn.disabled = !detail.validation.valid;
    actionBtn.textContent = 'Import to Figma';
  }

  // Generate preview if configuration is valid
  if (detail.validation.valid && state.files.size > 0) {
    const fileName = Array.from(state.files.keys())[0];
    const file = state.files.get(fileName);

    if (file) {
      sendMessage({
        type: 'generate-preview',
        fileName,
        jsonData: file.content,
        levels: detail.configuration
      });
    }
  }
}

/**
 * Handle file grouping complete
 */
function handleFileGroupingComplete(): void {
  console.log('[UI] handleFileGroupingComplete called!');
  console.trace('[UI] Stack trace:');
  const state = getState();

  // Hide file grouping UI
  hideFileGrouping();

  // Show multi-collection configuration UI
  if (state.fileGroups && state.fileGroups.length > 0) {
    console.log('[UI] Starting multi-collection configuration for', state.fileGroups.length, 'collection(s)');

    setImportStep('configure');
    renderMultiCollectionConfig();
  }
}

/**
 * Set up message handler for backend messages
 */
function setupMessageHandler(): void {
  onMessage((msg) => {
    switch (msg.type) {
      case 'last-sync-loaded':
        if (msg.exists && msg.nodeId && msg.variableCount !== undefined && msg.updatedAt) {
          showLastSyncInfo(msg.nodeId, msg.variableCount, msg.updatedAt);
        }
        break;

      case 'collections-loaded':
        handleCollectionsLoaded(msg.collections);
        break;

      case 'import-complete':
        showNotification(msg.message, 'success');
        hideBaselineConfirmation();
        hideFlexibleImportUI();
        break;

      case 'import-error':
        showNotification('Error: ' + msg.message, 'error');
        break;

      case 'export-complete':
        showExportModal(msg.data);
        break;

      case 'export-error':
        showNotification('Export Error: ' + msg.message, 'error');
        break;

      case 'sync-complete':
        showSyncSuccess(msg.nodeId, msg.variableCount);
        hideSyncChangesDiff();
        break;

      case 'sync-error':
        showNotification('Sync Error: ' + msg.message, 'error');
        break;

      case 'import-format-detected':
        handleImportFormatDetected(msg);
        break;

      case 'structure-analyzed':
        handleStructureAnalyzed(msg);
        break;

      case 'preview-generated':
        handlePreviewGenerated(msg);
        break;

      case 'sync-changes-detected':
        renderSyncChangesDiff(msg.versionBump);
        break;

      case 'import-changes-detected':
        renderImportChangesDiff(msg.versionBump, msg.baseline);
        break;
    }
  });
}

/**
 * Handle structure analyzed message
 */
function handleStructureAnalyzed(msg: {
  fileName: string;
  levels: LevelConfiguration[];
  metadata?: { groupId: string };
}): void {
  console.log('[UI] Structure analyzed - showing level selector', msg.levels.length, 'levels');

  const state = getState();

  // Check if this is for multi-collection config
  if (state.fileGroups && state.fileGroups.length > 1 && msg.metadata?.groupId) {
    console.log('[UI] Routing to multi-collection handler for groupId:', msg.metadata.groupId);
    handleCollectionStructureAnalyzed(msg);
    return;
  }

  // Single-file flow: Initialize structure config state
  setStructureConfig({
    fileName: msg.fileName,
    levels: msg.levels
  });

  // Show structure preview section
  const structureSection = document.getElementById('structurePreviewSection');
  if (structureSection) {
    console.log('[UI] Showing structure preview section');
    structureSection.style.display = 'block';
  } else {
    console.error('[UI] structurePreviewSection not found!');
  }

  // Show level selector section
  const levelSection = document.getElementById('levelSelectorSection');
  if (levelSection) {
    console.log('[UI] Showing level selector section');
    levelSection.style.display = 'block';
  } else {
    console.error('[UI] levelSelectorSection not found!');
  }

  // Render level selector with analyzed levels
  console.log('[UI] Rendering level selector');
  renderLevelSelector(
    msg.levels.map((level) => ({
      depth: level.depth,
      exampleKeys: level.exampleKeys || [],
      keyCount: level.keyCount || 0
    }))
  );
}

/**
 * Handle preview generated message
 */
function handlePreviewGenerated(msg: { preview: PreviewStructure }): void {
  // Show live preview section
  const previewSection = document.getElementById('livePreviewSection');
  if (previewSection) {
    previewSection.style.display = 'block';
  }

  // Render the preview
  renderLivePreview(msg.preview);

  // Enable import button
  const actionBtn = document.getElementById('actionBtn') as HTMLButtonElement;
  if (actionBtn) {
    actionBtn.disabled = false;
    actionBtn.textContent = 'Import to Figma';
  }
}

/**
 * Hide flexible import UI sections
 */
function hideFlexibleImportUI(): void {
  hideStructurePreview();
  hideFileGrouping();
  hideLivePreview();

  const levelSection = document.getElementById('levelSelectorSection');
  if (levelSection) {
    levelSection.style.display = 'none';
  }
}

/**
 * Handle import format detection results
 */
function handleImportFormatDetected(msg: {
  fileName: string;
  baselineDetection: any;
  validation?: any;
}): void {
  console.log('[UI] Detection results received:', {
    fileName: msg.fileName,
    isBaseline: msg.baselineDetection.isBaseline,
    validation: msg.validation
  });

  // Update state with detection results
  setState({
    baselineDetection: msg.baselineDetection,
    validation: msg.validation
  });

  // Show baseline confirmation UI if detected
  if (msg.baselineDetection.isBaseline) {
    console.log('[UI] Showing baseline confirmation UI');

    renderBaselineConfirmation({
      detection: msg.baselineDetection,
      validation: msg.validation!,
      onConfigureManually: () => {
        hideBaselineConfirmation();
        // Show flexible import flow for baseline files too
        initiateFlexibleImport();
      }
    });
  }
  // NOTE: Do NOT call initiateFlexibleImport() here for non-baseline files!
  // It will be called by checkFilesReady() after ALL files are uploaded
}

/**
 * Initiate flexible import flow
 */
function initiateFlexibleImport(): void {
  const state = getState();

  console.log('[UI] initiateFlexibleImport - files.size:', state.files.size);
  console.log('[UI] Files:', Array.from(state.files.keys()));

  // Check if multiple files
  if (state.files.size > 1) {
    console.log('[UI] Multiple files detected - showing file grouping UI');
    // Show file grouping UI
    setImportStep('group');
    const groupingSection = document.getElementById('fileGroupingSection');
    if (groupingSection) {
      console.log('[UI] fileGroupingSection found, displaying...');
      groupingSection.style.display = 'block';
    } else {
      console.error('[UI] fileGroupingSection NOT FOUND!');
    }
    console.log('[UI] Calling renderFileGrouping()...');
    renderFileGrouping();
    console.log('[UI] renderFileGrouping() completed');
  } else if (state.files.size === 1) {
    console.log('[UI] Single file detected - going to structure analysis');
    // Single file - go directly to structure analysis
    setImportStep('configure');
    const fileName = Array.from(state.files.keys())[0];
    const file = state.files.get(fileName);

    if (file) {
      console.log('[UI] initiateFlexibleImport (single file) - sending analyze-structure for:', fileName);
      sendMessage({
        type: 'analyze-structure',
        fileName,
        jsonData: file.content
      });
    } else {
      console.error('[UI] File not found for analysis:', fileName);
    }
  }
}

/**
 * Handle collections loaded from Figma
 */
function handleCollectionsLoaded(collections: Array<{ id: string; name: string; variableCount: number; modeCount: number }>): void {
  const state = getState();

  // Auto-select all by default
  const selectedExport = new Set<string>();
  const selectedSync = new Set<string>();

  collections.forEach(col => {
    selectedExport.add(col.id);
    selectedSync.add(col.id);
  });

  setState({
    figmaCollections: collections,
    selectedExportCollections: selectedExport,
    selectedSyncCollections: selectedSync
  });

  // Trigger re-render of collection lists
  const renderEvent = new CustomEvent('collections-loaded');
  document.dispatchEvent(renderEvent);

  updateActionButton();
}

/**
 * Show notification to user
 * @param message - The message to display
 * @param type - The notification type
 */
function showNotification(message: string, type: 'error' | 'success' | 'info' = 'info'): void {
  // Simple alert for now - can be replaced with a toast component
  if (type === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }
  alert(message);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}

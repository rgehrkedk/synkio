/**
 * UI Entry Point
 *
 * Initializes all UI components, sets up event listeners,
 * and coordinates state management and message handling.
 */

import { getState, setState } from './state';
import { sendMessage, onMessage } from './message-bridge';
import { initTabs, updateActionButton } from './components/tabs';
import { initFileUpload } from './components/file-upload';
import { initCollectionConfig } from './components/collection-config';
import { initCollectionLists, renderExportCollections, renderSyncCollections } from './components/collection-list';
import { showExportModal } from './components/export-modal';
import { showSyncSuccess, initSyncSuccessScreen } from './components/success-screen';
import { showLastSyncInfo, initSyncInfo } from './components/sync-info';

/**
 * Initialize all UI components and event handlers
 */
function initializeUI(): void {
  // Initialize tab navigation
  initTabs();

  // Initialize file upload component
  initFileUpload({
    onFilesChanged: () => {
      updateActionButton();
    },
    onError: (fileName, error) => {
      showNotification(`Error parsing ${fileName}: ${error}`, 'error');
    }
  });

  // Initialize collection configuration
  initCollectionConfig({
    onCollectionsChanged: () => {
      updateActionButton();
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

  // Initialize action button handlers
  initActionButton();

  // Initialize cancel button
  initCancelButton();

  // Set up message handler
  setupMessageHandler();

  // Initial UI state
  updateActionButton();
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
 * Handle import action - collect data and send to backend
 */
function handleImportAction(): void {
  const state = getState();

  const collectionsData = state.collections.map(c => ({
    name: c.name,
    isModeCollection: c.isModeCollection,
    files: c.fileNames.map(name => state.files.get(name))
  }));

  sendMessage({
    type: 'import-tokens',
    data: { collections: collectionsData }
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
        break;

      case 'sync-error':
        showNotification('Sync Error: ' + msg.message, 'error');
        break;
    }
  });
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
function showNotification(message: string, type: 'error' | 'success' | 'info'): void {
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

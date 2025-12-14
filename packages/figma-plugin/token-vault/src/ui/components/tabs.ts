/**
 * Tab Navigation Component
 * Manages tab switching logic and state synchronization
 */

import type { AppState } from '../state';
import { getState, setState } from '../state';
import { sendMessage } from '../message-bridge';
import { resetSyncSuccessScreen } from './success-screen.js';

export type TabType = 'import' | 'export' | 'sync';

export interface TabOptions {
  onTabChange?: (tab: TabType) => void;
}

/**
 * Initialize tab navigation component
 * Handles tab switching, button states, and panel visibility
 */
export function initTabs(options: TabOptions = {}): void {
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.segmented-control button');
  const tabPanels = document.querySelectorAll<HTMLElement>('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab as TabType;
      if (tab) {
        switchTab(tab, options);
      }
    });
  });

  // Set initial tab state
  const state = getState();
  updateTabUI(state.currentTab, tabButtons, tabPanels);
}

/**
 * Switch to a different tab
 * Updates UI state, triggers callbacks, and loads tab-specific data
 */
export function switchTab(tab: TabType, options: TabOptions = {}): void {
  setState({ currentTab: tab });

  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.segmented-control button');
  const tabPanels = document.querySelectorAll<HTMLElement>('.tab-panel');

  updateTabUI(tab, tabButtons, tabPanels);

  // Reset sync success screen if switching away from sync tab
  if (tab !== 'sync') {
    resetSyncSuccessScreen();
  }

  // Update action button state
  updateActionButton();

  // Load collections for export/sync tabs
  if (tab === 'export' || tab === 'sync') {
    sendMessage({ type: 'get-collections' });
  }

  // Load last sync info for sync tab
  if (tab === 'sync') {
    sendMessage({ type: 'get-last-sync' });
  }

  // Trigger callback
  options.onTabChange?.(tab);
}

/**
 * Update tab button and panel visibility
 */
function updateTabUI(
  tab: TabType,
  tabButtons: NodeListOf<HTMLButtonElement>,
  tabPanels: NodeListOf<HTMLElement>
): void {
  tabButtons.forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tab}`);
  });
}

/**
 * Update action button text and state based on current tab
 */
export function updateActionButton(): void {
  const state = getState();
  const actionBtn = document.getElementById('actionBtn') as HTMLButtonElement | null;

  if (!actionBtn) return;

  switch (state.currentTab) {
    case 'import':
      actionBtn.textContent = 'Import to Figma';
      const hasFiles = state.files.size > 0;

      // Check if using flexible import (new system)
      if (state.structureConfig && state.structureConfig.levels.length > 0) {
        // Flexible import: enable if structure is configured
        actionBtn.disabled = !hasFiles;
      } else {
        // Legacy import: enable if collections are configured
        const hasCollections = state.collections.length > 0;
        const allCollectionsHaveFiles = state.collections.every(c => c.fileNames.length > 0);
        actionBtn.disabled = !(hasFiles && hasCollections && allCollectionsHaveFiles);
      }
      break;

    case 'export':
      actionBtn.textContent = 'Export JSON';
      actionBtn.disabled = state.selectedExportCollections.size === 0;
      break;

    case 'sync':
      actionBtn.textContent = 'Sync to Node';
      actionBtn.disabled = state.selectedSyncCollections.size === 0;
      break;
  }
}

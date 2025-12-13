/**
 * Collection List Component
 * Renders collection lists for export and sync tabs with selection management
 */

import { getState, setState } from '../state';
import { updateActionButton } from './tabs';

export interface FigmaCollection {
  id: string;
  name: string;
  variableCount: number;
  modeCount: number;
}

export interface CollectionListOptions {
  onSelectionChanged?: (selectedIds: Set<string>) => void;
}

/**
 * Initialize collection list components for export and sync tabs
 */
export function initCollectionLists(options: CollectionListOptions = {}): void {
  // Export tab select all/none
  const exportSelectAll = document.getElementById('exportSelectAll');
  const exportSelectNone = document.getElementById('exportSelectNone');

  exportSelectAll?.addEventListener('click', () => {
    selectAllExportCollections();
    options.onSelectionChanged?.(getState().selectedExportCollections);
  });

  exportSelectNone?.addEventListener('click', () => {
    selectNoneExportCollections();
    options.onSelectionChanged?.(getState().selectedExportCollections);
  });

  // Sync tab select all/none
  const syncSelectAll = document.getElementById('syncSelectAll');
  const syncSelectNone = document.getElementById('syncSelectNone');

  syncSelectAll?.addEventListener('click', () => {
    selectAllSyncCollections();
    options.onSelectionChanged?.(getState().selectedSyncCollections);
  });

  syncSelectNone?.addEventListener('click', () => {
    selectNoneSyncCollections();
    options.onSelectionChanged?.(getState().selectedSyncCollections);
  });
}

/**
 * Render collection list for export tab
 */
export function renderExportCollections(options: CollectionListOptions = {}): void {
  const container = document.getElementById('exportCollectionList');
  if (!container) return;

  const state = getState();

  if (state.figmaCollections.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div>No variable collections found</div>
      </div>
    `;
    return;
  }

  container.innerHTML = state.figmaCollections
    .map(col => createCollectionListItem(col, state.selectedExportCollections.has(col.id)))
    .join('');

  // Attach checkbox event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const collectionId = target.dataset.id;

      if (!collectionId) return;

      if (target.checked) {
        state.selectedExportCollections.add(collectionId);
      } else {
        state.selectedExportCollections.delete(collectionId);
      }

      setState({ selectedExportCollections: state.selectedExportCollections });
      updateActionButton();
      options.onSelectionChanged?.(state.selectedExportCollections);
    });
  });
}

/**
 * Render collection list for sync tab
 */
export function renderSyncCollections(options: CollectionListOptions = {}): void {
  const container = document.getElementById('syncCollectionList');
  if (!container) return;

  const state = getState();

  if (state.figmaCollections.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div>No variable collections found</div>
      </div>
    `;
    return;
  }

  container.innerHTML = state.figmaCollections
    .map(col => createCollectionListItem(col, state.selectedSyncCollections.has(col.id)))
    .join('');

  // Attach checkbox event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const collectionId = target.dataset.id;

      if (!collectionId) return;

      if (target.checked) {
        state.selectedSyncCollections.add(collectionId);
      } else {
        state.selectedSyncCollections.delete(collectionId);
      }

      setState({ selectedSyncCollections: state.selectedSyncCollections });
      updateActionButton();
      options.onSelectionChanged?.(state.selectedSyncCollections);
    });
  });
}

/**
 * Create HTML for a collection list item
 */
function createCollectionListItem(collection: FigmaCollection, isChecked: boolean): string {
  const modeText = collection.modeCount !== 1 ? 's' : '';

  return `
    <label class="collection-list-item">
      <input
        type="checkbox"
        data-id="${escapeHtml(collection.id)}"
        ${isChecked ? 'checked' : ''}
        aria-label="Select ${escapeHtml(collection.name)}"
      >
      <div class="collection-info">
        <div class="collection-name">${escapeHtml(collection.name)}</div>
        <div class="collection-meta">${collection.variableCount.toLocaleString()} variables · ${collection.modeCount} mode${modeText}</div>
      </div>
    </label>
  `;
}

/**
 * Select all collections in export tab
 */
function selectAllExportCollections(): void {
  const state = getState();
  state.figmaCollections.forEach(col => state.selectedExportCollections.add(col.id));
  setState({ selectedExportCollections: state.selectedExportCollections });
  renderExportCollections();
  updateActionButton();
}

/**
 * Deselect all collections in export tab
 */
function selectNoneExportCollections(): void {
  const state = getState();
  state.selectedExportCollections.clear();
  setState({ selectedExportCollections: state.selectedExportCollections });
  renderExportCollections();
  updateActionButton();
}

/**
 * Select all collections in sync tab
 */
function selectAllSyncCollections(): void {
  const state = getState();
  state.figmaCollections.forEach(col => state.selectedSyncCollections.add(col.id));
  setState({ selectedSyncCollections: state.selectedSyncCollections });
  renderSyncCollections();
  updateActionButton();
}

/**
 * Deselect all collections in sync tab
 */
function selectNoneSyncCollections(): void {
  const state = getState();
  state.selectedSyncCollections.clear();
  setState({ selectedSyncCollections: state.selectedSyncCollections });
  renderSyncCollections();
  updateActionButton();
}

/**
 * Simple HTML escape to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

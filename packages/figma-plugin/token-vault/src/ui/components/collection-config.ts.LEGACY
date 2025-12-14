/**
 * Collection Configuration Component
 * Manages collection creation, mode setup, and file assignment
 */

import { getState, setState } from '../state';
import { updateActionButton } from './tabs';

export interface Collection {
  name: string;
  isModeCollection: boolean;
  fileNames: string[];
}

export interface CollectionConfigOptions {
  onCollectionsChanged?: (collections: Collection[]) => void;
}

/**
 * Initialize collection configuration component
 */
export function initCollectionConfig(options: CollectionConfigOptions = {}): void {
  const addBtn = document.getElementById('addCollection');

  if (!addBtn) {
    console.error('Collection config: Add button not found');
    return;
  }

  addBtn.addEventListener('click', () => addCollection(options));

  // Listen for re-render events
  document.addEventListener('render-collections', () => {
    renderCollections(options);
  });

  // Initial render
  renderCollections(options);
}

/**
 * Add a new collection to the configuration
 */
export function addCollection(options: CollectionConfigOptions = {}): void {
  const state = getState();

  const newCollection: Collection = {
    name: `Collection ${state.collections.length + 1}`,
    isModeCollection: false,
    fileNames: []
  };

  state.collections.push(newCollection);
  setState({ collections: state.collections });

  renderCollections(options);
  options.onCollectionsChanged?.(state.collections);
}

/**
 * Render the collection configuration list
 */
export function renderCollections(options: CollectionConfigOptions = {}): void {
  const collectionsList = document.getElementById('collectionsList');
  if (!collectionsList) return;

  const state = getState();
  collectionsList.innerHTML = '';

  // Show empty state if no collections but files exist
  if (state.collections.length === 0 && state.files.size > 0) {
    const hint = document.createElement('div');
    hint.className = 'empty-state';
    hint.innerHTML = `
      <div class="empty-state-icon">📦</div>
      <div>Add a collection to organize your tokens</div>
    `;
    collectionsList.appendChild(hint);
    return;
  }

  // Render each collection
  state.collections.forEach((collection, index) => {
    const div = document.createElement('div');
    div.className = 'collection-config';

    const filesCheckboxes = generateFileCheckboxes(state.files, collection, index);

    div.innerHTML = `
      <div class="collection-header">
        <input
          type="text"
          value="${escapeHtml(collection.name)}"
          data-collection="${index}"
          class="collection-name"
          placeholder="Collection name"
          aria-label="Collection name"
        >
        <button
          class="button button-ghost"
          data-remove="${index}"
          aria-label="Remove collection"
        >✕</button>
      </div>
      <label class="checkbox-container">
        <input
          type="checkbox"
          class="mode-checkbox"
          data-collection="${index}"
          ${collection.isModeCollection ? 'checked' : ''}
        >
        <span class="checkbox-label">Each file is a separate mode</span>
      </label>
      <div class="checkbox-sublabel">When enabled, each selected file becomes a mode in this collection</div>
      <div class="file-assignment">
        <div class="file-assignment-title">Assign Files</div>
        ${filesCheckboxes || '<div style="color: var(--figma-color-text-tertiary)">Upload files first</div>'}
      </div>
    `;

    collectionsList.appendChild(div);

    // Attach event listeners
    attachCollectionEventListeners(div, index, options);
  });

  updateActionButton();
}

/**
 * Generate file assignment checkboxes for a collection
 */
function generateFileCheckboxes(
  files: Map<string, unknown>,
  collection: Collection,
  collectionIndex: number
): string {
  if (files.size === 0) return '';

  return Array.from(files.keys())
    .map(fileName => `
      <label class="checkbox-container">
        <input
          type="checkbox"
          data-collection="${collectionIndex}"
          data-file="${escapeHtml(fileName)}"
          ${collection.fileNames.includes(fileName) ? 'checked' : ''}
        >
        <span class="checkbox-label">${escapeHtml(fileName)}</span>
      </label>
    `)
    .join('');
}

/**
 * Attach event listeners to a collection element
 */
function attachCollectionEventListeners(
  element: HTMLElement,
  index: number,
  options: CollectionConfigOptions
): void {
  const state = getState();

  // Collection name input
  const nameInput = element.querySelector('.collection-name') as HTMLInputElement;
  nameInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    state.collections[index].name = target.value;
    setState({ collections: state.collections });
    updateActionButton();
    options.onCollectionsChanged?.(state.collections);
  });

  // Mode checkbox
  const modeCheckbox = element.querySelector('.mode-checkbox') as HTMLInputElement;
  modeCheckbox?.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    state.collections[index].isModeCollection = target.checked;
    setState({ collections: state.collections });
    options.onCollectionsChanged?.(state.collections);
  });

  // File assignment checkboxes
  element.querySelectorAll('input[data-file]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const fileName = target.dataset.file;
      const collectionIndex = parseInt(target.dataset.collection || '0', 10);

      if (!fileName) return;

      if (target.checked) {
        if (!state.collections[collectionIndex].fileNames.includes(fileName)) {
          state.collections[collectionIndex].fileNames.push(fileName);
        }
      } else {
        state.collections[collectionIndex].fileNames =
          state.collections[collectionIndex].fileNames.filter(n => n !== fileName);
      }

      setState({ collections: state.collections });
      updateActionButton();
      options.onCollectionsChanged?.(state.collections);
    });
  });

  // Remove collection button
  const removeBtn = element.querySelector('[data-remove]') as HTMLButtonElement;
  removeBtn?.addEventListener('click', () => {
    removeCollection(index, options);
  });
}

/**
 * Remove a collection from the configuration
 */
function removeCollection(index: number, options: CollectionConfigOptions): void {
  const state = getState();
  state.collections.splice(index, 1);
  setState({ collections: state.collections });

  renderCollections(options);
  updateActionButton();
  options.onCollectionsChanged?.(state.collections);
}

/**
 * Simple HTML escape to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

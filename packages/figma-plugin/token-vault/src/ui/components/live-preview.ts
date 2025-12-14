/**
 * Live Preview Component
 *
 * Displays a tree view of the Figma structure that will be created
 * from the imported tokens. Updates live when the user changes
 * the level configuration.
 *
 * Shows:
 * - Collections with icon
 * - Modes within each collection with icon
 * - Variable counts and samples
 * - Summary counts (total collections, modes, variables)
 * - Warnings for default modes
 */

import type { PreviewStructure, PreviewCollection, PreviewMode } from '../../types/message.types.js';

/**
 * Container element for the preview
 */
let previewContainer: HTMLElement | null = null;

/**
 * Render the live preview of the import structure
 *
 * Creates an expandable tree view showing what will be created in Figma.
 * Each collection and mode can be expanded/collapsed to view details.
 *
 * @param preview - Preview structure to render
 *
 * @example
 * ```ts
 * renderLivePreview({
 *   collections: [
 *     {
 *       name: 'semantic',
 *       modes: [
 *         { name: 'light', variableCount: 8, sampleVariables: ['bg/primary', 'bg/secondary'] },
 *         { name: 'dark', variableCount: 8, sampleVariables: ['bg/primary', 'bg/secondary'] }
 *       ]
 *     }
 *   ],
 *   totalCollections: 1,
 *   totalModes: 2,
 *   totalVariables: 16
 * });
 * ```
 */
export function renderLivePreview(preview: PreviewStructure): void {
  // Get or create preview container
  if (!previewContainer) {
    previewContainer = document.getElementById('live-preview');
    if (!previewContainer) {
      console.error('Preview container element not found');
      return;
    }
  }

  // Clear previous content
  previewContainer.innerHTML = '';

  // Show container
  previewContainer.style.display = 'block';

  // Create header
  const header = document.createElement('div');
  header.className = 'preview-header';
  header.innerHTML = `
    <h3>Preview</h3>
    <p class="preview-description">Based on your selections above:</p>
  `;
  previewContainer.appendChild(header);

  // Create tree container
  const tree = document.createElement('div');
  tree.className = 'preview-tree';

  // Render each collection
  for (const collection of preview.collections) {
    const collectionEl = renderCollection(collection);
    tree.appendChild(collectionEl);
  }

  previewContainer.appendChild(tree);

  // Create summary
  const summary = document.createElement('div');
  summary.className = 'preview-summary';
  summary.innerHTML = `
    <div class="summary-line"></div>
    <div class="summary-counts">
      <span>Total: ${preview.totalCollections} collection${preview.totalCollections !== 1 ? 's' : ''}, ${preview.totalModes} mode${preview.totalModes !== 1 ? 's' : ''}, ${preview.totalVariables} variable${preview.totalVariables !== 1 ? 's' : ''}</span>
    </div>
  `;
  previewContainer.appendChild(summary);
}

/**
 * Render a single collection in the tree
 */
function renderCollection(collection: PreviewCollection): HTMLElement {
  const collectionEl = document.createElement('div');
  collectionEl.className = 'preview-collection';

  // Collection header (expandable)
  const header = document.createElement('div');
  header.className = 'collection-header';
  header.innerHTML = `
    <span class="expand-icon">▼</span>
    <span class="collection-icon">📦</span>
    <span class="collection-name">${escapeHtml(collection.name)}</span>
    <span class="collection-count">(Collection)</span>
  `;

  // Modes container
  const modesContainer = document.createElement('div');
  modesContainer.className = 'modes-container';

  // Render each mode
  for (const mode of collection.modes) {
    const modeEl = renderMode(mode);
    modesContainer.appendChild(modeEl);
  }

  // Toggle expand/collapse
  let isExpanded = true;
  header.addEventListener('click', () => {
    isExpanded = !isExpanded;
    modesContainer.style.display = isExpanded ? 'block' : 'none';
    const icon = header.querySelector('.expand-icon');
    if (icon) {
      icon.textContent = isExpanded ? '▼' : '▶';
    }
  });

  collectionEl.appendChild(header);
  collectionEl.appendChild(modesContainer);

  return collectionEl;
}

/**
 * Render a single mode in the tree
 */
function renderMode(mode: PreviewMode): HTMLElement {
  const modeEl = document.createElement('div');
  modeEl.className = 'preview-mode';

  // Check if this is a default mode (created automatically)
  const isDefaultMode = mode.name === 'Mode 1';

  // Mode header
  const header = document.createElement('div');
  header.className = 'mode-header';

  // Choose icon based on mode name
  let modeIcon = '🎨'; // Default
  if (mode.name.toLowerCase().includes('mobile')) {
    modeIcon = '📱';
  } else if (mode.name.toLowerCase().includes('desktop') || mode.name.toLowerCase().includes('web')) {
    modeIcon = '🖥';
  } else if (isDefaultMode) {
    modeIcon = '⚙️';
  }

  header.innerHTML = `
    <span class="mode-indent">├─</span>
    <span class="mode-icon">${modeIcon}</span>
    <span class="mode-name">${escapeHtml(mode.name)}</span>
    ${isDefaultMode ? '<span class="default-badge">default mode</span>' : ''}
  `;

  modeEl.appendChild(header);

  // Variables section
  const varsEl = document.createElement('div');
  varsEl.className = 'mode-variables';

  if (mode.sampleVariables.length > 0) {
    const samplesText = mode.sampleVariables.map((v: string) => escapeHtml(v)).join(', ');
    const hasMore = mode.variableCount > mode.sampleVariables.length;
    const moreText = hasMore ? '...' : '';

    varsEl.innerHTML = `
      <span class="var-indent">│   └─</span>
      <span class="var-samples">${samplesText}${moreText}</span>
      <div class="var-count">${mode.variableCount} variable${mode.variableCount !== 1 ? 's' : ''}</div>
    `;
  } else {
    varsEl.innerHTML = `
      <span class="var-indent">│   └─</span>
      <span class="var-count">${mode.variableCount} variable${mode.variableCount !== 1 ? 's' : ''}</span>
    `;
  }

  modeEl.appendChild(varsEl);

  return modeEl;
}

/**
 * Hide the live preview
 *
 * Called when there's no valid configuration to preview.
 */
export function hideLivePreview(): void {
  if (previewContainer) {
    previewContainer.style.display = 'none';
    previewContainer.innerHTML = '';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

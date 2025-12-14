/**
 * Structure Preview UI Component
 *
 * Displays JSON structure as a tree with collapsible levels.
 * Shows depth, keys at each level, and sample values.
 * NO role assignment - this is read-only visualization only.
 */

import { sendMessage } from '../message-bridge.js';
import type { AnalyzedStructure, AnalyzedLevel } from '../../backend/utils/structure-analyzer.js';

/**
 * State for collapsed levels
 */
const collapsedLevels = new Set<number>();

/**
 * Render structure preview component
 *
 * Displays the analyzed JSON structure in a tree view format.
 * Each level can be expanded/collapsed to show keys and sample values.
 *
 * @param fileName - Name of the file being analyzed
 * @param data - Parsed JSON data
 */
export function renderStructurePreview(fileName: string, data: unknown): void {
  // Request structure analysis from backend
  console.log('[StructurePreview] renderStructurePreview - sending analyze-structure for:', fileName);
  sendMessage({
    type: 'analyze-structure',
    fileName,
    jsonData: data,
  });
}

/**
 * Display analyzed structure in UI
 *
 * Called after receiving structure-analyzed message from backend.
 *
 * @param fileName - Name of the file
 * @param structure - Analyzed structure from backend
 */
export function displayAnalyzedStructure(fileName: string, structure: AnalyzedStructure): void {
  const container = document.getElementById('structurePreviewSection');
  if (!container) return;

  container.style.display = 'block';
  container.innerHTML = renderStructurePreviewHTML(fileName, structure);

  // Attach event listeners for collapsible levels
  attachStructureEventListeners(structure);
}

/**
 * Hide structure preview
 */
export function hideStructurePreview(): void {
  const container = document.getElementById('structurePreviewSection');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
  collapsedLevels.clear();
}

/**
 * Render structure preview HTML
 */
function renderStructurePreviewHTML(fileName: string, structure: AnalyzedStructure): string {
  return `
    <div class="structure-preview">
      <div class="structure-header">
        <h3>JSON Structure Preview</h3>
        <div class="structure-meta">
          File: <strong>${escapeHtml(fileName)}</strong> •
          ${structure.maxDepth} level${structure.maxDepth !== 1 ? 's' : ''} deep •
          ${structure.hasTokenValues ? 'Contains Design Tokens format' : 'Standard JSON'}
        </div>
      </div>

      <div class="structure-tree">
        ${structure.levels.map((level) => renderLevel(level)).join('')}
      </div>

      <div class="structure-footer">
        <div class="info-text">
          <strong>Next step:</strong> Configure how each level maps to Figma collections and modes.
        </div>
      </div>
    </div>
  `;
}

/**
 * Render a single level in the tree
 */
function renderLevel(level: AnalyzedLevel): string {
  const isCollapsed = collapsedLevels.has(level.depth);
  const hasMultipleKeys = level.keyCount > 5;

  return `
    <div class="structure-level" data-depth="${level.depth}">
      <div class="level-header" data-level="${level.depth}">
        <span class="level-toggle ${isCollapsed ? 'collapsed' : 'expanded'}">
          ${isCollapsed ? '▶' : '▼'}
        </span>
        <span class="level-label">Level ${level.depth}</span>
        <span class="level-count">${level.keyCount} key${level.keyCount !== 1 ? 's' : ''}</span>
      </div>

      <div class="level-content ${isCollapsed ? 'hidden' : ''}">
        <div class="level-keys">
          ${renderKeys(level.keys, hasMultipleKeys)}
        </div>

        ${level.sampleValues.length > 0 ? `
          <div class="level-samples">
            <div class="samples-label">Sample values:</div>
            ${level.sampleValues.map((sample) => renderSample(sample)).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render keys for a level
 */
function renderKeys(keys: string[], hasMany: boolean): string {
  const displayKeys = hasMany ? keys.slice(0, 5) : keys;
  const remaining = keys.length - displayKeys.length;

  const keyBadges = displayKeys
    .map((key) => `<span class="key-badge">${escapeHtml(key)}</span>`)
    .join('');

  const remainingBadge = remaining > 0
    ? `<span class="key-badge more">+${remaining} more</span>`
    : '';

  return keyBadges + remainingBadge;
}

/**
 * Render a sample value
 */
function renderSample(sample: any): string {
  const valueDisplay = formatValueDisplay(sample.value, sample.type);

  return `
    <div class="sample-item">
      <span class="sample-path">${escapeHtml(sample.path)}</span>
      <span class="sample-separator">→</span>
      <span class="sample-value ${sample.type}">${escapeHtml(String(valueDisplay))}</span>
    </div>
  `;
}

/**
 * Format value for display
 */
function formatValueDisplay(value: unknown, type: string): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (type === 'string') {
    // Truncate long strings
    const str = String(value);
    return str.length > 30 ? `"${str.substring(0, 30)}..."` : `"${str}"`;
  }

  if (type === 'number' || type === 'boolean') {
    return String(value);
  }

  // Object/array previews
  return String(value);
}

/**
 * Attach event listeners for interactive elements
 */
function attachStructureEventListeners(structure: AnalyzedStructure): void {
  // Toggle level collapse/expand
  structure.levels.forEach((level) => {
    const header = document.querySelector(`.level-header[data-level="${level.depth}"]`);
    if (header) {
      header.addEventListener('click', () => {
        toggleLevel(level.depth);
      });
    }
  });
}

/**
 * Toggle level expanded/collapsed state
 */
function toggleLevel(depth: number): void {
  const isCollapsed = collapsedLevels.has(depth);

  if (isCollapsed) {
    collapsedLevels.delete(depth);
  } else {
    collapsedLevels.add(depth);
  }

  // Update UI
  const levelElement = document.querySelector(`.structure-level[data-depth="${depth}"]`);
  if (!levelElement) return;

  const toggle = levelElement.querySelector('.level-toggle');
  const content = levelElement.querySelector('.level-content');

  if (toggle && content) {
    if (isCollapsed) {
      toggle.classList.remove('collapsed');
      toggle.classList.add('expanded');
      toggle.textContent = '▼';
      content.classList.remove('hidden');
    } else {
      toggle.classList.remove('expanded');
      toggle.classList.add('collapsed');
      toggle.textContent = '▶';
      content.classList.add('hidden');
    }
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

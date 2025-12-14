/**
 * File Grouping Component
 * Multi-file import: drag-and-drop file organization into collection groups
 */

import type { FileGroup } from '../../types/level-config.types.js';
import { getState, setFileGroups } from '../state.js';
import { sendMessage } from '../message-bridge.js';
import {
  suggestFileGroups,
  moveFileToGroup,
  removeEmptyGroups,
  createNewGroup,
  updateGroupName,
  updateGroupModeStrategy,
  updateModeName,
} from '../utils/file-grouping-helpers.js';

let currentDraggedFile: string | null = null;
let uiReadyTimestamp: number = 0;

// Store analyzed first-level keys per file
const analyzedFirstLevelKeys: Map<string, string[]> = new Map();

/**
 * Initialize and render file grouping component
 * Only shown when multiple files are uploaded
 */
export function renderFileGrouping(): void {
  const container = document.getElementById('fileGroupingContainer');
  if (!container) {
    console.error('[FileGrouping] Container element not found');
    return;
  }

  const state = getState();

  // Only show for multiple files
  if (state.files.size < 2) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // Auto-suggest groups if not already set
  if (!state.fileGroups || state.fileGroups.length === 0) {
    const suggestedGroups = suggestFileGroups(state.files);
    setFileGroups(suggestedGroups);
  }

  // Set timestamp to block auto-triggers for first 500ms
  uiReadyTimestamp = Date.now();
  console.log('[FileGrouping] UI ready at:', uiReadyTimestamp);

  // Render the UI
  renderGroupingUI(container);
}

/**
 * Hide file grouping component
 */
export function hideFileGrouping(): void {
  const container = document.getElementById('fileGroupingContainer');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * Render the file grouping UI
 */
function renderGroupingUI(container: HTMLElement): void {
  const state = getState();
  const groups = state.fileGroups || [];

  container.innerHTML = `
    <div class="file-grouping">
      <div class="section-title">2. Configure Collections</div>
      <div class="section-description">
        Organize files into collections and configure how modes are handled.
      </div>

      <div class="groups-container" id="groupsContainer">
        ${groups.map((group) => renderGroupCard(group)).join('')}
      </div>

      <button class="button-add" id="createGroupBtn">
        + Create New Collection
      </button>

      <div class="grouping-actions">
        <button class="button button-primary button-full" id="importAllBtn">
          Import All Collections
        </button>
      </div>
    </div>
  `;

  // Analyze first-level keys for all files
  analyzeAllFilesFirstLevel();

  // Attach event listeners
  attachGroupingEventListeners();
}

/**
 * Render a single group card
 */
function renderGroupCard(group: FileGroup): string {
  const state = getState();
  const isSingleFile = group.fileNames.length === 1;

  return `
    <div class="group-card" data-group-id="${escapeHtml(group.id)}">
      <div class="group-header">
        <div class="group-icon">📦</div>
        <input
          type="text"
          class="group-name-input"
          value="${escapeHtml(group.collectionName)}"
          data-group-id="${escapeHtml(group.id)}"
          placeholder="Collection name"
        />
      </div>

      <div class="group-files" data-group-id="${escapeHtml(group.id)}">
        ${group.fileNames.map((fileName) => renderFileCard(fileName, group.id)).join('')}
      </div>

      ${isSingleFile ? renderSingleFileModeOptions(group) : renderMultiFileModeOptions(group)}
    </div>
  `;
}

/**
 * Render a draggable file card
 */
function renderFileCard(fileName: string, groupId: string): string {
  const state = getState();
  const file = state.files.get(fileName);

  if (!file) {
    return '';
  }

  return `
    <div
      class="file-card"
      draggable="true"
      data-file-name="${escapeHtml(fileName)}"
      data-group-id="${escapeHtml(groupId)}"
    >
      <div class="file-card-icon">📄</div>
      <div class="file-card-info">
        <div class="file-card-name">${escapeHtml(fileName)}.json</div>
        <div class="file-card-size">${formatFileSize(file.size)}</div>
      </div>
      <div class="file-card-drag-handle">⋮⋮</div>
    </div>
  `;
}

/**
 * Render mode options for single-file groups
 * Options: "First level represents modes" vs "No modes (default mode)"
 */
function renderSingleFileModeOptions(group: FileGroup): string {
  const fileName = group.fileNames[0];
  const firstLevelKeys = analyzedFirstLevelKeys.get(fileName) || [];
  const isPerFile = group.modeStrategy === 'per-file';
  
  // Display first level keys preview
  const keysPreview = firstLevelKeys.length > 0 
    ? firstLevelKeys.slice(0, 5).join(', ') + (firstLevelKeys.length > 5 ? '...' : '')
    : 'Analyzing...';

  return `
    <div class="mode-options">
      <div class="mode-options-title">How should modes be determined?</div>

      <label class="mode-option ${isPerFile ? 'selected' : ''}">
        <input
          type="radio"
          name="mode-strategy-${escapeHtml(group.id)}"
          value="per-file"
          data-group-id="${escapeHtml(group.id)}"
          ${isPerFile ? 'checked' : ''}
        />
        <span class="radio-indicator"></span>
        <div class="mode-option-content">
          <div class="mode-option-label">Modes: First level represents modes</div>
          <div class="mode-option-description">Keys: ${escapeHtml(keysPreview)}</div>
        </div>
      </label>

      <label class="mode-option ${!isPerFile ? 'selected' : ''}">
        <input
          type="radio"
          name="mode-strategy-${escapeHtml(group.id)}"
          value="merged"
          data-group-id="${escapeHtml(group.id)}"
          ${!isPerFile ? 'checked' : ''}
        />
        <span class="radio-indicator"></span>
        <div class="mode-option-content">
          <div class="mode-option-label">No modes: File has one default mode</div>
          <div class="mode-option-description">All tokens imported into "Mode 1"</div>
        </div>
      </label>
    </div>
  `;
}

/**
 * Render mode options for multi-file groups
 * Options: "Each file = 1 mode" vs "Merge all files"
 */
function renderMultiFileModeOptions(group: FileGroup): string {
  const isPerFile = group.modeStrategy === 'per-file';

  return `
    <div class="mode-options">
      <div class="mode-options-title">How should these files be combined?</div>

      <label class="mode-option ${isPerFile ? 'selected' : ''}">
        <input
          type="radio"
          name="mode-strategy-${escapeHtml(group.id)}"
          value="per-file"
          data-group-id="${escapeHtml(group.id)}"
          ${isPerFile ? 'checked' : ''}
        />
        <span class="radio-indicator"></span>
        <div class="mode-option-content">
          <div class="mode-option-label">Each file = 1 mode</div>
          <div class="mode-option-description">Creates ${group.fileNames.length} modes in this collection</div>
        </div>
      </label>

      ${isPerFile ? renderModeNamesList(group) : ''}

      <label class="mode-option ${!isPerFile ? 'selected' : ''}">
        <input
          type="radio"
          name="mode-strategy-${escapeHtml(group.id)}"
          value="merged"
          data-group-id="${escapeHtml(group.id)}"
          ${!isPerFile ? 'checked' : ''}
        />
        <span class="radio-indicator"></span>
        <div class="mode-option-content">
          <div class="mode-option-label">Merge into 1 mode</div>
          <div class="mode-option-description">All tokens combined into "Mode 1"</div>
        </div>
      </label>
    </div>
  `;
}

/**
 * Render editable mode names list
 */
function renderModeNamesList(group: FileGroup): string {
  const modeNames = group.modeNames || {};

  return `
    <div class="mode-names-list">
      <div class="mode-names-label">Mode names (editable):</div>
      ${group.fileNames
        .map((fileName) => {
          // Support both Record<string, string> and Map<string, string>
          const modeName = typeof modeNames === 'object' && !('get' in modeNames)
            ? (modeNames as Record<string, string>)[fileName] || extractModeNameFromFilename(fileName)
            : fileName;
          return `
            <div class="mode-name-item">
              <span class="mode-name-file">${escapeHtml(fileName)}.json</span>
              <span class="mode-name-arrow">→</span>
              <input
                type="text"
                class="mode-name-input"
                value="${escapeHtml(modeName)}"
                data-group-id="${escapeHtml(group.id)}"
                data-file-name="${escapeHtml(fileName)}"
                placeholder="Mode name"
              />
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

/**
 * Extract mode name from filename (e.g., "semantic-light" -> "light")
 */
function extractModeNameFromFilename(fileName: string): string {
  const parts = fileName.split('-');
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return fileName;
}

/**
 * Attach all event listeners for grouping interactions
 */
function attachGroupingEventListeners(): void {
  console.log('[FileGrouping] attachGroupingEventListeners called');
  console.trace('[FileGrouping] Trace:');

  // Group name changes
  document.querySelectorAll('.group-name-input').forEach((input) => {
    input.addEventListener('change', handleGroupNameChange);
  });

  // Mode strategy changes
  document.querySelectorAll('input[type="radio"][name^="mode-strategy"]').forEach((radio) => {
    radio.addEventListener('change', handleModeStrategyChange);
  });

  // Mode name changes
  document.querySelectorAll('.mode-name-input').forEach((input) => {
    input.addEventListener('change', handleModeNameChange);
  });

  // Drag and drop for file cards
  document.querySelectorAll('.file-card').forEach((card) => {
    card.addEventListener('dragstart', handleDragStart as EventListener);
    card.addEventListener('dragend', handleDragEnd as EventListener);
  });

  // Drop zones (group containers)
  document.querySelectorAll('.group-files').forEach((zone) => {
    zone.addEventListener('dragover', handleDragOver as EventListener);
    zone.addEventListener('dragleave', handleDragLeave as EventListener);
    zone.addEventListener('drop', handleDrop as EventListener);
  });

  // Create new group button
  const createBtn = document.getElementById('createGroupBtn');
  createBtn?.addEventListener('click', handleCreateNewGroup);

  // Import button (was nextStepBtn)
  const importBtn = document.getElementById('importAllBtn');
  console.log('[FileGrouping] Attaching click listener to importAllBtn:', importBtn);
  importBtn?.addEventListener('click', handleImportAll);
}

/**
 * Handle group name input change
 */
function handleGroupNameChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const groupId = input.dataset.groupId;
  const newName = input.value.trim();

  if (!groupId || !newName) return;

  const state = getState();
  const updatedGroups = updateGroupName(state.fileGroups || [], groupId, newName);
  setFileGroups(updatedGroups);
}

/**
 * Handle mode strategy radio change
 */
function handleModeStrategyChange(event: Event): void {
  const radio = event.target as HTMLInputElement;
  const groupId = radio.dataset.groupId;
  const strategy = radio.value as 'per-file' | 'merged';

  if (!groupId) return;

  const state = getState();
  const updatedGroups = updateGroupModeStrategy(state.fileGroups || [], groupId, strategy);
  setFileGroups(updatedGroups);

  // Re-render to show/hide mode names
  renderFileGrouping();
}

/**
 * Handle mode name input change
 */
function handleModeNameChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const groupId = input.dataset.groupId;
  const fileName = input.dataset.fileName;
  const modeName = input.value.trim();

  if (!groupId || !fileName || !modeName) return;

  const state = getState();
  const updatedGroups = updateModeName(state.fileGroups || [], groupId, fileName, modeName);
  setFileGroups(updatedGroups);
}

/**
 * Handle drag start event
 */
function handleDragStart(event: DragEvent): void {
  const card = event.currentTarget as HTMLElement;
  const fileName = card.dataset.fileName;

  if (!fileName) return;

  currentDraggedFile = fileName;
  card.classList.add('dragging');

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', fileName);
  }
}

/**
 * Handle drag end event
 */
function handleDragEnd(event: DragEvent): void {
  const card = event.currentTarget as HTMLElement;
  card.classList.remove('dragging');
  currentDraggedFile = null;

  // Remove all drop zone highlights
  document.querySelectorAll('.group-files').forEach((zone) => {
    zone.classList.remove('drop-zone-active');
  });
}

/**
 * Handle drag over event (show drop zone)
 */
function handleDragOver(event: DragEvent): void {
  event.preventDefault();

  const zone = event.currentTarget as HTMLElement;
  const targetGroupId = zone.dataset.groupId;

  if (!targetGroupId || !currentDraggedFile) return;

  // Don't allow dropping on the same group
  const state = getState();
  const currentGroup = state.fileGroups?.find((g) => g.fileNames.includes(currentDraggedFile!));

  if (currentGroup?.id === targetGroupId) {
    return;
  }

  zone.classList.add('drop-zone-active');

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

/**
 * Handle drag leave event (hide drop zone)
 */
function handleDragLeave(event: DragEvent): void {
  const zone = event.currentTarget as HTMLElement;
  zone.classList.remove('drop-zone-active');
}

/**
 * Handle drop event (move file to group)
 */
function handleDrop(event: DragEvent): void {
  console.log('[FileGrouping] handleDrop called, event:', event, 'currentDraggedFile:', currentDraggedFile);

  event.preventDefault();

  const zone = event.currentTarget as HTMLElement;
  const targetGroupId = zone.dataset.groupId;

  zone.classList.remove('drop-zone-active');

  // GUARD: Only proceed if we actually have a file being dragged
  if (!targetGroupId || !currentDraggedFile) {
    console.warn('[FileGrouping] handleDrop called but no file is being dragged - IGNORING');
    return;
  }

  const state = getState();
  let updatedGroups = moveFileToGroup(state.fileGroups || [], currentDraggedFile, targetGroupId);

  // Remove empty groups
  updatedGroups = removeEmptyGroups(updatedGroups);

  setFileGroups(updatedGroups);

  // Re-render
  renderFileGrouping();
}

/**
 * Handle create new group button click
 */
function handleCreateNewGroup(): void {
  const state = getState();
  const newGroup = createNewGroup();
  const updatedGroups = [...(state.fileGroups || []), newGroup];

  setFileGroups(updatedGroups);
  renderFileGrouping();
}

/**
 * Analyze all files to get first-level keys (for single-file mode options)
 */
function analyzeAllFilesFirstLevel(): void {
  const state = getState();
  
  state.files.forEach((fileInfo, fileName) => {
    if (analyzedFirstLevelKeys.has(fileName)) return;
    
    try {
      const data = fileInfo.content;
      if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data).filter(k => !k.startsWith('$'));
        analyzedFirstLevelKeys.set(fileName, keys);
      }
    } catch (e) {
      console.error('[FileGrouping] Failed to analyze', fileName, e);
    }
  });
  
  // Re-render to show analyzed keys
  const container = document.getElementById('groupsContainer');
  if (container) {
    const groups = state.fileGroups || [];
    container.innerHTML = groups.map((group) => renderGroupCard(group)).join('');
    attachGroupingEventListeners();
  }
}

/**
 * Handle import all collections button click
 */
function handleImportAll(event?: Event): void {
  const timeSinceRender = Date.now() - uiReadyTimestamp;
  console.log('[FileGrouping] handleImportAll called, event:', event, 'timeSinceRender:', timeSinceRender + 'ms');

  // GUARD: Block events in first 500ms to prevent auto-triggers
  if (timeSinceRender < 500) {
    console.warn('[FileGrouping] handleImportAll called too soon after render (', timeSinceRender, 'ms) - BLOCKING AUTO-TRIGGER!');
    return;
  }

  // GUARD: Only proceed if this was triggered by an actual user click event
  if (!event || !(event instanceof MouseEvent)) {
    console.warn('[FileGrouping] handleImportAll called without user click - IGNORING!');
    return;
  }

  const state = getState();
  const groups = state.fileGroups || [];

  // Build level configurations for each group
  // For single-file with "per-file" (first level = modes), mark level 1 as mode
  // Otherwise, all levels are token-path with default mode
  const levelsByGroup: Record<string, { depth: number; role: 'collection' | 'mode' | 'token-path' }[]> = {};
  
  groups.forEach(group => {
    const isSingleFile = group.fileNames.length === 1;
    const firstLevelKeys = isSingleFile ? (analyzedFirstLevelKeys.get(group.fileNames[0]) || []) : [];
    
    if (isSingleFile && group.modeStrategy === 'per-file' && firstLevelKeys.length > 0) {
      // Single file with first level as modes
      levelsByGroup[group.id] = [
        { depth: 1, role: 'mode' },
        { depth: 2, role: 'token-path' }
      ];
    } else {
      // Default: all token-path (default mode created automatically)
      levelsByGroup[group.id] = [
        { depth: 1, role: 'token-path' }
      ];
    }
  });

  // Collect file data
  const filesData: Record<string, unknown> = {};
  groups.forEach(group => {
    group.fileNames.forEach(fileName => {
      const fileInfo = state.files.get(fileName);
      if (fileInfo) {
        filesData[fileName] = fileInfo.content;
      }
    });
  });

  console.log('[FileGrouping] Sending import with', Object.keys(filesData).length, 'files');
  console.log('[FileGrouping] Groups:', groups.map(g => ({
    name: g.collectionName,
    strategy: g.modeStrategy,
    files: g.fileNames.length
  })));

  // Send import request directly
  sendMessage({
    type: 'import-with-manual-config',
    config: {
      multiFile: {
        groups,
        levelsByGroup,
        filesData
      }
    }
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
